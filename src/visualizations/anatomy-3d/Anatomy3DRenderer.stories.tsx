import type { Meta, StoryObj } from '@storybook/react';
import { Anatomy3DRenderer } from './Anatomy3DRenderer';
import type { Anatomy3DElement } from './Anatomy3DElement';
import type { ElementVisualState } from '../VisualizationElement';

const BONES = [
  ['frontal-bone', 'Frontal bone', 'Frontal bone', 'midline', 0, 165, 5],
  ['mandible', 'Mandible', 'Mandible bone', 'midline', 0, 154, 4],
  ['body-of-sternum', 'Body of sternum', 'Body of sternum', 'midline', 0, 130, 9],
  ['sacrum', 'Sacrum', 'Sacrum', 'midline', 0, 92, -5],
  ['clavicle-right', 'Clavicle', 'Clavicle.r', 'right', -8, 141, 0],
  ['humerus-right', 'Humerus', 'Humerus.r', 'right', -20, 125, -3],
  ['femur-right', 'Femur', 'Femur.r', 'right', -9, 66, -2],
  ['tibia-right', 'Tibia', 'Tibia.r', 'right', -8, 26, -3],
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
    group: y > 145 ? 'Skull' : y > 85 ? 'Torso' : 'Limbs',
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
