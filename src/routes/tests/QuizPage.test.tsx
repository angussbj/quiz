import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('shows loading state initially', () => {
    globalThis.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
    renderQuizPage('geo-capitals-europe');
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
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

  it('renders setup screen after data loads', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      mockCsvResponse('id,city,country,latitude,longitude,region\nparis,Paris,France,48.8566,2.3522,Europe'),
    );

    renderQuizPage('geo-capitals-europe');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'European Capitals' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Start Quiz' })).toBeInTheDocument();
  });

  it('transitions to active quiz on start', async () => {
    const user = userEvent.setup();
    globalThis.fetch = jest.fn().mockResolvedValue(
      mockCsvResponse('id,city,country,latitude,longitude,region\nparis,Paris,France,48.8566,2.3522,Europe'),
    );

    renderQuizPage('geo-capitals-europe');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start Quiz' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Start Quiz' }));

    expect(screen.queryByRole('heading', { name: 'European Capitals' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reconfigure' })).toBeInTheDocument();
  });
});
