import type { Meta, StoryObj } from '@storybook/react';
import { Anatomy3DRenderer } from './Anatomy3DRenderer';
import type { Anatomy3DElement } from './Anatomy3DElement';
import type { ElementVisualState } from '../VisualizationElement';

const BONES = [
  ['frontal-bone', 'Frontal bone', 'Frontal bone', 'midline', 0, 165, 5],
  ['parietal-bone-right', 'Parietal bone', 'Parietal bone right', 'right', -3.5, 165, -3],
  ['occipital-bone', 'Occipital bone', 'Occipital bone', 'midline', 0, 160, -5],
  ['ethmoid-bone', 'Ethmoid bone', 'Ethmoid Bone', 'midline', 0, 159, 6],
  ['sphenoid-bone', 'Sphenoid bone', 'Sphenoid bone', 'midline', 0, 158, 3],
  ['vomer', 'Vomer', 'Vomer', 'midline', 0, 157, 5],
  ['mandible', 'Mandible', 'Mandible bone', 'midline', 0, 154, 4],
  ['temporal-bone-right', 'Temporal bone', 'Temporal bone.r', 'right', -4, 159, 0],
] as const;

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

const elements: ReadonlyArray<Anatomy3DElement> = BONES.map(
  ([id, label, meshName, side, x, y, z]) => ({
    id,
    label,
    interactive: true,
    group: 'Skull',
    meshEntries: [{ meshName, side, directMesh: true }],
    preferredView: 'front',
    viewBoxCenter: { x, y, z },
    viewBoxBounds: { minX: x, minY: y, maxX: x, maxY: y },
  }),
);

const meta: Meta<typeof Anatomy3DRenderer> = {
  title: 'Visualizations/Anatomy3DRenderer',
  component: Anatomy3DRenderer,
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof Anatomy3DRenderer>;

export const AllStates: Story = {
  args: {
    elements,
    elementStates: Object.fromEntries(
      elements.map((element, index) => [element.id, STATES[index]]),
    ),
    toggles: {},
  },
};
