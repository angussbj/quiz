import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { ThemeToggle } from '../ThemeToggle';

function mockMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

function renderThemeToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockMatchMedia();
    localStorage.clear();
  });

  it('renders a button with accessible label', () => {
    renderThemeToggle();
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAccessibleName();
  });

  it('cycles through light, dark, and system on repeated clicks', async () => {
    const user = userEvent.setup();
    renderThemeToggle();
    const button = screen.getByRole('button');

    // Default is system (from ThemeProvider with no stored preference)
    expect(button).toHaveAttribute('aria-label', 'System theme');

    await user.click(button);
    expect(button).toHaveAttribute('aria-label', 'Light mode');

    await user.click(button);
    expect(button).toHaveAttribute('aria-label', 'Dark mode');

    await user.click(button);
    expect(button).toHaveAttribute('aria-label', 'System theme');
  });

  it('persists preference in localStorage', async () => {
    const user = userEvent.setup();
    renderThemeToggle();
    const button = screen.getByRole('button');

    await user.click(button); // system → light
    expect(localStorage.getItem('quiz-theme-preference')).toBe('light');

    await user.click(button); // light → dark
    expect(localStorage.getItem('quiz-theme-preference')).toBe('dark');
  });
});
