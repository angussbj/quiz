import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { VisualizationRendererProps } from '@/visualizations/VisualizationRendererProps';
import type { VisualizationElement } from '@/visualizations/VisualizationElement';
import { FreeRecallMode } from '../FreeRecallMode';

function makeElement(id: string): VisualizationElement {
  return {
    id,
    label: id,
    viewBoxCenter: { x: 0, y: 0 },
    viewBoxBounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
    interactive: true,
  };
}

function MockRenderer(_props: VisualizationRendererProps) {
  return <div data-testid="visualization" />;
}

const elements = [makeElement('paris'), makeElement('berlin'), makeElement('madrid')];
const dataRows = [
  { id: 'paris', answer: 'paris' },
  { id: 'berlin', answer: 'berlin' },
  { id: 'madrid', answer: 'madrid' },
];
const columnMappings = { answer: 'answer' };

function renderMode(overrides: Partial<Parameters<typeof FreeRecallMode>[0]> = {}) {
  render(
    <FreeRecallMode
      elements={elements}
      dataRows={dataRows}
      columnMappings={columnMappings}
      toggleDefinitions={[]}
      toggleValues={{}}
      Renderer={MockRenderer}
      onFinish={jest.fn()}
      {...overrides}
    />,
  );
}

describe('FreeRecallMode', () => {
  it('renders progress counter at zero', () => {
    renderMode();
    expect(screen.getByText('0/3')).toBeInTheDocument();
  });

  it('renders text input with placeholder', () => {
    renderMode();
    expect(screen.getByPlaceholderText('Type an answer…')).toBeInTheDocument();
  });

  it('renders give up button', () => {
    renderMode();
    expect(screen.getByRole('button', { name: 'Give up' })).toBeInTheDocument();
  });

  it('renders visualization', () => {
    renderMode();
    expect(screen.getByTestId('visualization')).toBeInTheDocument();
  });

  it('advances progress when a correct answer is typed', async () => {
    const user = userEvent.setup();
    renderMode();

    await user.type(screen.getByPlaceholderText('Type an answer…'), 'paris');

    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('clears input after a correct answer', async () => {
    const user = userEvent.setup();
    renderMode();

    const input = screen.getByPlaceholderText('Type an answer…');
    await user.type(input, 'paris');

    expect(input).toHaveValue('');
  });

  it('shows the last matched answer', async () => {
    const user = userEvent.setup();
    renderMode();

    await user.type(screen.getByPlaceholderText('Type an answer…'), 'paris');

    expect(screen.getByText(/paris/)).toBeInTheDocument();
  });

  it('give up hides input and shows finished message', async () => {
    const user = userEvent.setup();
    renderMode();

    await user.click(screen.getByRole('button', { name: 'Give up' }));

    expect(screen.queryByPlaceholderText('Type an answer…')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Give up' })).not.toBeInTheDocument();
    expect(screen.getByText(/answered/)).toBeInTheDocument();
  });

  it('shows perfect message when all answered', async () => {
    const user = userEvent.setup();
    renderMode();

    const input = screen.getByPlaceholderText('Type an answer…');
    await user.type(input, 'paris');
    await user.type(input, 'berlin');
    await user.type(input, 'madrid');

    expect(screen.getByText(/Perfect/)).toBeInTheDocument();
  });

  it('calls onFinish when quiz ends', async () => {
    const user = userEvent.setup();
    const onFinish = jest.fn();
    renderMode({ onFinish });

    await user.click(screen.getByRole('button', { name: 'Give up' }));

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ correct: 0, total: 3 }));
  });

  it('clears input on Escape key', async () => {
    const user = userEvent.setup();
    renderMode();

    const input = screen.getByPlaceholderText('Type an answer…');
    await user.type(input, 'Par');
    await user.keyboard('{Escape}');

    expect(input).toHaveValue('');
  });

  it('does not show controls when reviewing', () => {
    renderMode({ reviewing: true });

    expect(screen.queryByPlaceholderText('Type an answer…')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Give up' })).not.toBeInTheDocument();
  });
});
