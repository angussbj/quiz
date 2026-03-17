import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { ToggleDefinition, TogglePreset } from './ToggleDefinition';
import { TogglePanel } from './TogglePanel';

const sampleToggles: ReadonlyArray<ToggleDefinition> = [
  { key: 'show-labels', label: 'Show country labels', defaultValue: true, group: 'display', hiddenBehavior: 'on-reveal' },
  { key: 'show-borders', label: 'Show borders', defaultValue: true, group: 'display', hiddenBehavior: 'never' },
  { key: 'show-flags', label: 'Show flags', defaultValue: false, group: 'display', hiddenBehavior: { hintAfter: 2 } },
  { key: 'show-city-dots', label: 'Show city markers', defaultValue: true, group: 'display', hiddenBehavior: 'on-reveal' },
  { key: 'accept-misspellings', label: 'Accept misspellings', defaultValue: true, group: 'difficulty', hiddenBehavior: 'never' },
  { key: 'show-first-letter', label: 'Show first letter hint', defaultValue: false, group: 'difficulty', hiddenBehavior: 'never' },
];

const samplePresets: ReadonlyArray<TogglePreset> = [
  {
    name: 'easy',
    label: 'Easy',
    values: {
      'show-labels': true,
      'show-borders': true,
      'show-flags': true,
      'show-city-dots': true,
      'accept-misspellings': true,
      'show-first-letter': true,
    },
  },
  {
    name: 'medium',
    label: 'Medium',
    values: {
      'show-labels': true,
      'show-borders': true,
      'show-flags': false,
      'show-city-dots': true,
      'accept-misspellings': true,
      'show-first-letter': false,
    },
  },
  {
    name: 'hard',
    label: 'Hard',
    values: {
      'show-labels': false,
      'show-borders': false,
      'show-flags': false,
      'show-city-dots': false,
      'accept-misspellings': false,
      'show-first-letter': false,
    },
  },
];

function findMatchingPreset(
  values: Readonly<Record<string, boolean>>,
  presets: ReadonlyArray<TogglePreset>,
): string | undefined {
  for (const preset of presets) {
    const allMatch = Object.entries(preset.values).every(
      ([key, value]) => values[key] === value,
    );
    if (allMatch) return preset.name;
  }
  return undefined;
}

function buildDefaults(toggles: ReadonlyArray<ToggleDefinition>): Record<string, boolean> {
  const defaults: Record<string, boolean> = {};
  for (const toggle of toggles) {
    defaults[toggle.key] = toggle.defaultValue;
  }
  return defaults;
}

function InteractiveTogglePanel({
  toggles,
  presets,
}: {
  readonly toggles: ReadonlyArray<ToggleDefinition>;
  readonly presets: ReadonlyArray<TogglePreset>;
}) {
  const [values, setValues] = useState(() => buildDefaults(toggles));

  return (
    <div style={{ maxWidth: 420, margin: '2rem auto', fontFamily: 'var(--font-family)' }}>
      <TogglePanel
        toggles={toggles}
        presets={presets}
        values={values}
        activePreset={findMatchingPreset(values, presets)}
        onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
        onPreset={(preset) => setValues((prev) => ({ ...prev, ...preset.values }))}
      />
    </div>
  );
}

const meta: Meta<typeof TogglePanel> = {
  title: 'Quiz Modes/TogglePanel',
  component: TogglePanel,
};

export default meta;

type Story = StoryObj<typeof TogglePanel>;

export const Default: Story = {
  render: () => (
    <InteractiveTogglePanel
      toggles={sampleToggles}
      presets={samplePresets}
    />
  ),
};

export const NoPresets: Story = {
  render: () => (
    <InteractiveTogglePanel
      toggles={sampleToggles.slice(0, 3)}
      presets={[]}
    />
  ),
};

export const SingleToggle: Story = {
  render: () => (
    <InteractiveTogglePanel
      toggles={[sampleToggles[0]]}
      presets={[]}
    />
  ),
};
