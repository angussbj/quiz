import { useCallback, useMemo, useState } from 'react';
import type { ToggleDefinition, TogglePreset } from './ToggleDefinition';

export interface ToggleState {
  readonly values: Readonly<Record<string, boolean>>;
  readonly activePreset: string | undefined;
  readonly set: (key: string, value: boolean) => void;
  readonly applyPreset: (preset: TogglePreset) => void;
  readonly reset: () => void;
}

function buildDefaults(
  toggles: ReadonlyArray<ToggleDefinition>,
): Record<string, boolean> {
  const defaults: Record<string, boolean> = {};
  for (const toggle of toggles) {
    defaults[toggle.key] = toggle.defaultValue;
  }
  return defaults;
}

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

export function useToggleState(
  toggles: ReadonlyArray<ToggleDefinition>,
  presets: ReadonlyArray<TogglePreset>,
): ToggleState {
  const defaults = useMemo(() => buildDefaults(toggles), [toggles]);
  const [values, setValues] = useState<Record<string, boolean>>(defaults);

  const activePreset = useMemo(
    () => findMatchingPreset(values, presets),
    [values, presets],
  );

  const set = useCallback((key: string, value: boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyPreset = useCallback((preset: TogglePreset) => {
    setValues((prev) => ({ ...prev, ...preset.values }));
  }, []);

  const reset = useCallback(() => {
    setValues(defaults);
  }, [defaults]);

  return { values, activePreset, set, applyPreset, reset };
}
