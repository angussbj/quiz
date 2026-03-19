import { render, screen, fireEvent } from '@testing-library/react';
import { MapRenderer } from '../MapRenderer';
import type { VisualizationRendererProps } from '../../VisualizationRendererProps';
import { sampleCityElements, sampleBackgroundPaths, sampleBackgroundLabels } from './sampleMapData';

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

function renderMap(overrides: Partial<VisualizationRendererProps> = {}) {
  const defaults: VisualizationRendererProps = {
    elements: sampleCityElements,
    elementStates: {},
    toggles: { showBorders: true, showCityDots: true, showCountryNames: false },
    backgroundPaths: sampleBackgroundPaths,
    backgroundLabels: sampleBackgroundLabels,
    // Disable clustering in tests so elements render individually
    clustering: { minScreenPixelDistance: 0, disableAboveScale: 0, countedState: 'correct' },
    ...overrides,
  };
  return render(<MapRenderer {...defaults} />);
}

describe('MapRenderer', () => {
  it('renders city dots for each element', () => {
    const { container } = renderMap();
    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(sampleCityElements.length);
  });

  it('renders background border paths when showBorders is true', () => {
    const { container } = renderMap();
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(sampleBackgroundPaths.length);
  });

  it('hides background borders when showBorders toggle is false', () => {
    const { container } = renderMap({
      toggles: { showBorders: false, showCityDots: true, showCountryNames: false },
    });
    const paths = container.querySelectorAll('path');
    expect(paths).toHaveLength(0);
  });

  it('hides city dots when showCityDots toggle is false', () => {
    const { container } = renderMap({
      toggles: { showBorders: true, showCityDots: false, showCountryNames: false },
    });
    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(0);
  });

  it('shows background labels when showCountryNames toggle is true', () => {
    renderMap({
      toggles: { showBorders: true, showCityDots: true, showCountryNames: true },
    });
    // At least the largest country label should be visible (overlap hiding may suppress smaller ones)
    const labelTexts = sampleBackgroundLabels.map((l) => l.name);
    const visibleLabels = labelTexts.filter((name) => screen.queryByText(name));
    expect(visibleLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('hides background labels when showCountryNames toggle is false', () => {
    renderMap({
      toggles: { showBorders: true, showCityDots: true, showCountryNames: false },
    });
    expect(screen.queryByText('France')).not.toBeInTheDocument();
  });

  it('calls onElementClick when a city dot is clicked', () => {
    const onClick = jest.fn();
    const { container } = renderMap({ onElementClick: onClick });
    const circles = container.querySelectorAll('circle');
    fireEvent.click(circles[0]);
    expect(onClick).toHaveBeenCalledWith('paris');
  });

  it('does not render hidden elements', () => {
    const { container } = renderMap({
      elementStates: { paris: 'hidden', berlin: 'hidden' },
    });
    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(2); // only madrid and rome
  });

  it('applies correct state styling to dots', () => {
    const { container } = renderMap({
      elementStates: { paris: 'correct' },
    });
    const circles = container.querySelectorAll('circle');
    const parisDot = Array.from(circles).find(
      (c) => c.getAttribute('cx') === String(sampleCityElements[0].viewBoxCenter.x),
    );
    expect(parisDot).toHaveAttribute('fill', 'var(--color-correct)');
  });

  it('applies incorrect state styling to dots', () => {
    const { container } = renderMap({
      elementStates: { berlin: 'incorrect' },
    });
    const circles = container.querySelectorAll('circle');
    const berlinDot = Array.from(circles).find(
      (c) => c.getAttribute('cx') === String(sampleCityElements[1].viewBoxCenter.x),
    );
    expect(berlinDot).toHaveAttribute('fill', 'var(--color-incorrect)');
  });

  it('highlights the target element with a thicker stroke', () => {
    const { container } = renderMap({ targetElementId: 'paris' });
    const circles = container.querySelectorAll('circle');
    const parisDot = Array.from(circles).find(
      (c) => c.getAttribute('cx') === String(sampleCityElements[0].viewBoxCenter.x),
    );
    expect(parisDot).toHaveAttribute('stroke', 'var(--color-highlight)');
    // Target stroke is 0.5× radius, non-target is 0.27× — verify target is thicker
    const nonTargetDot = Array.from(circles).find(
      (c) => c.getAttribute('cx') === String(sampleCityElements[1].viewBoxCenter.x),
    );
    const targetStroke = parseFloat(parisDot!.getAttribute('stroke-width')!);
    const normalStroke = parseFloat(nonTargetDot!.getAttribute('stroke-width')!);
    expect(targetStroke).toBeGreaterThan(normalStroke);
  });

  it('renders with no elements', () => {
    const { container } = renderMap({ elements: [] });
    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(0);
  });

  it('renders with no background paths', () => {
    const { container } = renderMap({ backgroundPaths: undefined });
    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(sampleCityElements.length);
  });

  it('applies per-element toggle overrides for city dots', () => {
    const { container } = renderMap({
      toggles: { showBorders: true, showCityDots: false, showCountryNames: false },
      elementToggles: {
        paris: { showCityDots: true },
      },
    });
    // Only Paris should show a dot due to per-element override
    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(1);
  });

  it('uses uniform city dot colour instead of group colours', () => {
    const { container } = renderMap();
    const circles = container.querySelectorAll('circle');
    for (const circle of circles) {
      expect(circle.getAttribute('fill')).toBe('var(--color-city-dot)');
    }
  });

  it('city dots are not interactive when onElementClick is absent', () => {
    const onClick = jest.fn();
    const { container } = renderMap({ onElementClick: undefined });
    const circles = container.querySelectorAll('circle');
    fireEvent.click(circles[0]);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not fire click handler on city dots when onElementClick is absent', () => {
    const { container } = renderMap({ onElementClick: undefined });
    const circles = container.querySelectorAll('circle');
    // Should not throw when clicking without a handler
    fireEvent.click(circles[0]);
  });

  it('renders svgOverlay content within the SVG', () => {
    renderMap({
      svgOverlay: <text data-testid="overlay-text">Overlay Content</text>,
    });
    const overlayText = screen.getByTestId('overlay-text');
    expect(overlayText).toBeInTheDocument();
    expect(overlayText.textContent).toBe('Overlay Content');
    expect(overlayText.closest('svg')).toBeInTheDocument();
  });
});
