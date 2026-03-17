import { motion } from 'framer-motion';
import type { ToggleDefinition, TogglePreset } from './ToggleDefinition';
import styles from './TogglePanel.module.css';

interface TogglePanelProps {
  readonly title: string;
  readonly description?: string;
  readonly toggles: ReadonlyArray<ToggleDefinition>;
  readonly presets: ReadonlyArray<TogglePreset>;
  readonly values: Readonly<Record<string, boolean>>;
  readonly activePreset: string | undefined;
  readonly onChange: (key: string, value: boolean) => void;
  readonly onPreset: (preset: TogglePreset) => void;
  readonly onStart: () => void;
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
  title,
  description,
  toggles,
  presets,
  values,
  activePreset,
  onChange,
  onPreset,
  onStart,
}: TogglePanelProps) {
  const groups = groupTogglesByCategory(toggles);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}

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
              {items.map((toggle) => (
                <div
                  key={toggle.key}
                  className={styles.toggleRow}
                  onClick={() =>
                    onChange(toggle.key, !(values[toggle.key] ?? toggle.defaultValue))
                  }
                >
                  <span className={styles.toggleLabel}>{toggle.label}</span>
                  <ToggleSwitch
                    checked={values[toggle.key] ?? toggle.defaultValue}
                    onToggle={(checked) => onChange(toggle.key, checked)}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}

        <motion.button
          className={styles.startButton}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
        >
          Start Quiz
        </motion.button>
      </div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onToggle,
}: {
  readonly checked: boolean;
  readonly onToggle: (checked: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      className={styles.switch}
      data-checked={checked || undefined}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(!checked);
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
