import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { VisualizationRendererProps } from '@/visualizations/VisualizationRendererProps';
import type { VisualizationElement } from '@/visualizations/VisualizationElement';
import type { MapElement } from '@/visualizations/map/MapElement';
import { LocateMode } from '../LocateMode';

function makeMapElement(id: string, label: string, lat: number, lng: number): MapElement {
  return {
    id,
    label,
    viewBoxCenter: { x: lng, y: -lat },
    viewBoxBounds: { minX: lng - 0.5, minY: -lat - 0.5, maxX: lng + 0.5, maxY: -lat + 0.5 },
    interactive: true,
    geoCoordinates: { latitude: lat, longitude: lng },
    svgPathData: '',
    code: id,
  };
}

const elements: ReadonlyArray<VisualizationElement> = [
  makeMapElement('paris', 'Paris', 48.8566, 2.3522),
  makeMapElement('london', 'London', 51.5074, -0.1278),
];

/** A mock renderer that exposes onPositionClick via clickable buttons. */
function MockRenderer({ onPositionClick }: VisualizationRendererProps) {
  return (
    <div role="img" aria-label="visualization">
      <button
        onClick={() => onPositionClick?.({ x: 2.3522, y: -48.8566 })}
      >
        Click on Paris
      </button>
      <button
        onClick={() => onPositionClick?.({ x: 50, y: 50 })}
      >
        Click far away
      </button>
    </div>
  );
}

function renderLocateMode() {
  return render(
    <LocateMode
      elements={elements}
      toggles={{}}
      Renderer={MockRenderer}
    />,
  );
}

describe('LocateMode', () => {
  it('shows the initial prompt with a target label', () => {
    renderLocateMode();

    const prompt = screen.getByText(/Click where/);
    expect(prompt).toBeInTheDocument();
    expect(prompt.textContent).toMatch(/Click where (Paris|London) is/);
  });

  it('shows progress counter', () => {
    renderLocateMode();

    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('shows skip and give up buttons', () => {
    renderLocateMode();

    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Give up' })).toBeInTheDocument();
  });

  it('renders the visualization renderer', () => {
    renderLocateMode();

    expect(screen.getByRole('img', { name: 'visualization' })).toBeInTheDocument();
  });

  it('advances to next target after skip', async () => {
    const user = userEvent.setup();
    renderLocateMode();

    const initialPrompt = screen.getByText(/Click where/).textContent;
    await user.click(screen.getByRole('button', { name: 'Skip' }));

    const newPrompt = screen.getByText(/Click where/).textContent;
    expect(newPrompt).not.toBe(initialPrompt);
  });

  it('shows results after give up', async () => {
    const user = userEvent.setup();
    renderLocateMode();

    await user.click(screen.getByRole('button', { name: 'Give up' }));

    expect(screen.getByText('Results')).toBeInTheDocument();
  });

  it('shows results after all targets are answered', async () => {
    const user = userEvent.setup();
    renderLocateMode();

    await user.click(screen.getByRole('button', { name: 'Click on Paris' }));
    await user.click(screen.getByRole('button', { name: 'Click on Paris' }));

    expect(screen.getByText('Results')).toBeInTheDocument();
  });

  it('shows score bar with correct count', async () => {
    const user = userEvent.setup();
    renderLocateMode();

    await user.click(screen.getByRole('button', { name: 'Click on Paris' }));

    expect(screen.getByText(/correct/)).toBeInTheDocument();
  });
});
