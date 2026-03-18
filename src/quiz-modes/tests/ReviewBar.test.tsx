import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewBar } from '../ReviewBar';

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

describe('ReviewBar', () => {
  it('renders score summary', () => {
    render(<ReviewBar {...defaultProps} />);
    expect(screen.getByText('8/10 (80%)')).toBeInTheDocument();
  });

  it('renders elapsed time', () => {
    render(<ReviewBar {...defaultProps} />);
    expect(screen.getByText('02:05')).toBeInTheDocument();
  });

  it('renders "Try again" button', () => {
    render(<ReviewBar {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('clicking "Try again" calls onRetry', async () => {
    const onRetry = jest.fn();
    render(<ReviewBar {...defaultProps} onRetry={onRetry} />);

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
