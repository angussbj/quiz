import { motion } from 'framer-motion';
import type { ToggleDefinition, TogglePreset, SelectToggleDefinition } from './ToggleDefinition';
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
  /** Multi-value select toggles (e.g., date precision). */
  readonly selectToggles?: ReadonlyArray<SelectToggleDefinition>;
  /** Current values for select toggles. */
  readonly selectValues?: Readonly<Record<string, string>>;
  /** Callback for select toggle changes. */
  readonly onSelectChange?: (key: string, value: string) => void;
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
  selectToggles = [],
  selectValues = {},
  onSelectChange,
}: TogglePanelProps) {
  const filteredToggles = selectedMode
    ? toggles.filter((t) => !t.modes || t.modes.includes(selectedMode))
    : toggles;
  const filteredSelectToggles = selectedMode
    ? selectToggles.filter((t) => !t.modes || t.modes.includes(selectedMode))
    : selectToggles;
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
            {filteredSelectToggles
              .filter((st) => st.group === group)
              .map((selectToggle) => {
                const cannotDisable = disabledKeys?.has(selectToggle.key) ?? false;
                const selectTooltip = tooltips?.[selectToggle.key];
                const selectRow = (
                  <div key={selectToggle.key} className={styles.selectRow}>
                    <span className={styles.selectLabel}>{selectToggle.label}</span>
                    <SegmentedControl
                      options={selectToggle.options}
                      value={selectValues[selectToggle.key] ?? selectToggle.defaultValue}
                      onChange={(value) => onSelectChange?.(selectToggle.key, value)}
                      preventOff={cannotDisable}
                    />
                  </div>
                );
                if (selectTooltip) {
                  return <Tooltip key={selectToggle.key} text={selectTooltip}>{selectRow}</Tooltip>;
                }
                return selectRow;
              })}
          </div>
        </section>
      ))}

      {filteredSelectToggles
        .filter((st) => !groups.some((g) => g.group === st.group))
        .map((selectToggle) => {
          const cannotDisable = disabledKeys?.has(selectToggle.key) ?? false;
          const selectTooltip = tooltips?.[selectToggle.key];
          const selectRow = (
            <div className={styles.selectRow}>
              <span className={styles.selectLabel}>{selectToggle.label}</span>
              <SegmentedControl
                options={selectToggle.options}
                value={selectValues[selectToggle.key] ?? selectToggle.defaultValue}
                onChange={(value) => onSelectChange?.(selectToggle.key, value)}
                preventOff={cannotDisable}
              />
            </div>
          );
          return (
            <section key={selectToggle.key} className={styles.section}>
              <h2 className={styles.sectionTitle}>{formatGroupLabel(selectToggle.group)}</h2>
              <div className={styles.toggleList}>
                {selectTooltip ? <Tooltip text={selectTooltip}>{selectRow}</Tooltip> : selectRow}
              </div>
            </section>
          );
        })}
    </div>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
  preventOff = false,
}: {
  readonly options: ReadonlyArray<{ readonly value: string; readonly label: string }>;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly preventOff?: boolean;
}) {
  return (
    <div className={styles.segmentedControl}>
      {options.map((option) => {
        const isDisabled = preventOff && option.value === 'off';
        return (
          <button
            key={option.value}
            className={styles.segmentButton}
            data-active={option.value === value || undefined}
            disabled={isDisabled}
            onClick={() => {
              if (!isDisabled) onChange(option.value);
            }}
          >
            {option.label}
          </button>
        );
      })}
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
