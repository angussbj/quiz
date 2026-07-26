import type { Meta, StoryObj } from '@storybook/react';
import { FlagGridRenderer } from './FlagGridRenderer';
import type { FlagGridElement } from './FlagGridElement';
import type { ElementVisualState } from '../VisualizationElement';

const FLAGS: ReadonlyArray<readonly [string, string]> = [
  ['fr', 'France'],
  ['de', 'Germany'],
  ['es', 'Spain'],
  ['it', 'Italy'],
  ['pt', 'Portugal'],
  ['gb', 'United Kingdom'],
  ['ch', 'Switzerland'],
  ['be', 'Belgium'],
];

const STATES: ReadonlyArray<ElementVisualState> = [
  'correct',
  'correct-second',
  'correct-third',
  'incorrect',
  'missed',
  'highlighted',
  'context',
  'default',
];

const elements: ReadonlyArray<FlagGridElement> = FLAGS.map(([code, label], index) => ({
  id: code,
  label,
  group: 'Europe',
  interactive: true,
  row: Math.floor(index / 4),
  column: index % 4,
  flagUrl: `/flags/${code}.svg`,
  viewBoxCenter: { x: 0, y: 0 },
  viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
}));

const meta: Meta<typeof FlagGridRenderer> = {
  title: 'Visualizations/FlagGridRenderer',
  component: FlagGridRenderer,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-bg-primary)',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof FlagGridRenderer>;

export const AllStates: Story = {
  args: {
    elements,
    elementStates: Object.fromEntries(
      elements.map((element, index) => [element.id, STATES[index]]),
    ),
    toggles: { showCountryNames: true },
  },
};
