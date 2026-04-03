import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VisualizationElement, ElementVisualState } from '@/visualizations/VisualizationElement';

const EMPTY_GROUP: ReadonlyArray<string> = [];
import type { ScoreResult } from '@/scoring/ScoreResult';
import { calculateScore } from '@/scoring/calculateScore';
import { matchAnswer, type NormalizeOptions } from '../free-recall/matchAnswer';

interface OrderedRecallConfig {
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly dataRows: ReadonlyArray<Readonly<Record<string, string>>>;
  readonly answerColumn: string;
  readonly normalizeOptions?: NormalizeOptions;
  /**
   * Groups of element IDs that share the same sort value (ties).
   * Elements within a group can be answered in any order.
   * When not provided, each element is its own group (original data row order).
   */
  readonly orderedGroups?: ReadonlyArray<ReadonlyArray<string>>;
  /** When false, current group elements are not highlighted. Default: true. */
  readonly highlightNext?: boolean;
}

export interface OrderedRecallState {
  /** All element IDs in the current tie group (including already-answered ones). */
  readonly currentGroupIds: ReadonlyArray<string>;
  /** Unanswered element IDs in the current tie group. */
  readonly remainingGroupIds: ReadonlyArray<string>;
  /** 1-based index of the first unanswered element globally. */
  readonly promptStart: number;
  /** 1-based index of the last element in the current group globally. */
  readonly promptEnd: number;
  readonly totalPrompts: number;
  readonly correctCount: number;
  readonly skippedCount: number;
  readonly isFinished: boolean;
  readonly elementStates: Readonly<Record<string, ElementVisualState>>;
  readonly wrongAttemptsPerElement: Readonly<Record<string, number>>;
  readonly answeredElementIds: ReadonlySet<string>;
  readonly score: ScoreResult;
  readonly flashIncorrect: boolean;
  readonly lastMatchedElementId: string | undefined;
  readonly lastMatchedAnswer: string | undefined;
}

export interface OrderedRecallActions {
  readonly handleTextInput: (text: string) => boolean;
  readonly handleSubmit: (text: string) => void;
  readonly handleSkip: () => void;
  readonly handleGiveUp: () => void;
}

/**
 * Manages quiz state for ordered recall mode.
 *
 * Elements are presented in groups (tie groups when sorting by a column with
 * duplicate values). Within a group, answers can be given in any order.
 * Skip advances the entire group. The prompt shows a range like "5-11 of 118"
 * for multi-element groups.
 */
export function useOrderedRecallSession({
  elements,
  dataRows,
  answerColumn,
  normalizeOptions,
  orderedGroups: externalGroups,
  highlightNext = true,
}: OrderedRecallConfig): OrderedRecallState & OrderedRecallActions {
  const interactiveIds = useMemo(
    () => new Set(elements.filter((e) => e.interactive !== false).map((e) => e.id)),
    [elements],
  );

  // Build groups: use external groups if provided, otherwise one element per group from data order
  const groups = useMemo(() => {
    if (externalGroups) {
      // Filter each group to interactive IDs, drop empty groups
      return externalGroups
        .map((g) => g.filter((id) => interactiveIds.has(id)))
        .filter((g) => g.length > 0);
    }
    return dataRows
      .map((row) => row['id'] ?? '')
      .filter((id) => interactiveIds.has(id))
      .map((id) => [id]);
  }, [externalGroups, dataRows, interactiveIds]);

  // Flat list of all element IDs across all groups, for total count
  const allIds = useMemo(() => groups.flat(), [groups]);
  const totalPrompts = allIds.length;

  // Cumulative element count before each group index (for prompt range computation)
  const cumulativeBefore = useMemo(() => {
    const cumulative: Array<number> = [0];
    for (let i = 0; i < groups.length; i++) {
      cumulative.push(cumulative[i] + groups[i].length);
    }
    return cumulative;
  }, [groups]);

  const dataRowsById = useMemo(() => {
    const map: Record<string, Readonly<Record<string, string>>> = {};
    for (const row of dataRows) {
      const id = row['id'] ?? '';
      map[id] = row;
    }
    return map;
  }, [dataRows]);

  const elementLabelById = useMemo(
    () => new Map(elements.map((el) => [el.id, el.label])),
    [elements],
  );

  const [groupIndex, setGroupIndex] = useState(0);
  const [correctIds, setCorrectIds] = useState<ReadonlySet<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<ReadonlySet<string>>(new Set());
  const [answeredIds, setAnsweredIds] = useState<ReadonlySet<string>>(new Set());
  const [wrongAttempts, setWrongAttempts] = useState<Readonly<Record<string, number>>>({});
  const [flashIncorrect, setFlashIncorrect] = useState(false);
  const [lastMatchedElementId, setLastMatchedElementId] = useState<string | undefined>(undefined);
  const [lastMatchedAnswer, setLastMatchedAnswer] = useState<string | undefined>(undefined);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
  }, []);

  const isFinished = groupIndex >= groups.length;
  const currentGroup = useMemo(
    () => isFinished ? EMPTY_GROUP : groups[groupIndex],
    [isFinished, groups, groupIndex],
  );
  const remainingGroupIds = useMemo(
    () => currentGroup.filter((id) => !answeredIds.has(id)),
    [currentGroup, answeredIds],
  );

  // Auto-advance to next group when all elements in current group are answered
  useEffect(() => {
    if (isFinished) return;
    if (currentGroup.length > 0 && remainingGroupIds.length === 0) {
      setGroupIndex((prev) => prev + 1);
    }
  }, [isFinished, currentGroup.length, remainingGroupIds.length]);

  // Prompt range: "promptStart-promptEnd of totalPrompts"
  const answeredInGroup = currentGroup.length - remainingGroupIds.length;
  const elementsBefore = isFinished ? totalPrompts : cumulativeBefore[groupIndex];
  const promptStart = elementsBefore + answeredInGroup + 1;
  const promptEnd = isFinished ? totalPrompts : elementsBefore + currentGroup.length;

  const elementStates = useMemo(() => {
    const remainingSet = new Set(remainingGroupIds);
    const states: Record<string, ElementVisualState> = {};
    for (const el of elements) {
      if (correctIds.has(el.id)) {
        states[el.id] = 'correct';
      } else if (skippedIds.has(el.id)) {
        states[el.id] = 'missed';
      } else if (remainingSet.has(el.id) && highlightNext) {
        states[el.id] = 'highlighted';
      } else {
        states[el.id] = 'hidden';
      }
    }
    return states;
  }, [elements, correctIds, skippedIds, remainingGroupIds, highlightNext]);

  const score = useMemo(
    () => calculateScore(correctIds.size, totalPrompts),
    [correctIds.size, totalPrompts],
  );

  const clearFlash = useCallback(() => {
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
    setFlashIncorrect(false);
  }, []);

  // Build data rows for matching: all unanswered elements in the current group
  const currentMatchRows = useMemo(() => {
    return remainingGroupIds
      .map((id) => dataRowsById[id])
      .filter((row): row is Readonly<Record<string, string>> => row !== undefined);
  }, [remainingGroupIds, dataRowsById]);

  const handleTextInput = useCallback(
    (text: string): boolean => {
      clearFlash();
      if (isFinished || remainingGroupIds.length === 0) return false;

      const match = matchAnswer(text, currentMatchRows, answerColumn, normalizeOptions);
      if (match && 'elementId' in match) {
        const matchedId = match.elementId;
        setCorrectIds((prev) => new Set([...prev, matchedId]));
        setAnsweredIds((prev) => new Set([...prev, matchedId]));
        setLastMatchedElementId(matchedId);
        setLastMatchedAnswer(elementLabelById.get(matchedId) ?? match.displayAnswer);
        return true;
      }
      return false;
    },
    [isFinished, remainingGroupIds, currentMatchRows, answerColumn, normalizeOptions, elementLabelById, clearFlash],
  );

  const handleSubmit = useCallback(
    (text: string) => {
      if (isFinished || remainingGroupIds.length === 0) return;
      if (text.trim() === '') return;

      const match = matchAnswer(text, currentMatchRows, answerColumn, normalizeOptions);
      if (match && 'elementId' in match) {
        clearFlash();
        const matchedId = match.elementId;
        setCorrectIds((prev) => new Set([...prev, matchedId]));
        setAnsweredIds((prev) => new Set([...prev, matchedId]));
        setLastMatchedElementId(matchedId);
        setLastMatchedAnswer(elementLabelById.get(matchedId) ?? match.displayAnswer);
        return;
      }

      // Wrong answer — increment wrong attempts for the first remaining element only
      // (the group shares a wrong attempt count via the first member as representative)
      const representativeId = remainingGroupIds[0];
      setWrongAttempts((prev) => ({
        ...prev,
        [representativeId]: (prev[representativeId] ?? 0) + 1,
      }));
      setFlashIncorrect(true);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => {
        setFlashIncorrect(false);
      }, 600);
    },
    [isFinished, remainingGroupIds, currentMatchRows, answerColumn, normalizeOptions, elementLabelById, clearFlash],
  );

  // Skip: mark all remaining in current group as missed, advance to next group
  const handleSkip = useCallback(() => {
    if (isFinished || remainingGroupIds.length === 0) return;
    clearFlash();
    const idsToSkip = [...remainingGroupIds];
    setSkippedIds((prev) => {
      const next = new Set(prev);
      for (const id of idsToSkip) next.add(id);
      return next;
    });
    setAnsweredIds((prev) => {
      const next = new Set(prev);
      for (const id of idsToSkip) next.add(id);
      return next;
    });
  }, [isFinished, remainingGroupIds, clearFlash]);

  // Give up: mark all remaining elements in all groups as missed
  const handleGiveUp = useCallback(() => {
    if (isFinished) return;
    clearFlash();

    const remainingIds: Array<string> = [];
    for (let i = groupIndex; i < groups.length; i++) {
      for (const id of groups[i]) {
        remainingIds.push(id);
      }
    }
    setSkippedIds((prev) => {
      const next = new Set(prev);
      for (const id of remainingIds) {
        if (!correctIds.has(id)) next.add(id);
      }
      return next;
    });
    setAnsweredIds((prev) => {
      const next = new Set(prev);
      for (const id of remainingIds) next.add(id);
      return next;
    });
    setGroupIndex(groups.length);
  }, [isFinished, groupIndex, groups, correctIds, clearFlash]);

  return {
    currentGroupIds: currentGroup,
    remainingGroupIds,
    promptStart,
    promptEnd,
    totalPrompts,
    correctCount: correctIds.size,
    skippedCount: skippedIds.size,
    isFinished,
    elementStates,
    wrongAttemptsPerElement: wrongAttempts,
    answeredElementIds: answeredIds,
    score,
    flashIncorrect,
    lastMatchedElementId,
    lastMatchedAnswer,
    handleTextInput,
    handleSubmit,
    handleSkip,
    handleGiveUp,
  };
}
