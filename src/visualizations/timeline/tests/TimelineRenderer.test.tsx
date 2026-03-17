import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimelineRenderer } from '../TimelineRenderer';
import { buildTimelineElements } from '../buildTimelineElements';
import type { VisualizationRendererProps } from '../../VisualizationRendererProps';

jest.mock('../../ZoomPanContainer', () => ({
  ZoomPanContainer: ({ children }: { children: React.ReactNode }) => (
    <svg data-testid="zoom-pan-container">{children}</svg>
  ),
}));

jest.mock('../../ZoomPanContext', () => ({
  useZoomPan: () => ({
    scale: 1,
    clusteredElementIds: new Set<string>(),
  }),
  ZoomPanContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

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
    const { container } = render(<TimelineRenderer {...makeProps()} />);
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(2);
  });

  it('renders labels for bars', () => {
    render(<TimelineRenderer {...makeProps()} />);
    // Point event gets outside label (full text)
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
    expect(container.querySelector('rect')).toBeInTheDocument();
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
