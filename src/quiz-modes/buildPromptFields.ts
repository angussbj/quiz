import type { ToggleDefinition, SelectToggleDefinition } from './ToggleDefinition';
import type { PromptField } from './identify/IdentifyPromptFields';

/**
 * Build prompt fields from toggle and select toggle definitions.
 * Used by identify and prompted recall modes to show flags/country names in the prompt.
 *
 * @param row - The current element's data row
 * @param toggleDefinitions - Boolean toggle definitions (e.g. showPromptCountryNames)
 * @param toggleValues - Current boolean toggle values
 * @param selectToggleDefinitions - Select toggle definitions (e.g. showPromptFlags)
 * @param selectValues - Current select toggle values
 * @param wrongAttempts - Number of wrong attempts for the current element (for hint logic)
 */
export function buildPromptFields(
  row: Readonly<Record<string, string>>,
  toggleDefinitions: ReadonlyArray<ToggleDefinition>,
  toggleValues: Readonly<Record<string, boolean>>,
  selectToggleDefinitions: ReadonlyArray<SelectToggleDefinition>,
  selectValues: Readonly<Record<string, string>>,
  wrongAttempts: number,
): ReadonlyArray<PromptField> {
  const fields: PromptField[] = [];
  for (const toggleDef of toggleDefinitions) {
    if (!toggleDef.promptField) continue;
    if (!toggleValues[toggleDef.key]) continue;
    const value = row[toggleDef.promptField.column];
    if (value) {
      fields.push({ type: toggleDef.promptField.type, value });
    }
  }
  for (const selectDef of selectToggleDefinitions) {
    if (!selectDef.promptField) continue;
    const selectValue = selectValues[selectDef.key] ?? selectDef.defaultValue;
    if (selectValue === 'off') continue;
    if (selectValue === 'hint' && wrongAttempts < 1) continue;
    const value = row[selectDef.promptField.column];
    if (value) {
      fields.push({ type: selectDef.promptField.type, value });
    }
  }
  return fields;
}
