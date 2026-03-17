import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ToggleDefinition, TogglePreset } from '../ToggleDefinition';
import { QuizShell } from '../QuizShell';

const toggles: ReadonlyArray<ToggleDefinition> = [
  { key: 'show-labels', label: 'Show labels', defaultValue: true, group: 'display' },
  { key: 'show-flags', label: 'Show flags', defaultValue: false, group: 'display' },
];

const presets: ReadonlyArray<TogglePreset> = [
  { name: 'easy', label: 'Easy', values: { 'show-labels': true, 'show-flags': true } },
];

function renderShell() {
  const childFn = jest.fn((toggleValues: Readonly<Record<string, boolean>>) => (
    <div data-testid="quiz-content">
      Labels: {String(toggleValues['show-labels'])}, Flags: {String(toggleValues['show-flags'])}
    </div>
  ));

  render(
    <QuizShell
      title="Test Quiz"
      description="A test quiz"
      toggles={toggles}
      presets={presets}
    >
      {childFn}
    </QuizShell>,
  );

  return { childFn };
}

describe('QuizShell', () => {
  it('shows config screen initially', () => {
    renderShell();
    expect(screen.getByRole('heading', { name: 'Test Quiz' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Quiz' })).toBeInTheDocument();
    expect(screen.queryByTestId('quiz-content')).not.toBeInTheDocument();
  });

  it('transitions to quiz on start', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: 'Start Quiz' }));

    expect(screen.queryByRole('heading', { name: 'Test Quiz' })).not.toBeInTheDocument();
    expect(screen.getByTestId('quiz-content')).toBeInTheDocument();
  });

  it('passes toggle values to children', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: 'Start Quiz' }));

    expect(screen.getByTestId('quiz-content')).toHaveTextContent('Labels: true');
    expect(screen.getByTestId('quiz-content')).toHaveTextContent('Flags: false');
  });

  it('passes preset-modified values to children', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: 'Easy' }));
    await user.click(screen.getByRole('button', { name: 'Start Quiz' }));

    expect(screen.getByTestId('quiz-content')).toHaveTextContent('Flags: true');
  });

  it('returns to config screen on reconfigure', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: 'Start Quiz' }));
    await user.click(screen.getByRole('button', { name: 'Reconfigure' }));

    expect(screen.getByRole('heading', { name: 'Test Quiz' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Quiz' })).toBeInTheDocument();
  });

  it('remounts children after reconfigure (new quiz key)', async () => {
    const user = userEvent.setup();
    const { childFn } = renderShell();

    await user.click(screen.getByRole('button', { name: 'Start Quiz' }));
    const firstCallCount = childFn.mock.calls.length;

    await user.click(screen.getByRole('button', { name: 'Reconfigure' }));
    await user.click(screen.getByRole('button', { name: 'Start Quiz' }));

    expect(childFn.mock.calls.length).toBeGreaterThan(firstCallCount);
  });

  it('preserves toggle values after reconfigure', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: 'Easy' }));
    await user.click(screen.getByRole('button', { name: 'Start Quiz' }));
    await user.click(screen.getByRole('button', { name: 'Reconfigure' }));

    const flagsSwitch = screen.getAllByRole('switch')[1];
    expect(flagsSwitch).toHaveAttribute('aria-checked', 'true');
  });
});
