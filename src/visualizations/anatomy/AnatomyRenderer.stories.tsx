import type { Meta, StoryObj } from '@storybook/react';
import { AnatomyRenderer } from './AnatomyRenderer';
import type { AnatomyElement } from './AnatomyElement';
import type { ElementVisualState } from '../VisualizationElement';

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

const elements: ReadonlyArray<AnatomyElement> = STATES.map((state, index) => {
  const column = index % 4;
  const row = Math.floor(index / 4);
  const x = column * 32;
  const y = row * 52;
  return {
    id: state,
    label: state,
    group: `Region ${column + 1}`,
    interactive: true,
    svgPathData: `M ${x + 8},${y + 4} C ${x + 25},${y + 5} ${x + 25},${y + 39} ${x + 8},${y + 42} C ${x},${y + 35} ${x},${y + 11} ${x + 8},${y + 4} Z`,
    viewBoxCenter: { x: x + 13, y: y + 23 },
    viewBoxBounds: { minX: x, minY: y, maxX: x + 26, maxY: y + 46 },
    labelPosition: {
      labelX: x + 13,
      labelY: y + 49,
      anchorX: x + 13,
      anchorY: y + 42,
    },
  };
});

const elementStates = Object.fromEntries(
  STATES.map((state) => [state, state]),
) as Readonly<Record<string, ElementVisualState>>;

const meta: Meta<typeof AnatomyRenderer> = {
  title: 'Visualizations/AnatomyRenderer',
  component: AnatomyRenderer,
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

type Story = StoryObj<typeof AnatomyRenderer>;

export const AllStates: Story = {
  args: {
    elements,
    elementStates,
    toggles: { showLabels: true },
    initialCameraPosition: { x: -8, y: -8, width: 130, height: 112 },
  },
};

export const PerElementColours: Story = {
  args: {
    elements,
    elementStates: Object.fromEntries(
      elements.map((element) => [element.id, 'default' as const]),
    ),
    toggles: { showLabels: true, showGroupColors: true },
    initialCameraPosition: { x: -8, y: -8, width: 130, height: 112 },
  },
};

export const GroupColours: Story = {
  args: {
    elements,
    elementStates: {},
    toggles: { showLabels: true, showGroupColors: false },
    initialCameraPosition: { x: -8, y: -8, width: 130, height: 112 },
  },
};
