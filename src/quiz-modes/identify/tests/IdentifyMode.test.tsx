import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { VisualizationElement } from '@/visualizations/VisualizationElement';
import type { QuizSessionState } from '../../QuizSessionState';
import type { ViewBoxPosition } from '@/visualizations/VisualizationElement';
import { IdentifyMode } from '../IdentifyMode';

function makeElements(count: number): ReadonlyArray<VisualizationElement> {
  return Array.from({ length: count }, (_, i) => ({
    id: `el-${i}`,
    label: `City ${i}`,
    viewBoxCenter: { x: i * 100, y: 0 },
    viewBoxBounds: { minX: i * 100 - 10, minY: -10, maxX: i * 100 + 10, maxY: 10 },
    interactive: true,
  }));
}

const emptySession: QuizSessionState = {
  toggles: {},
  elementStates: {},
  remainingElementIds: [],
  correctElementIds: [],
  incorrectElementIds: [],
  status: 'active',
  elapsedMs: 0,
  score: { correct: 0, total: 0, percentage: 0 },
};

function renderIdentifyMode(elementCount = 3) {
  const elements = makeElements(elementCount);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderViz = jest.fn((_props: any) => <div data-testid="visualization" />);

  const props = {
    elements,
    session: emptySession,
    onTextAnswer: jest.fn(),
    onElementSelect: jest.fn(),
    onPositionSelect: jest.fn((_pos: ViewBoxPosition) => {}),
    onChoiceSelect: jest.fn(),
    onHintRequest: jest.fn(),
    onSkip: jest.fn(),
    onGiveUp: jest.fn(),
    renderVisualization: renderViz,
  };

  render(<IdentifyMode {...props} />);

  return { ...props, renderViz };
}

describe('IdentifyMode', () => {
  it('renders prompt with element label', () => {
    renderIdentifyMode();
    expect(screen.getByText(/Click on/)).toBeInTheDocument();
    expect(screen.getByText(/City \d/)).toBeInTheDocument();
  });

  it('shows progress counter', () => {
    renderIdentifyMode(5);
    expect(screen.getByText('0/5')).toBeInTheDocument();
  });

  it('renders skip and give up buttons', () => {
    renderIdentifyMode();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Give up' })).toBeInTheDocument();
  });

  it('renders visualization area', () => {
    renderIdentifyMode();
    expect(screen.getByTestId('visualization')).toBeInTheDocument();
  });

  it('passes elementStates and onElementClick to visualization', () => {
    const { renderViz } = renderIdentifyMode();
    expect(renderViz).toHaveBeenCalled();
    const vizProps = renderViz.mock.calls[0][0];
    expect(vizProps.elementStates).toBeDefined();
    expect(typeof vizProps.onElementClick).toBe('function');
  });

  it('calls onSkip when skip clicked', async () => {
    const user = userEvent.setup();
    const { onSkip } = renderIdentifyMode();

    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onSkip).toHaveBeenCalled();
  });

  it('calls onGiveUp when give up clicked', async () => {
    const user = userEvent.setup();
    const { onGiveUp } = renderIdentifyMode();

    await user.click(screen.getByRole('button', { name: 'Give up' }));
    expect(onGiveUp).toHaveBeenCalled();
  });

  it('shows finished state after give up', async () => {
    const user = userEvent.setup();
    renderIdentifyMode(3);

    await user.click(screen.getByRole('button', { name: 'Give up' }));

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText(/0 of 3 correct/)).toBeInTheDocument();
  });

  it('passes toggles and elementToggles to visualization', () => {
    const elements = makeElements(2);
    const toggleDefs = [
      { key: 'showDots', label: 'Dots', defaultValue: true, group: 'display', hiddenBehavior: 'on-reveal' as const },
    ];
    const toggleValues = { showDots: false };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderViz = jest.fn((_props: any) => <div data-testid="visualization" />);

    render(
      <IdentifyMode
        elements={elements}
        session={emptySession}
        onTextAnswer={jest.fn()}
        onElementSelect={jest.fn()}
        onPositionSelect={jest.fn()}
        onChoiceSelect={jest.fn()}
        onHintRequest={jest.fn()}
        onSkip={jest.fn()}
        onGiveUp={jest.fn()}
        toggleDefinitions={toggleDefs}
        toggleValues={toggleValues}
        renderVisualization={renderViz}
      />,
    );

    const vizProps = renderViz.mock.calls[0][0];
    expect(vizProps.toggles).toEqual({ showDots: false });
    expect(vizProps.elementToggles).toBeDefined();
  });
});
