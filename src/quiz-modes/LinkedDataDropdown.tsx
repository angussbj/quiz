import type { DropdownOption } from './TogglePanel';
import { renderGroupedOptions } from './TogglePanel';
import styles from './LinkedDataDropdown.module.css';

interface LinkedDataDropdownProps {
  readonly label: string;
  readonly options: ReadonlyArray<DropdownOption>;
  readonly value: string;
  readonly onChange: (value: string) => void;
  /**
   * When provided, limits the dropdown to "None" plus the top N options
   * (preserving the original order, skipping "None" in the count).
   */
  readonly maxOptions?: number;
}

const NONE_VALUE = 'none';

/**
 * Dropdown for selecting a data column to display/colour by.
 * Always includes a "None" option. When `maxOptions` is set, only the first
 * N non-None options are shown. Uses `renderGroupedOptions` for category grouping.
 */
export function LinkedDataDropdown({
  label,
  options,
  value,
  onChange,
  maxOptions,
}: LinkedDataDropdownProps) {
  const selectId = `linked-data-${label.toLowerCase().replace(/\s+/g, '-')}`;

  const noneOption: DropdownOption = { value: NONE_VALUE, label: 'None' };
  const dataOptions = options.filter((o) => o.value !== NONE_VALUE);
  const visibleDataOptions =
    maxOptions !== undefined ? dataOptions.slice(0, maxOptions) : dataOptions;

  const allOptions: ReadonlyArray<DropdownOption> = [noneOption, ...visibleDataOptions];
  const hasCategories = visibleDataOptions.some((o) => o.category);

  return (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor={selectId}>
        {label}
      </label>
      <select
        id={selectId}
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        {hasCategories ? (
          renderGroupedOptions(allOptions)
        ) : (
          allOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
