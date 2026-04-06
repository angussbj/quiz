import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ToggleDefinition, TogglePreset } from '../ToggleDefinition';
import { TogglePanel } from '../TogglePanel';

const toggles: ReadonlyArray<ToggleDefinition> = [
  { key: 'show-labels', label: 'Show labels', defaultValue: true, group: 'display', hiddenBehavior: 'on-reveal' },
  { key: 'show-borders', label: 'Show borders', defaultValue: true, group: 'display', hiddenBehavior: 'never' },
  { key: 'accept-typos', label: 'Accept typos', defaultValue: false, group: 'difficulty', hiddenBehavior: 'never' },
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
    toggles,
    presets,
    values: defaultValues,
    activePreset: undefined as string | undefined,
    onChange: jest.fn(),
    onPreset: jest.fn(),
    ...overrides,
  };
  render(<TogglePanel {...props} />);
  return props;
}

describe('TogglePanel', () => {
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

  it('hides presets section when no presets given', () => {
    renderPanel({ presets: [] });
    expect(screen.queryByText('Presets')).not.toBeInTheDocument();
  });

  describe('visibleKeys filter', () => {
    it('shows only toggles whose key is in visibleKeys', () => {
      renderPanel({ visibleKeys: new Set(['show-labels']) });
      expect(screen.getByText('Show labels')).toBeInTheDocument();
      expect(screen.queryByText('Show borders')).not.toBeInTheDocument();
      expect(screen.queryByText('Accept typos')).not.toBeInTheDocument();
    });

    it('shows all toggles when visibleKeys is undefined', () => {
      renderPanel();
      expect(screen.getByText('Show labels')).toBeInTheDocument();
      expect(screen.getByText('Show borders')).toBeInTheDocument();
      expect(screen.getByText('Accept typos')).toBeInTheDocument();
    });

    it('shows no toggles when visibleKeys is an empty set', () => {
      renderPanel({ visibleKeys: new Set() });
      expect(screen.queryByText('Show labels')).not.toBeInTheDocument();
      expect(screen.queryByText('Show borders')).not.toBeInTheDocument();
    });

    it('filters select toggles when visibleSelectKeys is provided', () => {
      const selectToggles = [
        {
          key: 'precision',
          label: 'Precision',
          options: [{ value: 'year', label: 'Year' }, { value: 'day', label: 'Day' }],
          defaultValue: 'year',
          group: 'display',
        },
        {
          key: 'sort',
          label: 'Sort order',
          options: [{ value: 'asc', label: 'Asc' }, { value: 'desc', label: 'Desc' }],
          defaultValue: 'asc',
          group: 'display',
        },
      ];
      renderPanel({
        selectToggles,
        selectValues: {},
        visibleSelectKeys: new Set(['precision']),
      });
      expect(screen.getByText('Precision')).toBeInTheDocument();
      expect(screen.queryByText('Sort order')).not.toBeInTheDocument();
    });
  });
});
