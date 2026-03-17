import type { ToggleDefinition, TogglePreset } from './ToggleDefinition';

interface TogglePanelProps {
  readonly toggles: ReadonlyArray<ToggleDefinition>;
  readonly presets: ReadonlyArray<TogglePreset>;
  readonly values: Readonly<Record<string, boolean>>;
  readonly onChange: (key: string, value: boolean) => void;
  readonly onPreset: (preset: TogglePreset) => void;
}

/** Panel showing toggle controls and presets. Placeholder. */
export function TogglePanel(_props: TogglePanelProps) {
  return <div>Toggles</div>;
}
