import { buildNavigationTree } from '@/navigation/buildNavigationTree';
import { quizRegistry } from './quizRegistry';

/**
 * The navigation tree built from the quiz registry.
 * Computed once at module load time since the registry is static.
 */
export const navigationTree = buildNavigationTree(quizRegistry);
