import { render, screen, fireEvent } from '@testing-library/react';
import { ClusterBadge } from '../ClusterBadge';
import type { ElementCluster } from '../VisualizationRendererProps';

function renderBadge(overrides: {
  cluster?: ElementCluster;
  matchedCount?: number;
  scale?: number;
  basePixelsPerViewBoxUnit?: number;
  onClick?: (cluster: ElementCluster) => void;
} = {}) {
  const cluster: ElementCluster = overrides.cluster ?? {
    center: { x: 50, y: 50 },
    elementIds: ['a', 'b', 'c'],
    count: 3,
  };

  return render(
    <svg>
      <ClusterBadge
        cluster={cluster}
        matchedCount={overrides.matchedCount ?? 1}
        scale={overrides.scale ?? 1}
        basePixelsPerViewBoxUnit={overrides.basePixelsPerViewBoxUnit ?? 1}
        onClick={overrides.onClick}
      />
    </svg>,
  );
}

describe('ClusterBadge', () => {
  it('renders the matched/total label', () => {
    renderBadge({ matchedCount: 2 });
    expect(screen.getByText('2/3')).toBeInTheDocument();
  });

  it('calls onClick with the cluster when clicked', () => {
    const onClick = jest.fn();
    const cluster: ElementCluster = {
      center: { x: 10, y: 20 },
      elementIds: ['x', 'y'],
      count: 2,
    };
    renderBadge({ cluster, onClick });

    fireEvent.click(screen.getByText('1/2'));
    expect(onClick).toHaveBeenCalledWith(cluster);
  });

  it('renders at the cluster center position', () => {
    const { container } = renderBadge();
    const circle = container.querySelector('circle');
    expect(circle).toHaveAttribute('cx', '50');
    expect(circle).toHaveAttribute('cy', '50');
  });

  it('scales badge size inversely with zoom', () => {
    const { container: c1 } = renderBadge({ scale: 1, basePixelsPerViewBoxUnit: 1 });
    const r1 = Number(c1.querySelector('circle')?.getAttribute('r'));

    const { container: c2 } = renderBadge({ scale: 2, basePixelsPerViewBoxUnit: 1 });
    const r2 = Number(c2.querySelector('circle')?.getAttribute('r'));

    // At 2x zoom the viewBox radius should be half as large
    expect(r2).toBeCloseTo(r1 / 2);
  });
});
