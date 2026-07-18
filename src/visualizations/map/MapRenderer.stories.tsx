import type { Meta, StoryObj } from '@storybook/react';
import { MapRenderer } from './MapRenderer';
import type { VisualizationRendererProps } from '../VisualizationRendererProps';
import type { MapElement } from './MapElement';
import { sampleBackgroundPaths, extendedBackgroundPaths } from './tests/sampleMapData';
import { projectGeo } from './projectGeo';

const meta: Meta<typeof MapRenderer> = {
  title: 'Visualizations/MapRenderer',
  component: MapRenderer,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-primary)' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof MapRenderer>;

const europeCamera = { x: -24, y: -54, width: 50, height: 24 };

const sampleCityElements: ReadonlyArray<MapElement> = [
  {
    id: 'paris', label: 'correct', code: 'FR', group: 'Western Europe',
    geoCoordinates: { latitude: 48.8566, longitude: 2.3522 },
    viewBoxCenter: projectGeo({ latitude: 48.8566, longitude: 2.3522 }),
    viewBoxBounds: { minX: 2.05, minY: -49.16, maxX: 2.65, maxY: -48.56 },
    interactive: true, svgPathData: '',
  },
  {
    id: 'berlin', label: 'incorrect', code: 'DE', group: 'Central Europe',
    geoCoordinates: { latitude: 52.52, longitude: 13.405 },
    viewBoxCenter: projectGeo({ latitude: 52.52, longitude: 13.405 }),
    viewBoxBounds: { minX: 13.1, minY: -52.82, maxX: 13.7, maxY: -52.22 },
    interactive: true, svgPathData: '',
  },
  {
    id: 'madrid', label: 'highlighted', code: 'ES', group: 'Southern Europe',
    geoCoordinates: { latitude: 40.4168, longitude: -3.7038 },
    viewBoxCenter: projectGeo({ latitude: 40.4168, longitude: -3.7038 }),
    viewBoxBounds: { minX: -4.0, minY: -40.72, maxX: -3.4, maxY: -40.12 },
    interactive: true, svgPathData: '',
  },
  {
    id: 'rome', label: 'missed', code: 'IT', group: 'Southern Europe',
    geoCoordinates: { latitude: 41.9028, longitude: 12.4964 },
    viewBoxCenter: projectGeo({ latitude: 41.9028, longitude: 12.4964 }),
    viewBoxBounds: { minX: 12.2, minY: -42.2, maxX: 12.8, maxY: -41.6 },
    interactive: true, svgPathData: '',
  },
  {
    id: 'london', label: 'context', code: 'GB', group: 'Western Europe',
    geoCoordinates: { latitude: 51.5074, longitude: -0.1278 },
    viewBoxCenter: projectGeo({ latitude: 51.5074, longitude: -0.1278 }),
    viewBoxBounds: { minX: -0.43, minY: -51.81, maxX: 0.17, maxY: -51.21 },
    interactive: true, svgPathData: '',
  },
  {
    id: 'lisbon', label: 'correct-second', code: 'PT', group: 'Southern Europe',
    geoCoordinates: { latitude: 38.7223, longitude: -9.1393 },
    viewBoxCenter: projectGeo({ latitude: 38.7223, longitude: -9.1393 }),
    viewBoxBounds: { minX: -9.44, minY: -39.02, maxX: -8.84, maxY: -38.42 },
    interactive: true, svgPathData: '',
  },
  {
    id: 'brussels', label: 'correct-third', code: 'BE', group: 'Western Europe',
    geoCoordinates: { latitude: 50.8503, longitude: 4.3517 },
    viewBoxCenter: projectGeo({ latitude: 50.8503, longitude: 4.3517 }),
    viewBoxBounds: { minX: 4.05, minY: -51.15, maxX: 4.65, maxY: -50.55 },
    interactive: true, svgPathData: '',
  },
  {
    id: 'bern', label: 'default', code: 'CH', group: 'Central Europe',
    geoCoordinates: { latitude: 46.948, longitude: 7.4474 },
    viewBoxCenter: projectGeo({ latitude: 46.948, longitude: 7.4474 }),
    viewBoxBounds: { minX: 7.15, minY: -47.25, maxX: 7.75, maxY: -46.65 },
    interactive: true, svgPathData: '',
  },
];

const COUNTRY_CODES: Readonly<Record<string, string>> = {
  france: 'fr', germany: 'de', spain: 'es', italy: 'it',
  portugal: 'pt', uk: 'gb', switzerland: 'ch', belgium: 'be',
};

const sampleCountryElements: ReadonlyArray<MapElement> = extendedBackgroundPaths.map((bg) => {
  const id = bg.id.replace('border-', '');
  const nums = bg.svgPathData.match(/-?\d+\.?\d*/g)?.map(Number) ?? [];
  const xs: Array<number> = [];
  const ys: Array<number> = [];
  for (let i = 0; i < nums.length; i += 2) {
    xs.push(nums[i]);
    ys.push(nums[i + 1]);
  }
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    id,
    label: bg.name ?? id,
    code: COUNTRY_CODES[id] ?? '',
    group: bg.group ?? '',
    geoCoordinates: { latitude: 0, longitude: 0 },
    viewBoxCenter: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    viewBoxBounds: { minX, minY, maxX, maxY },
    interactive: true,
    svgPathData: bg.svgPathData,
    pathRenderStyle: 'fill' as const,
  };
});

const sampleRiverElements: ReadonlyArray<MapElement> = [
  {
    id: 'rhine', label: 'correct', code: 'RHN', group: 'Europe',
    geoCoordinates: { latitude: 50, longitude: 7 },
    viewBoxCenter: projectGeo({ latitude: 50, longitude: 7 }),
    viewBoxBounds: { minX: 4, minY: -52, maxX: 10, maxY: -46 },
    interactive: true, pathRenderStyle: 'stroke',
    svgPathData: 'M 9.5,-46.5 L 8.6,-47.2 L 7.6,-47.8 L 7.3,-49 L 7.1,-50 L 6.5,-51.2 L 6.4,-52 L 4.5,-51.9',
  },
  {
    id: 'danube', label: 'highlighted', code: 'DAN', group: 'Europe',
    geoCoordinates: { latitude: 48, longitude: 15 },
    viewBoxCenter: projectGeo({ latitude: 48, longitude: 15 }),
    viewBoxBounds: { minX: 8, minY: -49, maxX: 29, maxY: -44 },
    interactive: true, pathRenderStyle: 'stroke',
    svgPathData: 'M 8.2,-47.6 L 9.9,-48.4 L 12.5,-48.6 L 16.3,-48.2 L 19,-47.9 L 21.3,-45.9 L 25.4,-44.2 L 28.7,-45',
  },
  {
    id: 'seine', label: 'incorrect', code: 'SEI', group: 'Europe',
    geoCoordinates: { latitude: 48.5, longitude: 2.5 },
    viewBoxCenter: projectGeo({ latitude: 48.5, longitude: 2.5 }),
    viewBoxBounds: { minX: 0, minY: -50, maxX: 5, maxY: -47 },
    interactive: true, pathRenderStyle: 'stroke',
    svgPathData: 'M 0.4,-49.5 L 1.4,-49.1 L 2.3,-48.8 L 3.1,-48 L 4.3,-47.6',
  },
  {
    id: 'po', label: 'missed', code: 'PO', group: 'Europe',
    geoCoordinates: { latitude: 45, longitude: 11 },
    viewBoxCenter: projectGeo({ latitude: 45, longitude: 11 }),
    viewBoxBounds: { minX: 7, minY: -46, maxX: 13, maxY: -44 },
    interactive: true, pathRenderStyle: 'stroke',
    svgPathData: 'M 7.6,-45 L 9.3,-45.2 L 10.9,-45 L 12.3,-44.9',
  },
  {
    id: 'loire', label: 'correct-second', code: 'LOI', group: 'Europe',
    geoCoordinates: { latitude: 47.2, longitude: 1 },
    viewBoxCenter: projectGeo({ latitude: 47.2, longitude: 1 }),
    viewBoxBounds: { minX: -2, minY: -48, maxX: 4, maxY: -46 },
    interactive: true, pathRenderStyle: 'stroke',
    svgPathData: 'M -1.5,-47.2 L 0,-46.8 L 1.5,-47 L 3,-46.5 L 4.2,-47.1',
  },
  {
    id: 'elbe', label: 'correct-third', code: 'ELB', group: 'Europe',
    geoCoordinates: { latitude: 52, longitude: 11 },
    viewBoxCenter: projectGeo({ latitude: 52, longitude: 11 }),
    viewBoxBounds: { minX: 8, minY: -54, maxX: 15, maxY: -50 },
    interactive: true, pathRenderStyle: 'stroke',
    svgPathData: 'M 14.5,-50.5 L 13,-51 L 12,-51.8 L 10.5,-52.5 L 9.5,-53.5 L 8.8,-54',
  },
  {
    id: 'tagus', label: 'context', code: 'TAG', group: 'Europe',
    geoCoordinates: { latitude: 39.5, longitude: -5 },
    viewBoxCenter: projectGeo({ latitude: 39.5, longitude: -5 }),
    viewBoxBounds: { minX: -9.5, minY: -40, maxX: -1, maxY: -38 },
    interactive: true, pathRenderStyle: 'stroke',
    svgPathData: 'M -1,-39 L -3,-38.8 L -5,-39.2 L -7,-38.9 L -9.2,-38.7',
  },
  {
    id: 'garonne', label: 'default', code: 'GAR', group: 'Europe',
    geoCoordinates: { latitude: 44, longitude: 0 },
    viewBoxCenter: projectGeo({ latitude: 44, longitude: 0 }),
    viewBoxBounds: { minX: -1.5, minY: -45, maxX: 2, maxY: -42.5 },
    interactive: true, pathRenderStyle: 'stroke',
    svgPathData: 'M 1.5,-42.8 L 0.5,-43.5 L -0.3,-44 L -1,-44.8',
  },
];

/**
 * Capitals quiz — cities as dots with labels, no flags, borders visible.
 * All element states shown simultaneously.
 */
export const Capitals: Story = {
  args: {
    elements: sampleCityElements,
    elementStates: {
      paris: 'correct',
      berlin: 'incorrect',
      madrid: 'highlighted',
      rome: 'missed',
      london: 'context',
      lisbon: 'correct-second',
      brussels: 'correct-third',
      bern: 'default',
    },
    toggles: { showBorders: true, showCityDots: true, showCountryNames: true, showMapFlags: false },
    backgroundPaths: sampleBackgroundPaths,
    initialCameraPosition: europeCamera,
  } satisfies VisualizationRendererProps,
};

/**
 * Countries quiz — country polygons as quiz elements with fill states.
 * Matches the countries quiz config (no flags, no city dots, borders on).
 */
export const Countries: Story = {
  args: {
    elements: sampleCountryElements,
    elementStates: {
      france: 'correct',
      germany: 'highlighted',
      spain: 'incorrect',
      italy: 'missed',
      portugal: 'correct-second',
      uk: 'correct-third',
      switzerland: 'context',
      belgium: 'default',
    },
    toggles: { showBorders: true, showCityDots: false, showCountryNames: true, showMapFlags: false, showRegionColors: true },
    backgroundPaths: extendedBackgroundPaths,
    initialCameraPosition: { x: -14, y: -60, width: 36, height: 32 },
  } satisfies VisualizationRendererProps,
};

/**
 * Rivers quiz — stroke paths in various states.
 * Matches the rivers quiz config (borders on, no dots, no flags).
 */
export const Rivers: Story = {
  args: {
    elements: sampleRiverElements,
    elementStates: {
      rhine: 'correct',
      danube: 'highlighted',
      seine: 'incorrect',
      po: 'missed',
      loire: 'correct-second',
      elbe: 'correct-third',
      tagus: 'context',
      garonne: 'default',
    },
    toggles: { showBorders: true, showCityDots: false, showCountryNames: true },
    backgroundPaths: extendedBackgroundPaths,
    initialCameraPosition: { x: -14, y: -60, width: 36, height: 32 },
  } satisfies VisualizationRendererProps,
};
