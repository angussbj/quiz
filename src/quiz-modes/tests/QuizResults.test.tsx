import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuizResults } from '../QuizResults';

const defaultProps = {
  correct: 8,
  total: 10,
  percentage: 80,
  elapsedSeconds: 125,
  onRetry: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('QuizResults', () => {
  it('renders score percentage text', () => {
    render(<QuizResults {...defaultProps} />);
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('renders correct/total count', () => {
    render(<QuizResults {...defaultProps} />);
    expect(screen.getByText('8 of 10 correct')).toBeInTheDocument();
  });

  it('renders elapsed time formatted as MM:SS', () => {
    render(<QuizResults {...defaultProps} />);
    expect(screen.getByText('02:05')).toBeInTheDocument();
  });

  it('renders "Try again" button', () => {
    render(<QuizResults {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('clicking "Try again" calls onRetry', async () => {
    const onRetry = jest.fn();
    render(<QuizResults {...defaultProps} onRetry={onRetry} />);

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows confetti elements when percentage is 100', () => {
    render(<QuizResults {...defaultProps} percentage={100} />);
    const confetti = screen.getAllByTestId('confetti');
    expect(confetti.length).toBeGreaterThan(0);
  });

  it('does not show confetti when percentage < 100', () => {
    render(<QuizResults {...defaultProps} percentage={80} />);
    expect(screen.queryAllByTestId('confetti')).toHaveLength(0);
  });
});
