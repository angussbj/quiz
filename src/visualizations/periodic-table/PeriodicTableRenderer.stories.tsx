import type { Meta, StoryObj } from '@storybook/react';
import { PeriodicTableRenderer } from './PeriodicTableRenderer';
import type { GridElement } from './GridElement';
import { CELL_SIZE, CELL_STEP } from './cellLayout';

function makeElement(
  id: string, label: string, symbol: string, atomicNumber: number,
  row: number, column: number, group: string, atomicWeight: string,
  trueRow?: number, trueColumn?: number,
): GridElement {
  const x = column * CELL_STEP;
  const y = row * CELL_STEP;
  return {
    id, label, symbol, atomicNumber, row, column, group, interactive: true,
    trueRow: trueRow ?? row, trueColumn: trueColumn ?? column, atomicWeight,
    viewBoxCenter: { x: x + CELL_SIZE / 2, y: y + CELL_SIZE / 2 },
    viewBoxBounds: { minX: x, minY: y, maxX: x + CELL_SIZE, maxY: y + CELL_SIZE },
  };
}

function makeSampleElements(): ReadonlyArray<GridElement> {
  return [
    makeElement('H', 'correct', 'H', 1, 0, 0, 'nonmetal', '1.008'),
    makeElement('He', 'context', 'He', 2, 0, 17, 'noble-gas', '4.003'),
    makeElement('Li', 'correct-second', 'Li', 3, 1, 0, 'alkali-metal', '6.941'),
    makeElement('Be', 'correct-third', 'Be', 4, 1, 1, 'alkaline-earth', '9.012'),
    makeElement('B', 'incorrect', 'B', 5, 1, 12, 'metalloid', '10.81'),
    makeElement('C', 'missed', 'C', 6, 1, 13, 'nonmetal', '12.01'),
    makeElement('N', 'highlighted', 'N', 7, 1, 14, 'nonmetal', '14.01'),
    makeElement('O', 'default', 'O', 8, 1, 15, 'nonmetal', '16.00'),
  ];
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
      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-primary)' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof PeriodicTableRenderer>;

export const AllStates: Story = {
  args: {
    elements: sampleElements,
    elementStates: {
      H: 'correct',
      He: 'context',
      Li: 'correct-second',
      Be: 'correct-third',
      B: 'incorrect',
      C: 'missed',
      N: 'highlighted',
      O: 'default',
    },
    toggles: { showGroups: true },
  },
};
