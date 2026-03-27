import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { VisualizationRendererProps } from '@/visualizations/VisualizationRendererProps';
import type { VisualizationElement } from '@/visualizations/VisualizationElement';
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

/** Mock renderer that exposes element click buttons. */
function MockRenderer({ elements, onElementClick }: VisualizationRendererProps) {
  return (
    <div data-testid="visualization">
      {elements.map((el) => (
        <button key={el.id} onClick={() => onElementClick?.(el.id)}>
          {el.label}
        </button>
      ))}
    </div>
  );
}

function renderIdentifyMode(elementCount = 3) {
  const elements = makeElements(elementCount);
  render(
    <IdentifyMode
      elements={elements}
      dataRows={[]}
      columnMappings={{}}
      toggleDefinitions={[]}
      toggleValues={{}}
      Renderer={MockRenderer}
      onFinish={jest.fn()}
      onReconfigure={jest.fn()}
    />,
  );
  return { elements };
}

describe('IdentifyMode', () => {
  it('renders prompt with element label', () => {
    renderIdentifyMode();
    const prompt = screen.getByText(/Click on/);
    expect(prompt).toBeInTheDocument();
    expect(prompt).toHaveTextContent(/City \d/);
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

  it('does not highlight the current element in elementStates', () => {
    const elements = makeElements(3);
    let capturedStates: Readonly<Record<string, string>> = {};
    function CapturingRenderer(props: VisualizationRendererProps) {
      capturedStates = props.elementStates;
      return <div data-testid="visualization" />;
    }
    render(
      <IdentifyMode
        elements={elements}
        dataRows={[]}
        columnMappings={{}}
        toggleDefinitions={[]}
        toggleValues={{}}
        Renderer={CapturingRenderer}
        onFinish={jest.fn()}
        onReconfigure={jest.fn()}
      />,
    );
    const states = Object.values(capturedStates);
    expect(states).not.toContain('highlighted');
    expect(states.every((s) => s === 'default')).toBe(true);
  });

  it('clicking the correct element advances progress', async () => {
    const user = userEvent.setup();
    renderIdentifyMode(3);

    // Read the prompted label from "Click on <label>"
    const promptLabel = screen.getByText(/Click on/).querySelector('strong')?.textContent ?? '';

    await user.click(screen.getByRole('button', { name: promptLabel }));

    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('clicking a wrong element does not advance progress', async () => {
    const user = userEvent.setup();
    renderIdentifyMode(3);

    const promptLabel = screen.getByText(/Click on/).querySelector('strong')?.textContent ?? '';
    const wrongLabel = promptLabel === 'City 0' ? 'City 1' : 'City 0';

    await user.click(screen.getByRole('button', { name: wrongLabel }));

    expect(screen.getByText('0/3')).toBeInTheDocument();
  });

  it('skip advances progress', async () => {
    const user = userEvent.setup();
    renderIdentifyMode();

    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('shows finished state after give up', async () => {
    const user = userEvent.setup();
    renderIdentifyMode(3);

    await user.click(screen.getByRole('button', { name: 'Give up' }));

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText(/0 of 3 correct/)).toBeInTheDocument();
  });

  it('calls onFinish when quiz ends', async () => {
    const user = userEvent.setup();
    const onFinish = jest.fn();
    const elements = makeElements(3);
    render(
      <IdentifyMode
        elements={elements}
        dataRows={[]}
        columnMappings={{}}
        toggleDefinitions={[]}
        toggleValues={{}}
        Renderer={MockRenderer}
        onFinish={onFinish}
        onReconfigure={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Give up' }));

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('passes toggles and elementToggles to renderer', () => {
    const elements = makeElements(2);
    const toggleDefs = [
      { key: 'showDots', label: 'Dots', defaultValue: true, group: 'display', hiddenBehavior: 'on-reveal' as const },
    ];
    const toggleValues = { showDots: false };

    let capturedToggles: Readonly<Record<string, boolean>> | undefined;
    function CapturingRenderer(props: VisualizationRendererProps) {
      capturedToggles = props.toggles;
      return <div data-testid="visualization" />;
    }

    render(
      <IdentifyMode
        elements={elements}
        dataRows={[]}
        columnMappings={{}}
        toggleDefinitions={toggleDefs}
        toggleValues={toggleValues}
        Renderer={CapturingRenderer}
        onFinish={jest.fn()}
        onReconfigure={jest.fn()}
      />,
    );

    expect(capturedToggles).toEqual({ showDots: false });
  });

  it('does not pass onElementClick to renderer when reviewing', () => {
    const elements = makeElements(2);
    let capturedOnElementClick: ((id: string) => void) | undefined = jest.fn();

    function CapturingRenderer(props: VisualizationRendererProps) {
      capturedOnElementClick = props.onElementClick;
      return <div data-testid="visualization" />;
    }

    render(
      <IdentifyMode
        elements={elements}
        dataRows={[]}
        columnMappings={{}}
        toggleDefinitions={[]}
        toggleValues={{}}
        Renderer={CapturingRenderer}
        onFinish={jest.fn()}
        onReconfigure={jest.fn()}
        reviewing
      />,
    );

    expect(capturedOnElementClick).toBeUndefined();
  });
});
