import { motion } from 'framer-motion';
import type { ToggleDefinition, TogglePreset } from './ToggleDefinition';
import { Tooltip } from '@/layout/Tooltip';
import styles from './TogglePanel.module.css';

interface TogglePanelProps {
  readonly toggles: ReadonlyArray<ToggleDefinition>;
  readonly presets: ReadonlyArray<TogglePreset>;
  readonly values: Readonly<Record<string, boolean>>;
  readonly activePreset: string | undefined;
  readonly onChange: (key: string, value: boolean) => void;
  readonly onPreset: (preset: TogglePreset) => void;
  /** Toggle keys that are forced and cannot be changed by the user. */
  readonly disabledKeys?: ReadonlySet<string>;
  /** Tooltip text for disabled/constrained toggles. */
  readonly tooltips?: Readonly<Record<string, string>>;
  /** Current quiz mode — used to filter toggles by their `modes` field. */
  readonly selectedMode?: string;
}

function groupTogglesByCategory(
  toggles: ReadonlyArray<ToggleDefinition>,
): ReadonlyArray<{ readonly group: string; readonly items: ReadonlyArray<ToggleDefinition> }> {
  const grouped = new Map<string, ToggleDefinition[]>();
  for (const toggle of toggles) {
    const existing = grouped.get(toggle.group);
    if (existing) {
      existing.push(toggle);
    } else {
      grouped.set(toggle.group, [toggle]);
    }
  }
  return Array.from(grouped.entries()).map(([group, items]) => ({
    group,
    items,
  }));
}

function formatGroupLabel(group: string): string {
  return group.charAt(0).toUpperCase() + group.slice(1);
}

export function TogglePanel({
  toggles,
  presets,
  values,
  activePreset,
  onChange,
  onPreset,
  disabledKeys,
  tooltips,
  selectedMode,
}: TogglePanelProps) {
  const filteredToggles = selectedMode
    ? toggles.filter((t) => !t.modes || t.modes.includes(selectedMode))
    : toggles;
  const groups = groupTogglesByCategory(filteredToggles);

  return (
    <div className={styles.panel}>
      {presets.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Presets</h2>
          <div className={styles.presetRow}>
            {presets.map((preset) => (
              <button
                key={preset.name}
                className={styles.presetButton}
                data-active={activePreset === preset.name || undefined}
                onClick={() => onPreset(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {groups.map(({ group, items }) => (
        <section key={group} className={styles.section}>
          <h2 className={styles.sectionTitle}>{formatGroupLabel(group)}</h2>
          <div className={styles.toggleList}>
            {items.map((toggle) => {
              const isDisabled = disabledKeys?.has(toggle.key) ?? false;
              const tooltip = tooltips?.[toggle.key];
              const row = (
                <div
                  key={toggle.key}
                  className={`${styles.toggleRow} ${isDisabled ? styles.toggleRowDisabled : ''}`}
                  onClick={() => {
                    if (!isDisabled) {
                      onChange(toggle.key, !(values[toggle.key] ?? toggle.defaultValue));
                    }
                  }}
                >
                  <span className={`${styles.toggleLabel} ${isDisabled ? styles.toggleLabelDisabled : ''}`}>
                    {toggle.label}
                  </span>
                  <ToggleSwitch
                    checked={values[toggle.key] ?? toggle.defaultValue}
                    onToggle={(checked) => {
                      if (!isDisabled) onChange(toggle.key, checked);
                    }}
                    disabled={isDisabled}
                  />
                </div>
              );
              if (tooltip) {
                return <Tooltip key={toggle.key} text={tooltip}>{row}</Tooltip>;
              }
              return row;
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onToggle,
  disabled = false,
}: {
  readonly checked: boolean;
  readonly onToggle: (checked: boolean) => void;
  readonly disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      className={styles.switch}
      data-checked={checked || undefined}
      data-disabled={disabled || undefined}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onToggle(!checked);
      }}
    >
      <motion.span
        className={styles.switchThumb}
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}
