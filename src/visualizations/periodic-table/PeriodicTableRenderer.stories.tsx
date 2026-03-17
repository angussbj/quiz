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
    { id: 'H', label: 'Hydrogen', symbol: 'H', row: 0, column: 0, group: 'nonmetal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'He', label: 'Helium', symbol: 'He', row: 0, column: 17, group: 'noble-gas', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    // Period 2
    { id: 'Li', label: 'Lithium', symbol: 'Li', row: 1, column: 0, group: 'alkali-metal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Be', label: 'Beryllium', symbol: 'Be', row: 1, column: 1, group: 'alkaline-earth', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'B', label: 'Boron', symbol: 'B', row: 1, column: 12, group: 'metalloid', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'C', label: 'Carbon', symbol: 'C', row: 1, column: 13, group: 'nonmetal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'N', label: 'Nitrogen', symbol: 'N', row: 1, column: 14, group: 'nonmetal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'O', label: 'Oxygen', symbol: 'O', row: 1, column: 15, group: 'nonmetal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'F', label: 'Fluorine', symbol: 'F', row: 1, column: 16, group: 'halogen', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Ne', label: 'Neon', symbol: 'Ne', row: 1, column: 17, group: 'noble-gas', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    // Period 3
    { id: 'Na', label: 'Sodium', symbol: 'Na', row: 2, column: 0, group: 'alkali-metal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Mg', label: 'Magnesium', symbol: 'Mg', row: 2, column: 1, group: 'alkaline-earth', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Al', label: 'Aluminium', symbol: 'Al', row: 2, column: 12, group: 'post-transition', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Si', label: 'Silicon', symbol: 'Si', row: 2, column: 13, group: 'metalloid', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'P', label: 'Phosphorus', symbol: 'P', row: 2, column: 14, group: 'nonmetal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'S', label: 'Sulfur', symbol: 'S', row: 2, column: 15, group: 'nonmetal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Cl', label: 'Chlorine', symbol: 'Cl', row: 2, column: 16, group: 'halogen', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Ar', label: 'Argon', symbol: 'Ar', row: 2, column: 17, group: 'noble-gas', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    // Period 4 (first few + transition metals)
    { id: 'K', label: 'Potassium', symbol: 'K', row: 3, column: 0, group: 'alkali-metal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Ca', label: 'Calcium', symbol: 'Ca', row: 3, column: 1, group: 'alkaline-earth', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Fe', label: 'Iron', symbol: 'Fe', row: 3, column: 7, group: 'transition-metal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Cu', label: 'Copper', symbol: 'Cu', row: 3, column: 10, group: 'transition-metal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Zn', label: 'Zinc', symbol: 'Zn', row: 3, column: 11, group: 'transition-metal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    { id: 'Au', label: 'Gold', symbol: 'Au', row: 5, column: 10, group: 'transition-metal', interactive: true, viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
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
    else if (i < 10) states[el.id] = 'revealed';
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
    elementStates: makeStates(sampleElements, 'revealed'),
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

export const WithTarget: Story = {
  args: {
    elements: sampleElements,
    elementStates: makeMixedStates(sampleElements),
    toggles: { showGroups: true },
    targetElementId: 'Fe',
  },
};

export const NoGroupColors: Story = {
  args: {
    elements: sampleElements,
    elementStates: makeStates(sampleElements, 'revealed'),
    toggles: { showGroups: false },
  },
};
