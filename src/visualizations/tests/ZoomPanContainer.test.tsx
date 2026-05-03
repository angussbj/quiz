import { render, screen } from '@testing-library/react';
import { ZoomPanContainer } from '../ZoomPanContainer';
import { useZoomPan } from '../ZoomPanContext';
import type { VisualizationElement } from '../VisualizationElement';

// react-zoom-pan-pinch relies on DOM measurement APIs unavailable in jsdom.
// Mock it to pass through children and provide the hooks.
jest.mock('react-zoom-pan-pinch', () => ({
  TransformWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TransformComponent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useControls: () => ({
    setTransform: jest.fn(),
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
    resetTransform: jest.fn(),
    centerView: jest.fn(),
    zoomToElement: jest.fn(),
  }),
  useTransformEffect: () => {},
}));

function element(id: string, x: number, y: number, size: number = 10): VisualizationElement {
  return {
    id,
    label: id,
    viewBoxCenter: { x, y },
    viewBoxBounds: { minX: x - size / 2, minY: y - size / 2, maxX: x + size / 2, maxY: y + size / 2 },
    interactive: true,
  };
}

function ContextReader() {
  const { scale, clusteredElementIds } = useZoomPan();
  return (
    <text data-testid="context">
      {JSON.stringify({ scale, clusteredIds: [...clusteredElementIds].sort() })}
    </text>
  );
}

describe('ZoomPanContainer', () => {
  it('renders children inside an SVG', () => {
    const elements = [element('a', 50, 50)];
    render(
      <ZoomPanContainer elements={elements}>
        <text data-testid="child">hello</text>
      </ZoomPanContainer>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByTestId('child').closest('svg')).toBeInTheDocument();
  });

  it('provides zoom pan context to children', () => {
    const elements = [element('a', 50, 50)];
    render(
      <ZoomPanContainer elements={elements}>
        <ContextReader />
      </ZoomPanContainer>,
    );
    const data = JSON.parse(screen.getByTestId('context').textContent ?? '{}');
    expect(data.scale).toBe(1);
    expect(data.clusteredIds).toEqual([]);
  });

  it('computes a viewBox that encompasses all elements', () => {
    const elements = [element('a', 0, 0), element('b', 100, 200)];
    const { container } = render(
      <ZoomPanContainer elements={elements}>
        <text>content</text>
      </ZoomPanContainer>,
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox');
    const viewBox = svg!.getAttribute('viewBox')!;
    const [x, y, w, h] = viewBox.split(' ').map(Number);
    // viewBox should extend beyond element bounds (with 5% padding)
    // Elements span x:[-5..105], y:[-5..205]
    expect(x).toBeLessThan(-5);
    expect(y).toBeLessThan(-5);
    expect(x + w).toBeGreaterThan(105);
    expect(y + h).toBeGreaterThan(205);
  });

  it('does not show Focus button without a sized container (jsdom has no ResizeObserver)', () => {
    // Focus button requires a non-zero container to compute viewport-relative size.
    // In jsdom, containerSize stays at {0,0}, so Focus never appears.
    const elements = [element('a', 50, 50), element('b', 100, 100)];
    render(
      <ZoomPanContainer elements={elements} putInView={['a']}>
        <text>content</text>
      </ZoomPanContainer>,
    );
    expect(screen.queryByText('Focus')).not.toBeInTheDocument();
  });

  it('does not show Focus button when putInView is empty', () => {
    const elements = [element('a', 50, 50)];
    render(
      <ZoomPanContainer elements={elements}>
        <text>content</text>
      </ZoomPanContainer>,
    );
    expect(screen.queryByText('Focus')).not.toBeInTheDocument();
  });

  it('excludes hidden elements from clusters', () => {
    // Three elements close enough to cluster at this scale; marking two hidden
    // should drop the cluster entirely (since the remaining one is a singleton).
    const elements = [element('a', 0, 0), element('b', 1, 0), element('c', 2, 0)];
    render(
      <ZoomPanContainer
        elements={elements}
        elementStates={{ a: 'hidden', b: 'hidden' }}
        clustering={{ minScreenPixelDistance: 100, countedState: 'correct' }}
      >
        <ContextReader />
      </ZoomPanContainer>,
    );
    const data = JSON.parse(screen.getByTestId('context').textContent ?? '{}');
    expect(data.clusteredIds).toEqual([]);
  });

  it('clusters non-hidden elements while ignoring hidden ones', () => {
    const elements = [element('a', 0, 0), element('b', 1, 0), element('c', 2, 0)];
    render(
      <ZoomPanContainer
        elements={elements}
        elementStates={{ a: 'hidden' }}
        clustering={{ minScreenPixelDistance: 100, countedState: 'correct' }}
      >
        <ContextReader />
      </ZoomPanContainer>,
    );
    const data = JSON.parse(screen.getByTestId('context').textContent ?? '{}');
    expect(data.clusteredIds).toEqual(['b', 'c']);
  });

  it('renders with empty elements', () => {
    const { container } = render(
      <ZoomPanContainer elements={[]}>
        <text>empty</text>
      </ZoomPanContainer>,
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 100 100');
  });
});
