import type { NavigationNode } from './NavigationNode';

/**
 * Sample navigation tree for development and testing.
 * Will be replaced by buildNavigationTree(quizRegistry) once quizzes exist.
 */
export const sampleNavigationTree: NavigationNode = {
  label: 'Quizzes',
  children: [
    {
      label: 'Geography',
      children: [
        {
          label: 'Europe',
          children: [
            { label: 'Capitals', children: [], quizId: 'geo-europe-capitals' },
            { label: 'Flags', children: [], quizId: 'geo-europe-flags' },
            { label: 'Countries', children: [], quizId: 'geo-europe-countries' },
          ],
        },
        {
          label: 'Asia',
          children: [
            { label: 'Capitals', children: [], quizId: 'geo-asia-capitals' },
            { label: 'Countries', children: [], quizId: 'geo-asia-countries' },
          ],
        },
        {
          label: 'Africa',
          children: [
            { label: 'Capitals', children: [], quizId: 'geo-africa-capitals' },
          ],
        },
      ],
    },
    {
      label: 'Science',
      children: [
        {
          label: 'Chemistry',
          children: [
            { label: 'Periodic Table', children: [], quizId: 'sci-chem-periodic' },
            { label: 'Element Symbols', children: [], quizId: 'sci-chem-symbols' },
          ],
        },
        {
          label: 'Biology',
          children: [
            { label: 'Human Bones', children: [], quizId: 'sci-bio-bones' },
          ],
        },
      ],
    },
    {
      label: 'History',
      children: [
        {
          label: 'Ancient',
          children: [
            { label: 'Roman Emperors', children: [], quizId: 'hist-ancient-emperors' },
          ],
        },
        {
          label: 'Modern',
          children: [
            { label: 'World War II Timeline', children: [], quizId: 'hist-modern-ww2' },
          ],
        },
      ],
    },
  ],
};
