import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimelineRenderer } from '../TimelineRenderer';
import { buildTimelineElements } from '../buildTimelineElements';
import type { VisualizationRendererProps } from '../../VisualizationRendererProps';

// Mock ResizeObserver for jsdom
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

function makeProps(overrides?: Partial<VisualizationRendererProps>): VisualizationRendererProps {
  const elements = buildTimelineElements([
    {
      id: 'long-bar',
      label: 'Long Event',
      start: [1900],
      end: [1950],
      category: 'history',
    },
    {
      id: 'point',
      label: 'Point Event',
      start: [1969, 7, 20],
      category: 'science',
    },
  ]);

  return {
    elements,
    elementStates: {},
    toggles: {},
    ...overrides,
  };
}

describe('TimelineRenderer', () => {
  it('renders bars for each element', () => {
    render(<TimelineRenderer {...makeProps()} />);
    // Both events should have labels rendered (Long Event inside bar, Point Event outside)
    expect(screen.getByText('Long Event')).toBeInTheDocument();
    expect(screen.getByText('Point Event')).toBeInTheDocument();
  });

  it('renders labels for bars', () => {
    render(<TimelineRenderer {...makeProps()} />);
    expect(screen.getByText('Point Event')).toBeInTheDocument();
  });

  it('calls onElementClick when a bar is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    render(<TimelineRenderer {...makeProps({ onElementClick: handleClick })} />);

    await user.click(screen.getByText('Point Event'));
    expect(handleClick).toHaveBeenCalledWith('point');
  });

  it('renders with element states', () => {
    const props = makeProps({
      elementStates: { 'long-bar': 'correct', point: 'incorrect' },
    });
    const { container } = render(<TimelineRenderer {...props} />);
    expect(container).toBeInTheDocument();
  });

  it('renders with empty elements', () => {
    const props: VisualizationRendererProps = {
      elements: [],
      elementStates: {},
      toggles: {},
    };
    const { container } = render(<TimelineRenderer {...props} />);
    expect(container).toBeInTheDocument();
  });

  it('renders axis tick labels', () => {
    render(<TimelineRenderer {...makeProps()} />);
    const textElements = screen.getAllByText(/^\d{4}$/);
    expect(textElements.length).toBeGreaterThan(0);
  });
});
