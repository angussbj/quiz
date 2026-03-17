import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ToggleDefinition, TogglePreset } from '../ToggleDefinition';
import { TogglePanel } from '../TogglePanel';

const toggles: ReadonlyArray<ToggleDefinition> = [
  { key: 'show-labels', label: 'Show labels', defaultValue: true, group: 'display' },
  { key: 'show-borders', label: 'Show borders', defaultValue: true, group: 'display' },
  { key: 'accept-typos', label: 'Accept typos', defaultValue: false, group: 'difficulty' },
];

const presets: ReadonlyArray<TogglePreset> = [
  { name: 'easy', label: 'Easy', values: { 'show-labels': true, 'show-borders': true, 'accept-typos': true } },
  { name: 'hard', label: 'Hard', values: { 'show-labels': false, 'show-borders': false, 'accept-typos': false } },
];

const defaultValues: Record<string, boolean> = {
  'show-labels': true,
  'show-borders': true,
  'accept-typos': false,
};

function renderPanel(overrides: Partial<Parameters<typeof TogglePanel>[0]> = {}) {
  const props = {
    title: 'European Capitals',
    description: 'Name the capital cities of Europe',
    toggles,
    presets,
    values: defaultValues,
    activePreset: undefined,
    onChange: jest.fn(),
    onPreset: jest.fn(),
    onStart: jest.fn(),
    ...overrides,
  };
  render(<TogglePanel {...props} />);
  return props;
}

describe('TogglePanel', () => {
  it('renders the quiz title', () => {
    renderPanel();
    expect(screen.getByRole('heading', { name: 'European Capitals' })).toBeInTheDocument();
  });

  it('renders the description', () => {
    renderPanel();
    expect(screen.getByText('Name the capital cities of Europe')).toBeInTheDocument();
  });

  it('renders preset buttons', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: 'Easy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hard' })).toBeInTheDocument();
  });

  it('marks the active preset', () => {
    renderPanel({ activePreset: 'easy' });
    expect(screen.getByRole('button', { name: 'Easy' })).toHaveAttribute('data-active');
    expect(screen.getByRole('button', { name: 'Hard' })).not.toHaveAttribute('data-active');
  });

  it('calls onPreset when a preset button is clicked', async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    await user.click(screen.getByRole('button', { name: 'Hard' }));
    expect(props.onPreset).toHaveBeenCalledWith(presets[1]);
  });

  it('renders toggle switches grouped by category', () => {
    renderPanel();
    expect(screen.getByText('Display')).toBeInTheDocument();
    expect(screen.getByText('Difficulty')).toBeInTheDocument();
  });

  it('renders toggle labels', () => {
    renderPanel();
    expect(screen.getByText('Show labels')).toBeInTheDocument();
    expect(screen.getByText('Show borders')).toBeInTheDocument();
    expect(screen.getByText('Accept typos')).toBeInTheDocument();
  });

  it('renders toggle switches with correct checked state', () => {
    renderPanel();
    const switches = screen.getAllByRole('switch');
    expect(switches[0]).toHaveAttribute('aria-checked', 'true');
    expect(switches[1]).toHaveAttribute('aria-checked', 'true');
    expect(switches[2]).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange when a toggle switch is clicked', async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    const switches = screen.getAllByRole('switch');
    await user.click(switches[2]);
    expect(props.onChange).toHaveBeenCalledWith('accept-typos', true);
  });

  it('toggles off when an enabled switch is clicked', async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    const switches = screen.getAllByRole('switch');
    await user.click(switches[0]);
    expect(props.onChange).toHaveBeenCalledWith('show-labels', false);
  });

  it('renders and triggers the start button', async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    const startButton = screen.getByRole('button', { name: 'Start Quiz' });
    await user.click(startButton);
    expect(props.onStart).toHaveBeenCalledTimes(1);
  });

  it('hides presets section when no presets given', () => {
    renderPanel({ presets: [] });
    expect(screen.queryByText('Presets')).not.toBeInTheDocument();
  });

  it('omits description when not provided', () => {
    renderPanel({ description: undefined });
    expect(screen.queryByText('Name the capital cities of Europe')).not.toBeInTheDocument();
  });
});
