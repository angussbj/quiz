import type { Meta, StoryObj } from '@storybook/react';
import type { VisualizationElement } from '@/visualizations/VisualizationElement';
import type { QuizDataRow } from '@/quiz-definitions/QuizDataRow';
import type { ToggleDefinition } from '../ToggleDefinition';
import { useFreeRecallSession } from './useFreeRecallSession';
import { FreeRecallMode } from './FreeRecallMode';

const sampleElements: ReadonlyArray<VisualizationElement> = [
  { id: 'paris', label: 'Paris', viewBoxCenter: { x: 100, y: 200 }, viewBoxBounds: { minX: 90, minY: 190, maxX: 110, maxY: 210 }, interactive: true },
  { id: 'berlin', label: 'Berlin', viewBoxCenter: { x: 300, y: 150 }, viewBoxBounds: { minX: 290, minY: 140, maxX: 310, maxY: 160 }, interactive: true },
  { id: 'madrid', label: 'Madrid', viewBoxCenter: { x: 50, y: 350 }, viewBoxBounds: { minX: 40, minY: 340, maxX: 60, maxY: 360 }, interactive: true },
  { id: 'rome', label: 'Rome', viewBoxCenter: { x: 200, y: 300 }, viewBoxBounds: { minX: 190, minY: 290, maxX: 210, maxY: 310 }, interactive: true },
  { id: 'lisbon', label: 'Lisbon', viewBoxCenter: { x: 20, y: 320 }, viewBoxBounds: { minX: 10, minY: 310, maxX: 30, maxY: 330 }, interactive: true },
];

const sampleDataRows: ReadonlyArray<QuizDataRow> = [
  { id: 'paris', city: 'Paris', country: 'France' },
  { id: 'berlin', city: 'Berlin', country: 'Germany' },
  { id: 'madrid', city: 'Madrid', country: 'Spain' },
  { id: 'rome', city: 'Rome', country: 'Italy', city_alternates: 'Roma' },
  { id: 'lisbon', city: 'Lisbon', country: 'Portugal', city_alternates: 'Lisboa' },
];

const sampleToggleDefinitions: ReadonlyArray<ToggleDefinition> = [
  { key: 'showCityDots', label: 'City dots', defaultValue: true, group: 'display', hiddenBehavior: 'on-reveal' },
  { key: 'showCountryNames', label: 'Country names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' },
];

function noop() {}
function noopPosition() {}
function noopChoice() {}

function FreeRecallDemo() {
  const { session, handleTextAnswer, handleGiveUp } = useFreeRecallSession({
    elements: sampleElements,
    dataRows: sampleDataRows,
    answerColumn: 'city',
    toggleDefinitions: sampleToggleDefinitions,
    toggleValues: { showCityDots: false, showCountryNames: false },
  });

  return (
    <div style={{ maxWidth: 480, margin: '2rem auto', fontFamily: 'var(--font-family)' }}>
      <h2 style={{ color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
        European Capitals (Demo)
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem', fontSize: 'var(--font-size-sm)' }}>
        Type: Paris, Berlin, Madrid, Rome (or Roma), Lisbon (or Lisboa)
      </p>
      <FreeRecallMode
        elements={sampleElements}
        dataRows={sampleDataRows}
        columnMappings={{ answer: 'city' }}
        toggleDefinitions={sampleToggleDefinitions}
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
  render: () => <FreeRecallDemo />,
};
