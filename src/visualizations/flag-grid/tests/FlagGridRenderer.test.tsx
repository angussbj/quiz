import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { FlagGridRenderer } from '../FlagGridRenderer';
import type { VisualizationRendererProps } from '../../VisualizationRendererProps';
import type { FlagGridElement } from '../FlagGridElement';

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

function makeFlagElement(id: string): FlagGridElement {
  return {
    id,
    label: id.toUpperCase(),
    row: 0,
    column: 0,
    flagUrl: `/flags/${id}.svg`,
    viewBoxCenter: { x: 0, y: 0 },
    viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    interactive: true,
  };
}

function makeProps(): VisualizationRendererProps {
  const ids = Array.from({ length: 20 }, (_, i) => `c${i}`);
  return {
    elements: ids.map(makeFlagElement),
    elementStates: {},
    toggles: {},
    clustering: { minScreenPixelDistance: 0, disableAboveScale: 0, countedState: 'correct' },
  };
}

function readOrder(tree: ReturnType<typeof render>): ReadonlyArray<string> {
  const groups = tree.container.querySelectorAll<HTMLElement>('g[data-element-id]');
  return Array.from(groups).map((g) => g.getAttribute('data-element-id') ?? '');
}

function renderOnce(element: ReactElement) {
  return render(element);
}

describe('FlagGridRenderer', () => {
  it('renders all flag elements', () => {
    const tree = renderOnce(<FlagGridRenderer {...makeProps()} />);
    expect(readOrder(tree)).toHaveLength(20);
  });

  it('reshuffles positions across mounts (statistical test)', () => {
    const props = makeProps();
    const firstOrder = readOrder(renderOnce(<FlagGridRenderer {...props} />));

    let sawDifferent = false;
    for (let i = 0; i < 10; i++) {
      const nextOrder = readOrder(renderOnce(<FlagGridRenderer {...props} />));
      if (nextOrder.join(',') !== firstOrder.join(',')) {
        sawDifferent = true;
        break;
      }
    }
    expect(sawDifferent).toBe(true);
  });

  it('keeps positions stable across prop updates within the same mount', () => {
    const props = makeProps();
    const tree = renderOnce(<FlagGridRenderer {...props} />);
    const before = readOrder(tree);

    tree.rerender(<FlagGridRenderer {...makeProps()} />);
    const after = readOrder(tree);

    expect(after).toEqual(before);
  });
});
