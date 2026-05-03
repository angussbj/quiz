import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PanelLevelSwitcher } from '../PanelLevelSwitcher';

describe('PanelLevelSwitcher', () => {
  describe('simple level', () => {
    it('shows only the forward link', () => {
      render(<PanelLevelSwitcher level="simple" onLevelChange={() => {}} />);
      expect(screen.queryByRole('button', { name: /simplify/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /advanced/i })).toBeInTheDocument();
    });

    it('forward link says "Advanced →"', () => {
      render(<PanelLevelSwitcher level="simple" onLevelChange={() => {}} />);
      expect(screen.getByRole('button', { name: 'Advanced →' })).toBeInTheDocument();
    });

    it('calls onLevelChange with "advanced" when forward is clicked', async () => {
      const user = userEvent.setup();
      const onLevelChange = jest.fn();
      render(<PanelLevelSwitcher level="simple" onLevelChange={onLevelChange} />);
      await user.click(screen.getByRole('button', { name: 'Advanced →' }));
      expect(onLevelChange).toHaveBeenCalledWith('advanced');
    });
  });

  describe('advanced level', () => {
    it('shows both the back and forward links', () => {
      render(<PanelLevelSwitcher level="advanced" onLevelChange={() => {}} />);
      expect(screen.getByRole('button', { name: '← Simplify' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'More settings →' })).toBeInTheDocument();
    });

    it('back link calls onLevelChange with "simple"', async () => {
      const user = userEvent.setup();
      const onLevelChange = jest.fn();
      render(<PanelLevelSwitcher level="advanced" onLevelChange={onLevelChange} />);
      await user.click(screen.getByRole('button', { name: '← Simplify' }));
      expect(onLevelChange).toHaveBeenCalledWith('simple');
    });

    it('forward link calls onLevelChange with "full"', async () => {
      const user = userEvent.setup();
      const onLevelChange = jest.fn();
      render(<PanelLevelSwitcher level="advanced" onLevelChange={onLevelChange} />);
      await user.click(screen.getByRole('button', { name: 'More settings →' }));
      expect(onLevelChange).toHaveBeenCalledWith('full');
    });
  });

  describe('full level', () => {
    it('shows only the back link', () => {
      render(<PanelLevelSwitcher level="full" onLevelChange={() => {}} />);
      expect(screen.getByRole('button', { name: '← Simplify' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /more settings/i })).not.toBeInTheDocument();
    });

    it('back link calls onLevelChange with "advanced"', async () => {
      const user = userEvent.setup();
      const onLevelChange = jest.fn();
      render(<PanelLevelSwitcher level="full" onLevelChange={onLevelChange} />);
      await user.click(screen.getByRole('button', { name: '← Simplify' }));
      expect(onLevelChange).toHaveBeenCalledWith('advanced');
    });
  });
});
