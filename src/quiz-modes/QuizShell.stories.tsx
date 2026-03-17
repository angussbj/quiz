import type { Meta, StoryObj } from '@storybook/react';
import type { ToggleDefinition, TogglePreset } from './ToggleDefinition';
import { QuizShell } from './QuizShell';

const sampleToggles: ReadonlyArray<ToggleDefinition> = [
  { key: 'show-labels', label: 'Show country labels', defaultValue: true, group: 'display' },
  { key: 'show-borders', label: 'Show borders', defaultValue: true, group: 'display' },
  { key: 'show-flags', label: 'Show flags', defaultValue: false, group: 'display' },
  { key: 'accept-misspellings', label: 'Accept misspellings', defaultValue: true, group: 'difficulty' },
];

const samplePresets: ReadonlyArray<TogglePreset> = [
  {
    name: 'easy',
    label: 'Easy',
    values: { 'show-labels': true, 'show-borders': true, 'show-flags': true, 'accept-misspellings': true },
  },
  {
    name: 'hard',
    label: 'Hard',
    values: { 'show-labels': false, 'show-borders': false, 'show-flags': false, 'accept-misspellings': false },
  },
];

function QuizPlaceholder({ toggleValues }: { readonly toggleValues: Readonly<Record<string, boolean>> }) {
  return (
    <div style={{ padding: '2rem', fontFamily: 'var(--font-family)' }}>
      <h2 style={{ color: 'var(--color-text-primary)' }}>Quiz Active</h2>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        This is where the visualization and quiz input would appear.
      </p>
      <h3 style={{ color: 'var(--color-text-primary)', marginTop: '1rem' }}>Active toggles:</h3>
      <ul style={{ color: 'var(--color-text-secondary)' }}>
        {Object.entries(toggleValues).map(([key, value]) => (
          <li key={key}>{key}: {String(value)}</li>
        ))}
      </ul>
    </div>
  );
}

const meta: Meta<typeof QuizShell> = {
  title: 'Quiz Modes/QuizShell',
  component: QuizShell,
};

export default meta;

type Story = StoryObj<typeof QuizShell>;

export const Default: Story = {
  render: () => (
    <QuizShell
      title="European Capitals"
      description="Name the capital cities of Europe."
      toggles={sampleToggles}
      presets={samplePresets}
    >
      {(toggleValues) => <QuizPlaceholder toggleValues={toggleValues} />}
    </QuizShell>
  ),
};
