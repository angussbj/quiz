import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import HomePage from '../HomePage';

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  it('renders the page title', () => {
    renderHomePage();
    expect(screen.getByRole('heading', { name: 'Quizzes' })).toBeInTheDocument();
  });

  it('renders the search input', () => {
    renderHomePage();
    expect(screen.getByRole('textbox', { name: 'Search quizzes' })).toBeInTheDocument();
  });

  it('renders top-level categories', () => {
    renderHomePage();
    expect(screen.getByRole('button', { name: /Geography/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Science/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /History/ })).toBeInTheDocument();
  });

  it('renders quiz links (tree starts expanded)', () => {
    renderHomePage();
    const europeLinks = screen.getAllByRole('link', { name: /European/ });
    expect(europeLinks.length).toBeGreaterThanOrEqual(3); // Capitals, Countries, Flags
  });

  it('sets aria-expanded=false on collapsed categories', async () => {
    const user = userEvent.setup();
    renderHomePage();

    const geoButton = screen.getByRole('button', { name: /Geography/ });
    await user.click(geoButton);

    expect(geoButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('filters the tree when search has 3+ characters', async () => {
    const user = userEvent.setup();
    renderHomePage();

    const input = screen.getByRole('textbox', { name: 'Search quizzes' });
    await user.type(input, 'periodic');

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Periodic Table/ })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /European Flags/ })).not.toBeInTheDocument();
    });
  });

  it('does not filter with fewer than 3 characters', async () => {
    const user = userEvent.setup();
    renderHomePage();

    const input = screen.getByRole('textbox', { name: 'Search quizzes' });
    await user.type(input, 'pe');

    // All categories should still be visible
    expect(screen.getByRole('button', { name: /Geography/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Science/ })).toBeInTheDocument();
  });

  it('shows empty state when search matches nothing', async () => {
    const user = userEvent.setup();
    renderHomePage();

    const input = screen.getByRole('textbox', { name: 'Search quizzes' });
    await user.type(input, 'xyznonexistent');

    await waitFor(() => {
      expect(screen.getByText('No quizzes match your search.')).toBeInTheDocument();
    });
  });
});
