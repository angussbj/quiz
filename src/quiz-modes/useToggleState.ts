import { useCallback, useMemo, useState } from 'react';
import type { ToggleDefinition, TogglePreset, SelectToggleDefinition } from './ToggleDefinition';

export interface ToggleState {
  readonly values: Readonly<Record<string, boolean>>;
  readonly selectValues: Readonly<Record<string, string>>;
  readonly activePreset: string | undefined;
  readonly set: (key: string, value: boolean) => void;
  readonly setSelect: (key: string, value: string) => void;
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

function buildSelectDefaults(
  selectToggles: ReadonlyArray<SelectToggleDefinition>,
): Record<string, string> {
  const defaults: Record<string, string> = {};
  for (const toggle of selectToggles) {
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
  selectToggles: ReadonlyArray<SelectToggleDefinition> = [],
): ToggleState {
  const defaults = useMemo(() => buildDefaults(toggles), [toggles]);
  const selectDefaults = useMemo(() => buildSelectDefaults(selectToggles), [selectToggles]);
  const [values, setValues] = useState<Record<string, boolean>>(defaults);
  const [selectValues, setSelectValues] = useState<Record<string, string>>(selectDefaults);

  const activePreset = useMemo(
    () => findMatchingPreset(values, presets),
    [values, presets],
  );

  const set = useCallback((key: string, value: boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setSelect = useCallback((key: string, value: string) => {
    setSelectValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyPreset = useCallback((preset: TogglePreset) => {
    setValues((prev) => ({ ...prev, ...preset.values }));
  }, []);

  const reset = useCallback(() => {
    setValues(defaults);
    setSelectValues(selectDefaults);
  }, [defaults, selectDefaults]);

  return { values, selectValues, activePreset, set, setSelect, applyPreset, reset };
}
