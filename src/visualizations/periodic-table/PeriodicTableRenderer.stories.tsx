import type { Meta, StoryObj } from '@storybook/react';
import { PeriodicTableRenderer } from './PeriodicTableRenderer';
import type { GridElement } from './GridElement';
import type { ElementVisualState } from '../VisualizationElement';

/**
 * Sample periodic table elements (first 20 + some heavier ones)
 * positioned in standard periodic table layout.
 */
function makeSampleElements(): ReadonlyArray<GridElement> {
  const elements: Array<GridElement> = [
    // Period 1
    { id: 'H', label: 'Hydrogen', symbol: 'H', atomicNumber: 1, row: 0, column: 0, group: 'nonmetal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'He', label: 'Helium', symbol: 'He', atomicNumber: 2, row: 0, column: 17, group: 'noble-gas', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    // Period 2
    { id: 'Li', label: 'Lithium', symbol: 'Li', atomicNumber: 3, row: 1, column: 0, group: 'alkali-metal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Be', label: 'Beryllium', symbol: 'Be', atomicNumber: 4, row: 1, column: 1, group: 'alkaline-earth', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'B', label: 'Boron', symbol: 'B', atomicNumber: 5, row: 1, column: 12, group: 'metalloid', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'C', label: 'Carbon', symbol: 'C', atomicNumber: 6, row: 1, column: 13, group: 'nonmetal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'N', label: 'Nitrogen', symbol: 'N', atomicNumber: 7, row: 1, column: 14, group: 'nonmetal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'O', label: 'Oxygen', symbol: 'O', atomicNumber: 8, row: 1, column: 15, group: 'nonmetal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'F', label: 'Fluorine', symbol: 'F', atomicNumber: 9, row: 1, column: 16, group: 'halogen', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Ne', label: 'Neon', symbol: 'Ne', atomicNumber: 10, row: 1, column: 17, group: 'noble-gas', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    // Period 3
    { id: 'Na', label: 'Sodium', symbol: 'Na', atomicNumber: 11, row: 2, column: 0, group: 'alkali-metal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Mg', label: 'Magnesium', symbol: 'Mg', atomicNumber: 12, row: 2, column: 1, group: 'alkaline-earth', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Al', label: 'Aluminium', symbol: 'Al', atomicNumber: 13, row: 2, column: 12, group: 'post-transition', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Si', label: 'Silicon', symbol: 'Si', atomicNumber: 14, row: 2, column: 13, group: 'metalloid', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'P', label: 'Phosphorus', symbol: 'P', atomicNumber: 15, row: 2, column: 14, group: 'nonmetal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'S', label: 'Sulfur', symbol: 'S', atomicNumber: 16, row: 2, column: 15, group: 'nonmetal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Cl', label: 'Chlorine', symbol: 'Cl', atomicNumber: 17, row: 2, column: 16, group: 'halogen', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Ar', label: 'Argon', symbol: 'Ar', atomicNumber: 18, row: 2, column: 17, group: 'noble-gas', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    // Period 4 (first few + transition metals)
    { id: 'K', label: 'Potassium', symbol: 'K', atomicNumber: 19, row: 3, column: 0, group: 'alkali-metal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Ca', label: 'Calcium', symbol: 'Ca', atomicNumber: 20, row: 3, column: 1, group: 'alkaline-earth', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Fe', label: 'Iron', symbol: 'Fe', atomicNumber: 26, row: 3, column: 7, group: 'transition-metal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Cu', label: 'Copper', symbol: 'Cu', atomicNumber: 29, row: 3, column: 10, group: 'transition-metal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Zn', label: 'Zinc', symbol: 'Zn', atomicNumber: 30, row: 3, column: 11, group: 'transition-metal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Au', label: 'Gold', symbol: 'Au', atomicNumber: 79, row: 5, column: 10, group: 'transition-metal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
  ];
  return elements;
}

function makeStates(
  elements: ReadonlyArray<GridElement>,
  state: ElementVisualState,
): Record<string, ElementVisualState> {
  const states: Record<string, ElementVisualState> = {};
  for (const el of elements) {
    states[el.id] = state;
  }
  return states;
}

function makeMixedStates(
  elements: ReadonlyArray<GridElement>,
): Record<string, ElementVisualState> {
  const states: Record<string, ElementVisualState> = {};
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (i < 5) states[el.id] = 'correct';
    else if (i < 10) states[el.id] = 'context';
    else if (i === 10) states[el.id] = 'incorrect';
    else if (i === 11) states[el.id] = 'highlighted';
    else states[el.id] = 'hidden';
  }
  return states;
}

const sampleElements = makeSampleElements();

const meta: Meta<typeof PeriodicTableRenderer> = {
  title: 'Visualizations/PeriodicTableRenderer',
  component: PeriodicTableRenderer,
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

type Story = StoryObj<typeof PeriodicTableRenderer>;

export const AllRevealed: Story = {
  args: {
    elements: sampleElements,
    elementStates: makeStates(sampleElements, 'context'),
    toggles: { showGroups: true },
  },
};

export const AllHidden: Story = {
  args: {
    elements: sampleElements,
    elementStates: makeStates(sampleElements, 'hidden'),
    toggles: {},
  },
};

export const MixedStates: Story = {
  args: {
    elements: sampleElements,
    elementStates: makeMixedStates(sampleElements),
    toggles: { showGroups: true },
  },
};

export const Highlighted: Story = {
  args: {
    elements: sampleElements,
    elementStates: { ...makeStates(sampleElements, 'hidden'), Fe: 'highlighted' },
    toggles: { showGroups: true },
  },
};

export const NoGroupColors: Story = {
  args: {
    elements: sampleElements,
    elementStates: makeStates(sampleElements, 'context'),
    toggles: { showGroups: false },
  },
};
