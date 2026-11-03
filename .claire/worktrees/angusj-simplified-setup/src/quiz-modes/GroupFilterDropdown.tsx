import { formatGroupLabel } from './formatGroupLabel';
import styles from './GroupFilterDropdown.module.css';

const ALL_VALUE = '';

interface GroupFilterDropdownProps {
  readonly label: string;
  readonly groups: ReadonlyArray<string>;
  readonly selectedGroup: string | undefined;
  readonly onGroupChange: (group: string | undefined) => void;
}

/**
 * Single-select dropdown for filtering by group. Includes an "All" option
 * that maps to `undefined` (no filter applied).
 */
export function GroupFilterDropdown({
  label,
  groups,
  selectedGroup,
  onGroupChange,
}: GroupFilterDropdownProps) {
  const selectId = `group-filter-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor={selectId}>
        {label}
      </label>
      <select
        id={selectId}
        className={styles.select}
        value={selectedGroup ?? ALL_VALUE}
        onChange={(e) => {
          const value = e.target.value;
          onGroupChange(value === ALL_VALUE ? undefined : value);
        }}
      >
        <option value={ALL_VALUE}>All</option>
        {groups.map((group) => (
          <option key={group} value={group}>
            {formatGroupLabel(group)}
          </option>
        ))}
      </select>
    </div>
  );
}
