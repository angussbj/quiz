import { render, fireEvent } from '@testing-library/react';
import { PeriodicTableRenderer, ZOOM_DETAIL_THRESHOLD } from '../PeriodicTableRenderer';
import type { GridElement } from '../GridElement';
import type { VisualizationRendererProps } from '../../VisualizationRendererProps';

let mockScale = 1;

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
  useTransformEffect: (cb: (ref: { state: { scale: number } }) => void) => {
    cb({ state: { scale: mockScale } });
  },
}));

afterEach(() => {
  mockScale = 1;
});

function makeElement(overrides: Partial<GridElement> = {}): GridElement {
  return {
    id: 'H',
    label: 'Hydrogen',
    viewBoxCenter: { x: 0, y: 0 },
    viewBoxBounds: { minX: 0, minY: 0, maxX: 60, maxY: 60 },
    interactive: true,
    row: 0,
    column: 0,
    symbol: 'H',
    atomicNumber: 1,
    trueRow: 0,
    trueColumn: 0,
    atomicWeight: '1.008',
    halfLifeSeconds: undefined,
    ...overrides,
  };
}

function makeProps(overrides: Partial<VisualizationRendererProps> = {}): VisualizationRendererProps {
  return {
    elements: [
      makeElement({ id: 'H', label: 'Hydrogen', symbol: 'H', row: 0, column: 0 }),
      makeElement({ id: 'He', label: 'Helium', symbol: 'He', row: 0, column: 17, group: 'noble-gas' }),
      makeElement({ id: 'Li', label: 'Lithium', symbol: 'Li', row: 1, column: 0, group: 'alkali-metal' }),
    ],
    elementStates: {
      H: 'context',
      He: 'context',
      Li: 'hidden',
    },
    toggles: { showSymbols: false },
    ...overrides,
  };
}

describe('PeriodicTableRenderer', () => {
  it('renders an SVG with cells for each element', () => {
    const { container } = render(<PeriodicTableRenderer {...makeProps()} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();

    const groups = container.querySelectorAll('g[data-element-id]');
    expect(groups).toHaveLength(3);
  });

  it('shows symbol for revealed elements', () => {
    const { container } = render(<PeriodicTableRenderer {...makeProps()} />);
    const texts = container.querySelectorAll('text');
    const textContents = Array.from(texts).map((t) => t.textContent);
    expect(textContents).toContain('H');
    expect(textContents).toContain('He');
  });

  it('does not show symbol for hidden elements', () => {
    const { container } = render(
      <PeriodicTableRenderer
        {...makeProps({
          elementStates: { H: 'hidden', He: 'hidden', Li: 'hidden' },
        })}
      />,
    );
    const texts = container.querySelectorAll('text');
    const textContents = Array.from(texts).map((t) => t.textContent);
    expect(textContents).not.toContain('H');
    expect(textContents).not.toContain('He');
    expect(textContents).not.toContain('Li');
  });

  it('shows symbol for correct elements', () => {
    const { container } = render(
      <PeriodicTableRenderer
        {...makeProps({
          elementStates: { H: 'correct', He: 'hidden', Li: 'hidden' },
        })}
      />,
    );
    const texts = container.querySelectorAll('text');
    const textContents = Array.from(texts).map((t) => t.textContent);
    expect(textContents).toContain('H');
  });

  it('calls onElementClick when an interactive cell is clicked', () => {
    const handleClick = jest.fn();
    const { container } = render(
      <PeriodicTableRenderer
        {...makeProps({ onElementClick: handleClick })}
      />,
    );

    const hydrogenGroup = container.querySelector('g[data-element-id="H"]');
    expect(hydrogenGroup).toBeInTheDocument();
    fireEvent.click(hydrogenGroup!);
    expect(handleClick).toHaveBeenCalledWith('H');
  });

  it('does not call onElementClick for non-interactive cells', () => {
    const handleClick = jest.fn();
    const { container } = render(
      <PeriodicTableRenderer
        {...makeProps({
          elements: [makeElement({ id: 'H', interactive: false })],
          elementStates: { H: 'context' },
          onElementClick: handleClick,
        })}
      />,
    );

    const group = container.querySelector('g[data-element-id="H"]');
    fireEvent.click(group!);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies correct state styling via stroke color', () => {
    const { container } = render(
      <PeriodicTableRenderer
        {...makeProps({
          elementStates: { H: 'correct', He: 'incorrect', Li: 'hidden' },
        })}
      />,
    );

    const correctRect = container.querySelector('g[data-element-id="H"] rect');
    expect(correctRect).toHaveAttribute('stroke', 'var(--color-correct)');

    const incorrectRect = container.querySelector('g[data-element-id="He"] rect');
    expect(incorrectRect).toHaveAttribute('stroke', 'var(--color-incorrect)');
  });

  it('highlights an element via highlighted state', () => {
    const { container } = render(
      <PeriodicTableRenderer
        {...makeProps({
          elementStates: { H: 'highlighted', He: 'hidden', Li: 'hidden' },
        })}
      />,
    );

    const targetRect = container.querySelector('g[data-element-id="H"] rect');
    expect(targetRect).toHaveAttribute('stroke', 'var(--color-highlight)');
    expect(targetRect).toHaveAttribute('stroke-width', '2.5');
  });

  it('renders with empty elements', () => {
    const { container } = render(
      <PeriodicTableRenderer
        {...makeProps({ elements: [], elementStates: {} })}
      />,
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('filters out non-grid elements', () => {
    const nonGridElement = {
      id: 'not-grid',
      label: 'Not Grid',
      viewBoxCenter: { x: 0, y: 0 },
      viewBoxBounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
      interactive: true,
    };
    const { container } = render(
      <PeriodicTableRenderer
        {...makeProps({
          elements: [nonGridElement, makeElement({ id: 'H' })],
          elementStates: { H: 'context' },
        })}
      />,
    );
    const groups = container.querySelectorAll('g[data-element-id]');
    expect(groups).toHaveLength(1);
  });

  it('shows element name label when zoomed in above detail threshold', () => {
    mockScale = ZOOM_DETAIL_THRESHOLD + 0.5;
    const { container } = render(
      <PeriodicTableRenderer
        {...makeProps({
          elementStates: { H: 'context', He: 'context', Li: 'context' },
        })}
      />,
    );
    const texts = container.querySelectorAll('text');
    const textContents = Array.from(texts).map((t) => t.textContent);
    expect(textContents).toContain('Hydrogen');
    expect(textContents).toContain('Helium');
    expect(textContents).toContain('Lithium');
  });

  it('does not show element name label when below detail threshold', () => {
    mockScale = 1;
    const { container } = render(
      <PeriodicTableRenderer
        {...makeProps({
          elementStates: { H: 'context', He: 'context', Li: 'context' },
        })}
      />,
    );
    const texts = container.querySelectorAll('text');
    const textContents = Array.from(texts).map((t) => t.textContent);
    expect(textContents).not.toContain('Hydrogen');
    expect(textContents).not.toContain('Helium');
    expect(textContents).not.toContain('Lithium');
  });

  it('shows atomic weight in top-right when toggle is on and zoomed in', () => {
    mockScale = ZOOM_DETAIL_THRESHOLD + 0.5;
    const { container } = render(
      <PeriodicTableRenderer
        {...makeProps({
          elements: [makeElement({ id: 'H', atomicWeight: '1.008' })],
          elementStates: { H: 'context' },
          toggles: { showSymbols: false, showAtomicWeight: true },
        })}
      />,
    );
    const texts = container.querySelectorAll('text');
    const textContents = Array.from(texts).map((t) => t.textContent);
    expect(textContents).toContain('1.008');
  });

  it('does not show atomic weight when toggle is off', () => {
    mockScale = ZOOM_DETAIL_THRESHOLD + 0.5;
    const { container } = render(
      <PeriodicTableRenderer
        {...makeProps({
          elements: [makeElement({ id: 'H', atomicWeight: '1.008' })],
          elementStates: { H: 'context' },
          toggles: { showSymbols: false, showAtomicWeight: false },
        })}
      />,
    );
    const texts = container.querySelectorAll('text');
    const textContents = Array.from(texts).map((t) => t.textContent);
    expect(textContents).not.toContain('1.008');
  });

  it('shows atomic weight even when not zoomed in', () => {
    mockScale = 1;
    const { container } = render(
      <PeriodicTableRenderer
        {...makeProps({
          elements: [makeElement({ id: 'H', atomicWeight: '1.008' })],
          elementStates: { H: 'context' },
          toggles: { showSymbols: false, showAtomicWeight: true },
        })}
      />,
    );
    const texts = container.querySelectorAll('text');
    const textContents = Array.from(texts).map((t) => t.textContent);
    expect(textContents).toContain('1.008');
  });

  it('shows "Stable" for half-life when element has no half-life data', () => {
    mockScale = ZOOM_DETAIL_THRESHOLD + 0.5;
    const { container } = render(
      <PeriodicTableRenderer
        {...makeProps({
          elements: [makeElement({ id: 'H', halfLifeSeconds: undefined })],
          elementStates: { H: 'context' },
          toggles: { showSymbols: false, showHalfLife: true },
        })}
      />,
    );
    const texts = container.querySelectorAll('text');
    const textContents = Array.from(texts).map((t) => t.textContent);
    expect(textContents).toContain('Stable');
  });

  it('shows formatted half-life for radioactive element', () => {
    mockScale = ZOOM_DETAIL_THRESHOLD + 0.5;
    const { container } = render(
      <PeriodicTableRenderer
        {...makeProps({
          elements: [makeElement({ id: 'Tc', halfLifeSeconds: 1.325e14 })],
          elementStates: { Tc: 'context' },
          toggles: { showSymbols: false, showHalfLife: true },
        })}
      />,
    );
    const texts = container.querySelectorAll('text');
    const textContents = Array.from(texts).map((t) => t.textContent);
    // 1.325e14 seconds is ~4.2 megayears
    expect(textContents.some((t) => t !== null && t.includes('My'))).toBe(true);
  });

  it('does not show half-life when toggle is off', () => {
    mockScale = ZOOM_DETAIL_THRESHOLD + 0.5;
    const { container } = render(
      <PeriodicTableRenderer
        {...makeProps({
          elements: [makeElement({ id: 'H', halfLifeSeconds: undefined })],
          elementStates: { H: 'context' },
          toggles: { showSymbols: false, showHalfLife: false },
        })}
      />,
    );
    const texts = container.querySelectorAll('text');
    const textContents = Array.from(texts).map((t) => t.textContent);
    expect(textContents).not.toContain('Stable');
  });
});
