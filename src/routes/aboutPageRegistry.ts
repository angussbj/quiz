import { lazy } from 'react';
import type { ComponentType } from 'react';

export interface AboutPageEntry {
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly component: () => Promise<{ default: ComponentType }>;
}

/**
 * Registry of all /about/* methodology/info pages.
 *
 * To add a new page:
 * 1. Create the component in src/routes/ (e.g. MyMethodology.tsx)
 * 2. Add an entry here — the About index page and App.tsx routes are auto-generated from this list.
 */
export const aboutPageRegistry: ReadonlyArray<AboutPageEntry> = [
  {
    path: '/about/element-costs',
    title: 'Element Cost Methodology',
    description: 'How we calculated cost-per-kilogram for every element in the periodic table.',
    component: () => import('./ElementCostMethodology.tsx'),
  },
  {
    path: '/about/country-statistics',
    title: 'Country Statistics: Sources',
    description: 'Sources and methodology for 55 country statistics metrics used in the World Countries quiz.',
    component: () => import('./CountryStatisticsMethodology.tsx'),
  },
];

/**
 * Lazy-loaded components for use in route definitions.
 */
export const aboutPageComponents = aboutPageRegistry.map((entry) => ({
  path: entry.path,
  Component: lazy(entry.component),
}));
