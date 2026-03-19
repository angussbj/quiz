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
      <div style={{ width: '100vw', height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof TimelineRenderer>;

const worldHistoryElements = buildTimelineElements([
  {
    id: 'renaissance',
    label: 'Renaissance',
    start: [1400],
    end: [1600],
    category: 'Culture',
  },
  {
    id: 'reformation',
    label: 'Protestant Reformation',
    start: [1517],
    end: [1648],
    category: 'Religion',
  },
  {
    id: 'exploration',
    label: 'Age of Exploration',
    start: [1400],
    end: [1600],
    category: 'Exploration',
  },
  {
    id: 'enlightenment',
    label: 'Enlightenment',
    start: [1685],
    end: [1815],
    category: 'Culture',
  },
  {
    id: 'industrial',
    label: 'Industrial Revolution',
    start: [1760],
    end: [1840],
    category: 'Technology',
  },
  {
    id: 'french-rev',
    label: 'French Revolution',
    start: [1789],
    end: [1799],
    category: 'Politics',
  },
  {
    id: 'napoleon',
    label: 'Napoleonic Wars',
    start: [1803],
    end: [1815],
    category: 'War',
  },
  {
    id: 'ww1',
    label: 'World War I',
    start: [1914, 7],
    end: [1918, 11],
    category: 'War',
  },
  {
    id: 'great-depression',
    label: 'Great Depression',
    start: [1929],
    end: [1939],
    category: 'Economics',
  },
  {
    id: 'ww2',
    label: 'World War II',
    start: [1939, 9],
    end: [1945, 9],
    category: 'War',
  },
  {
    id: 'cold-war',
    label: 'Cold War',
    start: [1947],
    end: [1991],
    category: 'Politics',
  },
  {
    id: 'moon-landing',
    label: 'Moon Landing',
    start: [1969, 7, 20],
    category: 'Technology',
  },
  {
    id: 'internet',
    label: 'World Wide Web',
    start: [1991],
    end: [2000],
    category: 'Technology',
  },
]);

const defaultProps: VisualizationRendererProps = {
  elements: worldHistoryElements,
  elementStates: {},
  toggles: {},
  onElementClick: (id) => console.log('Clicked:', id),
};

export const Default: Story = {
  args: defaultProps,
};

export const WithStates: Story = {
  args: {
    ...defaultProps,
    elementStates: {
      renaissance: 'correct',
      ww1: 'incorrect',
      'moon-landing': 'highlighted',
      'cold-war': 'context',
      napoleon: 'hidden',
    },
  },
};

const shortTimelineElements = buildTimelineElements([
  {
    id: 'd-day',
    label: 'D-Day',
    start: [1944, 6, 6],
    category: 'Battle',
  },
  {
    id: 'stalingrad',
    label: 'Battle of Stalingrad',
    start: [1942, 8, 23],
    end: [1943, 2, 2],
    category: 'Battle',
  },
  {
    id: 'pearl-harbor',
    label: 'Attack on Pearl Harbor',
    start: [1941, 12, 7],
    category: 'Battle',
  },
  {
    id: 'midway',
    label: 'Battle of Midway',
    start: [1942, 6, 4],
    end: [1942, 6, 7],
    category: 'Battle',
  },
  {
    id: 'bulge',
    label: 'Battle of the Bulge',
    start: [1944, 12, 16],
    end: [1945, 1, 25],
    category: 'Battle',
  },
  {
    id: 'v-e-day',
    label: 'V-E Day',
    start: [1945, 5, 8],
    category: 'Victory',
  },
  {
    id: 'v-j-day',
    label: 'V-J Day',
    start: [1945, 8, 15],
    category: 'Victory',
  },
]);

export const ShortTimeline: Story = {
  args: {
    elements: shortTimelineElements,
    elementStates: {},
    toggles: {},
  },
};

const manyCategories = buildTimelineElements(
  Array.from({ length: 12 }, (_, i) => ({
    id: `item-${i}`,
    label: `Category ${i + 1} Item`,
    start: [1900 + i * 10] as const,
    end: [1905 + i * 10] as const,
    category: `Category ${i + 1}`,
  })),
);

export const ManyCategories: Story = {
  args: {
    elements: manyCategories,
    elementStates: {},
    toggles: {},
  },
};
