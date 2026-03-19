import type { Meta, StoryObj } from '@storybook/react';
import type { QuizDataRow } from '@/quiz-definitions/QuizDataRow';
import type { GridElement } from '@/visualizations/periodic-table/GridElement';
import type { ToggleDefinition } from '../ToggleDefinition';
import { PeriodicTableRenderer } from '@/visualizations/periodic-table/PeriodicTableRenderer';
import { useFreeRecallSession } from './useFreeRecallSession';
import { FreeRecallMode } from './FreeRecallMode';

// First 10 elements of the periodic table, laid out in a 2-row grid
const sampleElements: ReadonlyArray<GridElement> = [
  { id: 'H', label: 'Hydrogen', symbol: 'H', atomicNumber: 1, row: 0, column: 0, viewBoxCenter: { x: 30, y: 30 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 60, maxY: 60 }, interactive: true, group: 'nonmetal' },
  { id: 'He', label: 'Helium', symbol: 'He', atomicNumber: 2, row: 0, column: 1, viewBoxCenter: { x: 94, y: 30 }, viewBoxBounds: { minX: 64, minY: 0, maxX: 124, maxY: 60 }, interactive: true, group: 'noble-gas' },
  { id: 'Li', label: 'Lithium', symbol: 'Li', atomicNumber: 3, row: 1, column: 0, viewBoxCenter: { x: 30, y: 94 }, viewBoxBounds: { minX: 0, minY: 64, maxX: 60, maxY: 124 }, interactive: true, group: 'alkali-metal' },
  { id: 'Be', label: 'Beryllium', symbol: 'Be', atomicNumber: 4, row: 1, column: 1, viewBoxCenter: { x: 94, y: 94 }, viewBoxBounds: { minX: 64, minY: 64, maxX: 124, maxY: 124 }, interactive: true, group: 'alkaline-earth' },
  { id: 'B', label: 'Boron', symbol: 'B', atomicNumber: 5, row: 1, column: 2, viewBoxCenter: { x: 158, y: 94 }, viewBoxBounds: { minX: 128, minY: 64, maxX: 188, maxY: 124 }, interactive: true, group: 'metalloid' },
  { id: 'C', label: 'Carbon', symbol: 'C', atomicNumber: 6, row: 1, column: 3, viewBoxCenter: { x: 222, y: 94 }, viewBoxBounds: { minX: 192, minY: 64, maxX: 252, maxY: 124 }, interactive: true, group: 'nonmetal' },
  { id: 'N', label: 'Nitrogen', symbol: 'N', atomicNumber: 7, row: 1, column: 4, viewBoxCenter: { x: 286, y: 94 }, viewBoxBounds: { minX: 256, minY: 64, maxX: 316, maxY: 124 }, interactive: true, group: 'nonmetal' },
  { id: 'O', label: 'Oxygen', symbol: 'O', atomicNumber: 8, row: 1, column: 5, viewBoxCenter: { x: 350, y: 94 }, viewBoxBounds: { minX: 320, minY: 64, maxX: 380, maxY: 124 }, interactive: true, group: 'nonmetal' },
  { id: 'F', label: 'Fluorine', symbol: 'F', atomicNumber: 9, row: 1, column: 6, viewBoxCenter: { x: 414, y: 94 }, viewBoxBounds: { minX: 384, minY: 64, maxX: 444, maxY: 124 }, interactive: true, group: 'halogen' },
  { id: 'Ne', label: 'Neon', symbol: 'Ne', atomicNumber: 10, row: 1, column: 7, viewBoxCenter: { x: 478, y: 94 }, viewBoxBounds: { minX: 448, minY: 64, maxX: 508, maxY: 124 }, interactive: true, group: 'noble-gas' },
];

const sampleDataRows: ReadonlyArray<QuizDataRow> = [
  { id: 'H', name: 'Hydrogen', symbol: 'H' },
  { id: 'He', name: 'Helium', symbol: 'He' },
  { id: 'Li', name: 'Lithium', symbol: 'Li' },
  { id: 'Be', name: 'Beryllium', symbol: 'Be' },
  { id: 'B', name: 'Boron', symbol: 'B' },
  { id: 'C', name: 'Carbon', symbol: 'C' },
  { id: 'N', name: 'Nitrogen', symbol: 'N' },
  { id: 'O', name: 'Oxygen', symbol: 'O' },
  { id: 'F', name: 'Fluorine', symbol: 'F' },
  { id: 'Ne', name: 'Neon', symbol: 'Ne' },
];

const toggleDefinitions: ReadonlyArray<ToggleDefinition> = [
  { key: 'showSymbols', label: 'Element symbols', defaultValue: true, group: 'display', hiddenBehavior: 'on-reveal' },
];

function noop() {}
function noopPosition() {}
function noopChoice() {}

function FreeRecallWithVisualization() {
  const { session, elementToggles, handleTextAnswer, handleGiveUp } = useFreeRecallSession({
    elements: sampleElements,
    dataRows: sampleDataRows,
    answerColumn: 'name',
    toggleDefinitions,
    toggleValues: { showSymbols: false },
  });

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'var(--font-family)' }}>
      <h2 style={{ color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
        First 10 Elements
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem', fontSize: 'var(--font-size-sm)' }}>
        Type element names. Symbols appear as you answer correctly.
      </p>

      <div style={{ marginBottom: '1rem', height: 200 }}>
        <PeriodicTableRenderer
          elements={sampleElements}
          elementStates={session.elementStates}
          toggles={session.toggles}
          elementToggles={elementToggles}

        />
      </div>

      <FreeRecallMode
        elements={sampleElements}
        dataRows={sampleDataRows}
        columnMappings={{ answer: 'name' }}
        toggleDefinitions={toggleDefinitions}
        session={session}
        onTextAnswer={handleTextAnswer}
        onElementSelect={noop}
        onPositionSelect={noopPosition}
        onChoiceSelect={noopChoice}
        onHintRequest={noop}
        onSkip={noop}
        onGiveUp={handleGiveUp}
      />
    </div>
  );
}

const meta: Meta = {
  title: 'Quiz Modes/FreeRecallMode',
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => <FreeRecallWithVisualization />,
};
