import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimelineRenderer } from '../TimelineRenderer';
import { buildTimelineElements } from '../buildTimelineElements';
import type { VisualizationRendererProps } from '../../VisualizationRendererProps';

// Mock ZoomPanContainer to render children directly in an SVG
jest.mock('../../ZoomPanContainer', () => ({
  ZoomPanContainer: ({ children }: { children: React.ReactNode }) => (
    <svg data-testid="zoom-pan-container">{children}</svg>
  ),
}));

// Mock ZoomPanContext to provide default values
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
      id: 'renaissance',
      label: 'Renaissance',
      start: [1400],
      end: [1600],
      category: 'art',
    },
    {
      id: 'industrial',
      label: 'Industrial Revolution',
      start: [1760],
      end: [1840],
      category: 'history',
    },
    {
      id: 'moon',
      label: 'Moon Landing',
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
    // Check that SVG rects are rendered for the bars
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(3);
  });

  it('renders labels', () => {
    render(<TimelineRenderer {...makeProps()} />);
    // Long bars get inside labels
    expect(screen.getByText('Renaissance')).toBeInTheDocument();
    // Moon Landing is a point event — label renders outside
    expect(screen.getByText('Moon Landing')).toBeInTheDocument();
  });

  it('calls onElementClick when a bar is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    render(<TimelineRenderer {...makeProps({ onElementClick: handleClick })} />);

    await user.click(screen.getByText('Renaissance'));
    expect(handleClick).toHaveBeenCalledWith('renaissance');
  });

  it('renders with element states', () => {
    const props = makeProps({
      elementStates: { renaissance: 'correct', industrial: 'incorrect' },
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
    // Should have some year labels in the axis
    const textElements = screen.getAllByText(/^\d{4}$/);
    expect(textElements.length).toBeGreaterThan(0);
  });
});
