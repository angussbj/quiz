import type { ToggleDefinition, SelectToggleDefinition } from '../ToggleDefinition';

interface SortColumnConfig {
  readonly column: string;
  readonly label: string;
  readonly infoUrl?: string;
}

/**
 * Builds the three select toggle definitions for ordered recall sort configuration:
 * - orderBy: which numeric column to sort by
 * - sortOrder: ascending or descending
 * - missingValues: how to handle rows with missing/non-numeric values
 *
 * All three are restricted to 'free-recall-ordered' mode.
 */
export function buildOrderedRecallSelectToggles(
  sortColumns: ReadonlyArray<SortColumnConfig>,
): ReadonlyArray<SelectToggleDefinition> {
  if (sortColumns.length === 0) return [];

  const orderByToggle: SelectToggleDefinition = {
    key: 'orderBy',
    label: 'Order by',
    group: 'ordering',
    defaultValue: sortColumns[0].column,
    renderAs: 'dropdown',
    modes: ['free-recall-ordered'],
    options: sortColumns.map((col) => ({
      value: col.column,
      label: col.label,
      ...(col.infoUrl ? { infoUrl: col.infoUrl } : {}),
    })),
  };

  const sortOrderToggle: SelectToggleDefinition = {
    key: 'sortOrder',
    label: 'Sort order',
    group: 'ordering',
    defaultValue: 'ascending',
    renderAs: 'segmented',
    modes: ['free-recall-ordered'],
    options: [
      { value: 'ascending', label: 'Ascending' },
      { value: 'descending', label: 'Descending' },
    ],
  };

  const missingValuesToggle: SelectToggleDefinition = {
    key: 'missingValues',
    label: 'Missing values',
    group: 'ordering',
    defaultValue: 'exclude',
    renderAs: 'segmented',
    modes: ['free-recall-ordered'],
    options: [
      { value: 'exclude', label: 'Exclude' },
      { value: 'first', label: 'First' },
      { value: 'last', label: 'Last' },
    ],
  };

  return [orderByToggle, sortOrderToggle, missingValuesToggle];
}

/**
 * Builds the "Highlight next" boolean toggle for ordered recall mode.
 * When ON (default), the current element(s) are highlighted on the visualization.
 * When OFF, all unanswered elements remain hidden — pure memory challenge.
 */
export function buildOrderedRecallToggle(): ToggleDefinition {
  return {
    key: 'highlightNext',
    label: 'Highlight next',
    defaultValue: true,
    group: 'display',
    modes: ['free-recall-ordered'],
  };
}
