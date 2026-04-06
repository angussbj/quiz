import type { QuizModeType } from '@/quiz-definitions/QuizDefinition';

export const MODE_DISPLAY_NAMES: Readonly<Record<QuizModeType, string>> = {
  'free-recall-unordered': 'Name from memory',
  'free-recall-ordered': 'Name in order',
  'identify': 'Point and click',
  'locate': 'Place it',
  'prompted-recall': 'Name on sight',
  'multiple-choice': 'Multiple choice',
};

export const MODE_DESCRIPTIONS: Readonly<Record<QuizModeType, string>> = {
  'free-recall-unordered': 'Type as many as you can recall',
  'free-recall-ordered': 'Type them ranked by a statistic',
  'identify': 'Click on each item when prompted',
  'locate': 'Click where each item belongs',
  'prompted-recall': 'See a highlighted item, type its name',
  'multiple-choice': 'Pick the correct answer from options',
};
