import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import QuizPage from '../QuizPage';

function renderQuizPage(quizId: string) {
  return render(
    <MemoryRouter initialEntries={[`/quiz/${quizId}`]}>
      <Routes>
        <Route path="/quiz/*" element={<QuizPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function mockCsvResponse(csvText: string) {
  return {
    ok: true,
    headers: new Headers({ 'content-type': 'text/csv' }),
    text: () => Promise.resolve(csvText),
  };
}

describe('QuizPage', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('shows not found for an unknown quiz ID', () => {
    renderQuizPage('nonexistent');
    expect(screen.getByText(/Quiz not found: nonexistent/)).toBeInTheDocument();
  });

  it('renders quiz title and description for a valid quiz', () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      mockCsvResponse('id,city,country\nparis,Paris,France'),
    );

    renderQuizPage('geo-capitals-europe');
    expect(screen.getByRole('heading', { name: 'European Capitals' })).toBeInTheDocument();
    expect(screen.getByText('Name the capital cities of European countries.')).toBeInTheDocument();
  });

  it('does not render breadcrumbs (handled by Layout)', () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      mockCsvResponse('id,city\nparis,Paris'),
    );

    renderQuizPage('geo-capitals-europe');
    expect(screen.queryByRole('navigation', { name: 'Breadcrumbs' })).not.toBeInTheDocument();
  });

  it('shows loading state then loaded data', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      mockCsvResponse('id,city,country\nparis,Paris,France\nberlin,Berlin,Germany'),
    );

    renderQuizPage('geo-capitals-europe');

    // Loading state appears first
    expect(screen.getByText(/Loading quiz data/)).toBeInTheDocument();

    // Data appears after fetch resolves
    await waitFor(() => {
      expect(screen.getByText('2 rows loaded')).toBeInTheDocument();
    });
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
  });

  it('shows error state on fetch failure', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    renderQuizPage('geo-capitals-europe');

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch quiz data/)).toBeInTheDocument();
    });
  });

  it('displays quiz metadata', () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      mockCsvResponse('id,city\nparis,Paris'),
    );

    renderQuizPage('geo-capitals-europe');
    expect(screen.getByText('map')).toBeInTheDocument();
    expect(screen.getByText('free-recall-unordered')).toBeInTheDocument();
  });
});
