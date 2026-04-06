import { useLocalStorage } from './useLocalStorage';
import type { PanelLevel } from '@/quiz-modes/DifficultyPreset';

const PANEL_LEVEL_KEY = 'quizzical:panelLevel';
const DEFAULT_PANEL_LEVEL: PanelLevel = 'simple';

/**
 * Global localStorage persistence for the panel display level.
 * Shared across all quizzes — controls how much of the setup UI is shown.
 */
export function usePanelLevel(): {
  readonly panelLevel: PanelLevel;
  readonly setPanelLevel: (level: PanelLevel) => void;
} {
  const { value, set } = useLocalStorage<PanelLevel>(PANEL_LEVEL_KEY, DEFAULT_PANEL_LEVEL);
  return { panelLevel: value, setPanelLevel: set };
}
