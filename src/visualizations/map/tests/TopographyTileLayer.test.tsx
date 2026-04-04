import { render } from '@testing-library/react';
import { TopographyTileLayer } from '../TopographyTileLayer';
import { ZoomPanContext } from '../../ZoomPanContext';
import type { ZoomPanState } from '../../ZoomPanContext';

// assetPath prepends BASE_URL; in Jest import.meta.env.BASE_URL is undefined so mock it
jest.mock('../../../utilities/assetPath', () => ({
  assetPath: (path: string) => `/quiz${path}`,
}));

function makeZoomPanState(
  viewport: { x: number; y: number; width: number; height: number },
): ZoomPanState {
  return {
    scale: 1,
    clusteredElementIds: new Set(),
    clusters: [],
    basePixelsPerViewBoxUnit: 1,
    viewBoxString: '-180 -90 360 180',
    visibleViewport: viewport,
  };
}

function renderLayer(
  viewport: { x: number; y: number; width: number; height: number },
  maxLevel: number,
) {
  const state = makeZoomPanState(viewport);
  return render(
    <ZoomPanContext.Provider value={state}>
      <svg>
        <TopographyTileLayer maxLevel={maxLevel} />
      </svg>
    </ZoomPanContext.Provider>,
  );
}

describe('TopographyTileLayer', () => {
  it('renders image elements for visible tiles', () => {
    // Full world viewport at level 0 → 1 tile
    const { container } = renderLayer({ x: -180, y: -90, width: 360, height: 180 }, 0);
    const images = container.querySelectorAll('image');
    expect(images.length).toBeGreaterThan(0);
  });

  it('renders more tiles for a viewport spanning multiple tile rows than a single-tile viewport', () => {
    // maxLevel=2: level 2 has 4 cols (tileWidth=90°), 2 rows (tileHeight=90°).
    // optimalTileLevel(44, 2) = 2 since tileWidth=90 > 44 at levels 1 and 2.
    // Full-height viewport (height=180) spans both rows at level 2: 2 tiles.
    // Single-cell viewport (width=10, height=10) fits inside 1 tile: 1 tile.
    const fullHeight = { x: -180, y: -90, width: 44, height: 180 };
    const oneCell = { x: 0, y: 0, width: 10, height: 10 };

    const { container: fullHeightContainer } = renderLayer(fullHeight, 2);
    const { container: oneCellContainer } = renderLayer(oneCell, 2);

    const fullHeightTiles = fullHeightContainer.querySelectorAll('image').length;
    const oneCellTiles = oneCellContainer.querySelectorAll('image').length;

    expect(fullHeightTiles).toBeGreaterThan(oneCellTiles);
  });

  it('sets correct x, y, width, height attributes on tile images', () => {
    // At level 0 there is 1 tile covering the whole world:
    // x=-180, y=-90, width=360, height=180
    const { container } = renderLayer({ x: -180, y: -90, width: 360, height: 180 }, 0);
    const images = container.querySelectorAll('image');
    expect(images).toHaveLength(1);

    const img = images[0];
    expect(img.getAttribute('x')).toBe('-180');
    expect(img.getAttribute('y')).toBe('-90');
    expect(img.getAttribute('width')).toBe('360');
    expect(img.getAttribute('height')).toBe('180');
  });

  it('uses assetPath for tile href', () => {
    const { container } = renderLayer({ x: -180, y: -90, width: 360, height: 180 }, 0);
    const images = container.querySelectorAll('image');
    expect(images).toHaveLength(1);

    const href = images[0].getAttribute('href');
    // assetPath mock prepends /quiz; tile at level 0, col 0, row 0
    expect(href).toBe('/quiz/data/topography/z0/0_0.png');
  });
});
