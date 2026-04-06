import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ToggleDefinition, TogglePreset } from '../ToggleDefinition';
import type { QuizModeType } from '@/quiz-definitions/QuizDefinition';
import { QuizSetupPanel, type QuizSetupPanelProps } from '../QuizSetupPanel';

const toggles: ReadonlyArray<ToggleDefinition> = [
  { key: 'show-labels', label: 'Show labels', defaultValue: true, group: 'display', hiddenBehavior: 'on-reveal' },
  { key: 'show-borders', label: 'Show borders', defaultValue: true, group: 'display', hiddenBehavior: 'never' },
];

const presets: ReadonlyArray<TogglePreset> = [
  { name: 'easy', label: 'Easy', values: { 'show-labels': true, 'show-borders': true } },
];

const availableModes: ReadonlyArray<QuizModeType> = ['free-recall-unordered', 'identify', 'locate'];

function renderPanel(overrides: Partial<QuizSetupPanelProps> = {}) {
  const props: QuizSetupPanelProps = {
    title: 'European Capitals',
    description: 'Name the capital cities of Europe.',
    availableModes,
    selectedMode: 'free-recall-unordered',
    onModeChange: jest.fn(),
    countdownMinutes: undefined,
    onCountdownChange: jest.fn(),
    toggles,
    presets,
    toggleValues: { 'show-labels': true, 'show-borders': true },
    activePreset: undefined,
    onToggleChange: jest.fn(),
    onPreset: jest.fn(),
    onStart: jest.fn(),
    panelLevel: 'full',
    onPanelLevelChange: jest.fn(),
    ...overrides,
  };
  render(<QuizSetupPanel {...props} />);
  return props;
}

describe('QuizSetupPanel', () => {
  it('renders title and description', () => {
    renderPanel();
    expect(screen.getByRole('heading', { name: 'European Capitals' })).toBeInTheDocument();
    expect(screen.getByText('Name the capital cities of Europe.')).toBeInTheDocument();
  });

  it('renders mode selector with human-readable labels', () => {
    renderPanel();
    const select = screen.getByLabelText('Mode');
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Name from memory' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Point and click' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Place it' })).toBeInTheDocument();
  });

  it('pre-selects the default mode', () => {
    renderPanel({ selectedMode: 'identify' });
    const select = screen.getByLabelText('Mode') as HTMLSelectElement;
    expect(select.value).toBe('identify');
  });

  it('calls onModeChange when mode is changed', async () => {
    const user = userEvent.setup();
    const props = renderPanel();
    await user.selectOptions(screen.getByLabelText('Mode'), 'locate');
    expect(props.onModeChange).toHaveBeenCalledWith('locate');
  });

  it('hides mode selector when only one mode available', () => {
    renderPanel({ availableModes: ['free-recall-unordered'] });
    expect(screen.queryByLabelText('Mode')).not.toBeInTheDocument();
  });

  it('renders timer input', () => {
    renderPanel();
    expect(screen.getByLabelText('Time limit')).toBeInTheDocument();
    expect(screen.getByText('minutes')).toBeInTheDocument();
  });

  it('shows countdown minutes when provided', () => {
    renderPanel({ countdownMinutes: 5 });
    const input = screen.getByLabelText('Time limit') as HTMLInputElement;
    expect(input.value).toBe('5');
  });

  it('calls onCountdownChange when timer value changes', async () => {
    const user = userEvent.setup();
    const props = renderPanel();
    const input = screen.getByLabelText('Time limit');
    await user.type(input, '3');
    expect(props.onCountdownChange).toHaveBeenCalledWith(3);
  });

  it('calls onCountdownChange with undefined when timer is cleared', async () => {
    const user = userEvent.setup();
    const props = renderPanel({ countdownMinutes: 5 });
    const input = screen.getByLabelText('Time limit');
    await user.clear(input);
    expect(props.onCountdownChange).toHaveBeenCalledWith(undefined);
  });

  it('renders stepper buttons for time limit', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: 'Decrease time limit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase time limit' })).toBeInTheDocument();
  });

  it('increments time limit from undefined to 1', async () => {
    const user = userEvent.setup();
    const props = renderPanel();
    await user.click(screen.getByRole('button', { name: 'Increase time limit' }));
    expect(props.onCountdownChange).toHaveBeenCalledWith(1);
  });

  it('increments time limit from existing value', async () => {
    const user = userEvent.setup();
    const props = renderPanel({ countdownMinutes: 5 });
    await user.click(screen.getByRole('button', { name: 'Increase time limit' }));
    expect(props.onCountdownChange).toHaveBeenCalledWith(6);
  });

  it('decrements time limit', async () => {
    const user = userEvent.setup();
    const props = renderPanel({ countdownMinutes: 5 });
    await user.click(screen.getByRole('button', { name: 'Decrease time limit' }));
    expect(props.onCountdownChange).toHaveBeenCalledWith(4);
  });

  it('clears time limit when decrementing from 1', async () => {
    const user = userEvent.setup();
    const props = renderPanel({ countdownMinutes: 1 });
    await user.click(screen.getByRole('button', { name: 'Decrease time limit' }));
    expect(props.onCountdownChange).toHaveBeenCalledWith(undefined);
  });

  it('clears time limit when decrementing from undefined', async () => {
    const user = userEvent.setup();
    const props = renderPanel();
    await user.click(screen.getByRole('button', { name: 'Decrease time limit' }));
    expect(props.onCountdownChange).toHaveBeenCalledWith(undefined);
  });

  it('renders toggle panel with toggles', () => {
    renderPanel();
    expect(screen.getByText('Show labels')).toBeInTheDocument();
    expect(screen.getByText('Show borders')).toBeInTheDocument();
  });

  it('clicking Start calls onStart', async () => {
    const user = userEvent.setup();
    const props = renderPanel();
    await user.click(screen.getByRole('button', { name: 'Start Quiz' }));
    expect(props.onStart).toHaveBeenCalledTimes(1);
  });
});
