import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { VisualizationElement, ViewBoxPosition } from '@/visualizations/VisualizationElement';
import type { QuizSessionState } from '../../QuizSessionState';
import type { QuizModeProps } from '../../QuizModeProps';
import { FreeRecallMode } from '../FreeRecallMode';

function makeElement(id: string): VisualizationElement {
  return {
    id,
    label: id,
    viewBoxCenter: { x: 0, y: 0 },
    viewBoxBounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
    interactive: true,
  };
}

function makeSession(overrides: Partial<QuizSessionState> = {}): QuizSessionState {
  return {
    toggles: {},
    elementStates: {},
    remainingElementIds: ['paris', 'berlin', 'madrid'],
    correctElementIds: [],
    incorrectElementIds: [],
    status: 'active',
    elapsedMs: 0,
    score: { correct: 0, total: 3, percentage: 0 },
    ...overrides,
  };
}

function renderMode(overrides: Partial<QuizModeProps> = {}) {
  const noop = () => {};
  const noopPosition = (_pos: ViewBoxPosition) => {};
  const noopChoice = (_idx: number) => {};
  const props: QuizModeProps = {
    elements: [makeElement('paris'), makeElement('berlin'), makeElement('madrid')],
    dataRows: [],
    columnMappings: {},
    toggleDefinitions: [],
    session: makeSession(),
    onTextAnswer: jest.fn(),
    onElementSelect: noop,
    onPositionSelect: noopPosition,
    onChoiceSelect: noopChoice,
    onHintRequest: noop,
    onSkip: noop,
    onGiveUp: jest.fn(),
    ...overrides,
  };
  render(<FreeRecallMode {...props} />);
  return props;
}

describe('FreeRecallMode', () => {
  it('renders progress counter', () => {
    renderMode();
    expect(screen.getByText('0/3')).toBeInTheDocument();
  });

  it('renders text input with placeholder', () => {
    renderMode();
    expect(screen.getByPlaceholderText('Type an answer…')).toBeInTheDocument();
  });

  it('renders give up button', () => {
    renderMode();
    expect(screen.getByRole('button', { name: 'Give up' })).toBeInTheDocument();
  });

  it('calls onTextAnswer when user types', async () => {
    const user = userEvent.setup();
    const props = renderMode();

    await user.type(screen.getByPlaceholderText('Type an answer…'), 'Par');

    expect(props.onTextAnswer).toHaveBeenCalled();
  });

  it('calls onGiveUp when give up button is clicked', async () => {
    const user = userEvent.setup();
    const props = renderMode();

    await user.click(screen.getByRole('button', { name: 'Give up' }));

    expect(props.onGiveUp).toHaveBeenCalledTimes(1);
  });

  it('shows updated progress when session has correct answers', () => {
    renderMode({
      session: makeSession({
        correctElementIds: ['paris', 'berlin'],
        remainingElementIds: ['madrid'],
        score: { correct: 2, total: 3, percentage: 67 },
      }),
    });
    expect(screen.getByText('2/3')).toBeInTheDocument();
  });

  it('hides input when quiz is finished', () => {
    renderMode({
      session: makeSession({
        status: 'finished',
        correctElementIds: ['paris', 'berlin', 'madrid'],
        remainingElementIds: [],
      }),
    });
    expect(screen.queryByPlaceholderText('Type an answer…')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Give up' })).not.toBeInTheDocument();
  });

  it('shows perfect message when all answered', () => {
    renderMode({
      session: makeSession({
        status: 'finished',
        correctElementIds: ['paris', 'berlin', 'madrid'],
        remainingElementIds: [],
        score: { correct: 3, total: 3, percentage: 100 },
      }),
    });
    expect(screen.getByText(/Perfect/)).toBeInTheDocument();
  });

  it('shows score when finished by give up', () => {
    renderMode({
      session: makeSession({
        status: 'finished',
        correctElementIds: ['paris'],
        remainingElementIds: ['berlin', 'madrid'],
        score: { correct: 1, total: 3, percentage: 33 },
      }),
    });
    expect(screen.getAllByText('1/3')).toHaveLength(2); // progress bar + finished message
    expect(screen.getByText(/answered/)).toBeInTheDocument();
  });

  it('shows display answer from session.lastMatchedAnswer', () => {
    renderMode({
      session: makeSession({
        correctElementIds: ['bucharest'],
        remainingElementIds: ['berlin', 'madrid'],
        lastMatchedElementId: 'bucharest',
        lastMatchedAnswer: 'București',
      }),
    });
    expect(screen.getByText(/București/)).toBeInTheDocument();
  });

  it('clears input on Escape key', async () => {
    const user = userEvent.setup();
    renderMode();

    const input = screen.getByPlaceholderText('Type an answer…');
    await user.type(input, 'Par');
    await user.keyboard('{Escape}');

    expect(input).toHaveValue('');
  });
});
