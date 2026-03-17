import type { QuizDefinition } from './QuizDefinition';
import { quizRegistry } from './quizRegistry';

/**
 * Look up a quiz definition by its unique ID.
 * Returns undefined if no quiz matches.
 */
export function getQuizById(id: string): QuizDefinition | undefined {
  return quizRegistry.find((quiz) => quiz.id === id);
}
