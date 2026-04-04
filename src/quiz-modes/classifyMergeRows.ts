/**
 * Classifies data rows into active elements, merge sources, and their parent mappings.
 * This is the first step of the merge+filter pipeline, before range/group filtering.
 *
 * Merge sources are rows whose values should be folded into a parent element
 * (e.g. tributary rivers merged into the main river).
 */
export interface MergeClassification {
  /** IDs of rows that are standalone quiz elements (not absorbed by merge). */
  readonly standaloneIds: ReadonlySet<string>;
  /** IDs of rows that are merge sources (absorbed into a parent). */
  readonly mergeSourceIds: ReadonlySet<string>;
  /**
   * Maps merge-source element label → parent element label.
   * Used to resolve which parent an absorbed element contributes to.
   */
  readonly mergeSourceParentLabel: ReadonlyMap<string, string>;
}

/**
 * Classifies rows based on merge toggle state.
 * Rows with a tributary/distributary/segment column value are merge sources
 * when the corresponding toggle is enabled; otherwise they're standalone quiz elements.
 */
export function classifyMergeRows(
  dataRows: ReadonlyArray<Readonly<Record<string, string>>>,
  toggleValues: Readonly<Record<string, boolean>>,
  tributaryColumn: string | undefined,
  distributaryColumn: string | undefined,
  segmentColumn: string | undefined,
): MergeClassification {
  const mergeTributaries = tributaryColumn !== undefined && toggleValues['mergeTributaries'] === true;
  const mergeDistributaries = distributaryColumn !== undefined && toggleValues['mergeDistributaries'] === true;
  // mergeSegmentNames defaults to true — segments are always merged unless explicitly set false
  const mergeSegments = segmentColumn !== undefined && toggleValues['mergeSegmentNames'] !== false;

  const standaloneIds = new Set<string>();
  const mergeSourceIds = new Set<string>();
  const mergeSourceParentLabel = new Map<string, string>();

  for (const row of dataRows) {
    const id = row['id'] ?? '';
    const name = row['name'] ?? '';

    if (tributaryColumn && row[tributaryColumn]) {
      if (mergeTributaries) {
        mergeSourceIds.add(id);
        mergeSourceParentLabel.set(name, row[tributaryColumn]);
        continue;
      }
    }
    if (distributaryColumn && row[distributaryColumn]) {
      if (mergeDistributaries) {
        mergeSourceIds.add(id);
        mergeSourceParentLabel.set(name, row[distributaryColumn]);
        continue;
      }
    }
    if (segmentColumn && row[segmentColumn]) {
      if (mergeSegments) {
        mergeSourceIds.add(id);
        mergeSourceParentLabel.set(name, row[segmentColumn]);
        continue;
      }
    }

    standaloneIds.add(id);
  }

  return { standaloneIds, mergeSourceIds, mergeSourceParentLabel };
}
