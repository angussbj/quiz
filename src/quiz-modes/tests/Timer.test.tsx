import { render, screen, act } from '@testing-library/react';
import { Timer, formatTime } from '../Timer';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('formatTime', () => {
  it('formats zero', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('formats seconds only', () => {
    expect(formatTime(5)).toBe('00:05');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(125)).toBe('02:05');
  });

  it('pads single-digit minutes', () => {
    expect(formatTime(60)).toBe('01:00');
  });

  it('handles large values', () => {
    expect(formatTime(3661)).toBe('61:01');
  });
});

describe('Timer — elapsed mode', () => {
  it('starts at 00:00', () => {
    render(<Timer />);
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });

  it('counts up each second', () => {
    render(<Timer />);
    act(() => jest.advanceTimersByTime(3000));
    expect(screen.getByText('00:03')).toBeInTheDocument();
  });

  it('pauses when paused prop is true', () => {
    const { rerender } = render(<Timer />);
    act(() => jest.advanceTimersByTime(2000));
    expect(screen.getByText('00:02')).toBeInTheDocument();

    rerender(<Timer paused />);
    act(() => jest.advanceTimersByTime(5000));
    expect(screen.getByText('00:02')).toBeInTheDocument();
  });

  it('resumes after unpausing', () => {
    const { rerender } = render(<Timer />);
    act(() => jest.advanceTimersByTime(2000));

    rerender(<Timer paused />);
    act(() => jest.advanceTimersByTime(5000));

    rerender(<Timer paused={false} />);
    act(() => jest.advanceTimersByTime(3000));
    expect(screen.getByText('00:05')).toBeInTheDocument();
  });
});

describe('Timer — countdown mode', () => {
  it('starts at the countdown value', () => {
    render(<Timer countdownSeconds={90} />);
    expect(screen.getByText('01:30')).toBeInTheDocument();
  });

  it('counts down each second', () => {
    render(<Timer countdownSeconds={10} />);
    act(() => jest.advanceTimersByTime(3000));
    expect(screen.getByText('00:07')).toBeInTheDocument();
  });

  it('stops at zero and calls onExpire', () => {
    const onExpire = jest.fn();
    render(<Timer countdownSeconds={3} onExpire={onExpire} />);

    act(() => jest.advanceTimersByTime(3000));
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(onExpire).toHaveBeenCalledTimes(1);

    // Should not go negative or call again
    act(() => jest.advanceTimersByTime(2000));
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('marks as expired when countdown reaches zero', () => {
    render(<Timer countdownSeconds={2} />);
    const timerElement = screen.getByText('00:02').closest('[data-expired]');
    expect(timerElement).not.toBeInTheDocument();

    act(() => jest.advanceTimersByTime(2000));
    const expiredElement = screen.getByText('00:00').closest('[data-expired]');
    expect(expiredElement).toBeInTheDocument();
  });

  it('does not call onExpire when paused before reaching zero', () => {
    const onExpire = jest.fn();
    const { rerender } = render(
      <Timer countdownSeconds={5} onExpire={onExpire} />,
    );

    act(() => jest.advanceTimersByTime(3000));
    rerender(<Timer countdownSeconds={5} onExpire={onExpire} paused />);
    act(() => jest.advanceTimersByTime(10000));

    expect(onExpire).not.toHaveBeenCalled();
    expect(screen.getByText('00:02')).toBeInTheDocument();
  });
});
