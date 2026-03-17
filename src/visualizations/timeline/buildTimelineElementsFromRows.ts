import type { QuizDataRow } from '@/quiz-definitions/QuizDataRow';
import type { TimelineElement } from './TimelineElement';
import type { TimelineTimestamp } from './TimelineTimestamp';
import { buildTimelineElements, type TimelineElementInput } from './buildTimelineElements';

function parseTimestamp(row: QuizDataRow, prefix: string): TimelineTimestamp | undefined {
  const year = row[`${prefix}_year`] ?? row[prefix];
  if (!year) return undefined;
  const yearNum = parseInt(year, 10);
  const month = row[`${prefix}_month`];
  if (!month) return [yearNum];
  const monthNum = parseInt(month, 10);
  const day = row[`${prefix}_day`];
  if (!day) return [yearNum, monthNum];
  return [yearNum, monthNum, parseInt(day, 10)];
}

export function buildTimelineElementsFromRows(
  rows: ReadonlyArray<QuizDataRow>,
  columnMappings: Readonly<Record<string, string>>,
): ReadonlyArray<TimelineElement> {
  const labelColumn = columnMappings['label'] ?? 'label';
  const groupColumn = columnMappings['group'];

  const inputs: TimelineElementInput[] = [];
  for (const row of rows) {
    const start = parseTimestamp(row, 'start');
    if (!start) continue;
    inputs.push({
      id: row.id,
      label: row[labelColumn] ?? row.id,
      start,
      end: parseTimestamp(row, 'end'),
      category: row['category'] ?? (groupColumn ? row[groupColumn] : '') ?? '',
      group: groupColumn ? row[groupColumn] : undefined,
    });
  }

  return buildTimelineElements(inputs);
}
