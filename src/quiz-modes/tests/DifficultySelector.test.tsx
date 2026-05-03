import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DifficultySelector } from '../DifficultySelector';
import type { DifficultyPresets } from '../DifficultyPreset';

const presets: DifficultyPresets = {
  slots: [
    { label: 'Easy', mode: 'identify' },
    { label: 'Medium', mode: 'locate' },
    { label: 'Hard', mode: 'free-recall-unordered' },
  ],
};

describe('DifficultySelector', () => {
  it('renders three buttons with the preset labels', () => {
    render(<DifficultySelector presets={presets} activeSlot={0} onSlotChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Easy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Medium' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hard' })).toBeInTheDocument();
  });

  it('marks the active slot with aria-pressed=true', () => {
    render(<DifficultySelector presets={presets} activeSlot={1} onSlotChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Easy' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Medium' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Hard' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onSlotChange with the correct index when a button is clicked', async () => {
    const user = userEvent.setup();
    const onSlotChange = jest.fn();
    render(<DifficultySelector presets={presets} activeSlot={0} onSlotChange={onSlotChange} />);

    await user.click(screen.getByRole('button', { name: 'Hard' }));
    expect(onSlotChange).toHaveBeenCalledWith(2);
  });

  it('calls onSlotChange with 0 when Easy is clicked', async () => {
    const user = userEvent.setup();
    const onSlotChange = jest.fn();
    render(<DifficultySelector presets={presets} activeSlot={2} onSlotChange={onSlotChange} />);

    await user.click(screen.getByRole('button', { name: 'Easy' }));
    expect(onSlotChange).toHaveBeenCalledWith(0);
  });

  it('renders a group with accessible label', () => {
    render(<DifficultySelector presets={presets} activeSlot={0} onSlotChange={() => {}} />);
    expect(screen.getByRole('group', { name: 'Difficulty' })).toBeInTheDocument();
  });

  it('works with custom difficulty labels', () => {
    const custom: DifficultyPresets = {
      slots: [
        { label: 'Starter', mode: 'identify' },
        { label: 'Regular', mode: 'locate' },
        { label: 'Expert', mode: 'free-recall-unordered' },
      ],
    };
    render(<DifficultySelector presets={custom} activeSlot={0} onSlotChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Starter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expert' })).toBeInTheDocument();
  });
});
