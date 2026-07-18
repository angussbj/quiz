import type { Meta, StoryObj } from '@storybook/react';
import { TimelineRenderer } from './TimelineRenderer';
import { buildTimelineElements } from './buildTimelineElements';
import type { VisualizationRendererProps } from '../VisualizationRendererProps';

const meta: Meta<typeof TimelineRenderer> = {
  title: 'Visualizations/TimelineRenderer',
  component: TimelineRenderer,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-primary)' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof TimelineRenderer>;

const elements = buildTimelineElements([
  { id: 'correct', label: 'correct', start: [1400], end: [1550], category: 'A' },
  { id: 'correct-second', label: 'correct-second', start: [1550], end: [1700], category: 'A' },
  { id: 'correct-third', label: 'correct-third', start: [1700], end: [1800], category: 'A' },
  { id: 'incorrect', label: 'incorrect', start: [1400], end: [1600], category: 'B' },
  { id: 'missed', label: 'missed', start: [1600], end: [1800], category: 'B' },
  { id: 'highlighted', label: 'highlighted', start: [1400], end: [1600], category: 'C' },
  { id: 'context', label: 'context', start: [1600], end: [1800], category: 'C' },
  { id: 'default', label: 'default', start: [1400], end: [1800], category: 'D' },
]);

const defaultProps: VisualizationRendererProps = {
  elements,
  elementStates: {
    correct: 'correct',
    'correct-second': 'correct-second',
    'correct-third': 'correct-third',
    incorrect: 'incorrect',
    missed: 'missed',
    highlighted: 'highlighted',
    context: 'context',
    default: 'default',
  },
  toggles: {},
};

export const AllStates: Story = {
  args: defaultProps,
};
