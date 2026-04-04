import { memo, useMemo } from 'react';
import { useZoomPan } from '../ZoomPanContext';
import { optimalTileLevel, visibleTiles, tileBounds } from './topographyTiles';
import { assetPath } from '../../utilities/assetPath';
import styles from './TopographyTileLayer.module.css';

interface TopographyTileLayerProps {
  readonly maxLevel: number;
}

export const TopographyTileLayer = memo(function TopographyTileLayer({
  maxLevel,
}: TopographyTileLayerProps) {
  const { visibleViewport } = useZoomPan();

  const level = useMemo(
    () => optimalTileLevel(visibleViewport.width, maxLevel),
    [visibleViewport.width, maxLevel],
  );

  const tiles = useMemo(
    () => visibleTiles(visibleViewport, level),
    [visibleViewport, level],
  );

  return (
    <g className={styles.topographyLayer}>
      {tiles.map((tile) => {
        const bounds = tileBounds(tile);
        return (
          <image
            key={`topo-${tile.level}-${tile.col}-${tile.row}`}
            href={assetPath(`/data/topography/z${tile.level}/${tile.col}_${tile.row}.png`)}
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            preserveAspectRatio="none"
            className={styles.topographyTile}
          />
        );
      })}
    </g>
  );
});
