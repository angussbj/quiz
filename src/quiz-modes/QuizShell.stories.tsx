import type { Meta, StoryObj } from '@storybook/react';
import type { ToggleDefinition, TogglePreset } from './ToggleDefinition';
import type { QuizConfig } from './QuizShell';
import { QuizShell } from './QuizShell';

const sampleToggles: ReadonlyArray<ToggleDefinition> = [
  { key: 'show-labels', label: 'Show country labels', defaultValue: true, group: 'display', hiddenBehavior: 'on-reveal' },
  { key: 'show-borders', label: 'Show borders', defaultValue: true, group: 'display', hiddenBehavior: 'never' },
  { key: 'show-flags', label: 'Show flags', defaultValue: false, group: 'display', hiddenBehavior: { hintAfter: 2 } },
  { key: 'accept-misspellings', label: 'Accept misspellings', defaultValue: true, group: 'difficulty', hiddenBehavior: 'never' },
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

function QuizPlaceholder({ config }: { readonly config: QuizConfig }) {
  return (
    <div style={{ padding: '2rem', fontFamily: 'var(--font-family)' }}>
      <h2 style={{ color: 'var(--color-text-primary)' }}>Quiz Active</h2>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        Mode: {config.selectedMode} | Countdown: {config.countdownSeconds ?? 'none'}s
      </p>
      <h3 style={{ color: 'var(--color-text-primary)', marginTop: '1rem' }}>Active toggles:</h3>
      <ul style={{ color: 'var(--color-text-secondary)' }}>
        {Object.entries(config.toggleValues).map(([key, value]) => (
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
      availableModes={['free-recall-unordered', 'identify', 'locate']}
      defaultMode="free-recall-unordered"
      toggles={sampleToggles}
      presets={samplePresets}
    >
      {(config) => <QuizPlaceholder config={config} />}
    </QuizShell>
  ),
};

export const WithCountdown: Story = {
  render: () => (
    <QuizShell
      title="Quick Quiz"
      description="Answer as many as you can in 5 minutes."
      availableModes={['free-recall-unordered']}
      defaultMode="free-recall-unordered"
      defaultCountdownSeconds={300}
      toggles={sampleToggles.slice(0, 2)}
      presets={[]}
    >
      {(config) => <QuizPlaceholder config={config} />}
    </QuizShell>
  ),
};
