import { formatGroupLabel } from './formatGroupLabel';
import styles from './GroupFilterDropdown.module.css';

const ALL_VALUE = '';
const CUSTOM_VALUE = '__custom__';

interface GroupFilterDropdownProps {
  readonly label: string;
  readonly groups: ReadonlyArray<string>;
  readonly selectedGroups: ReadonlySet<string>;
  readonly onGroupChange: (group: string | undefined) => void;
}

/**
 * Single-select dropdown for filtering by group. Its value is derived from
 * the chip selection shared with the Advanced panel: all groups → "All",
 * exactly one → that group, anything else → a non-selectable "Custom" entry.
 */
export function GroupFilterDropdown({
  label,
  groups,
  selectedGroups,
  onGroupChange,
}: GroupFilterDropdownProps) {
  const selectId = `group-filter-${label.toLowerCase().replace(/\s+/g, '-')}`;

  const allSelected = selectedGroups.size === groups.length
    && groups.every((g) => selectedGroups.has(g));
  const singleSelected = selectedGroups.size === 1
    ? Array.from(selectedGroups)[0]
    : undefined;

  let value: string;
  if (allSelected) {
    value = ALL_VALUE;
  } else if (singleSelected !== undefined && groups.includes(singleSelected)) {
    value = singleSelected;
  } else {
    value = CUSTOM_VALUE;
  }

  return (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor={selectId}>
        {label}
      </label>
      <select
        id={selectId}
        className={styles.select}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          if (next === CUSTOM_VALUE) return;
          onGroupChange(next === ALL_VALUE ? undefined : next);
        }}
      >
        <option value={ALL_VALUE}>All</option>
        {groups.map((group) => (
          <option key={group} value={group}>
            {formatGroupLabel(group)}
          </option>
        ))}
        {value === CUSTOM_VALUE && (
          <option value={CUSTOM_VALUE} disabled>
            Custom
          </option>
        )}
      </select>
    </div>
  );
}
