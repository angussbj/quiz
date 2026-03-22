import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MapRenderer } from './MapRenderer';
import { buildMapElements } from './buildMapElements';
import { parseCsv } from '@/quiz-definitions/parseCsv';
import { applyDataFilter } from '@/quiz-definitions/applyDataFilter';
import { parseBackgroundPaths } from './loadBackgroundPaths';
import type { VisualizationRendererProps, BackgroundPath } from '../VisualizationRendererProps';
import type { VisualizationElement } from '../VisualizationElement';

/**
 * Debug view for rivers: each river gets a unique random color via its group field.
 * Use this to visually inspect lake-river matching and gap filling.
 */

const meta: Meta = {
  title: 'Debug/RiverColors',
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

/** Generate a visually distinct HSL color from an index. */
function indexColor(index: number, total: number): string {
  const hue = (index * 360 / total) % 360;
  const saturation = 60 + (index % 3) * 15; // 60-90%
  const lightness = 35 + (index % 4) * 8;   // 35-59%
  return `hsl(${Math.round(hue)}, ${saturation}%, ${lightness}%)`;
}

function RiverDebugRenderer({
  elements,
  backgroundPaths,
  region,
}: {
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly backgroundPaths: ReadonlyArray<BackgroundPath>;
  readonly region: string;
}) {
  // Assign each element a unique group for unique coloring.
  // We override the CSS custom properties with inline style overrides.
  // Instead, we'll render the map with all rivers in 'default' state,
  // and use the SVG overlay to render colored paths on top.
  const colorMap = new Map<string, string>();
  elements.forEach((el, i) => {
    colorMap.set(el.id, indexColor(i, elements.length));
  });

  // We'll use a custom SVG overlay that renders each river in its unique color
  const overlay = (
    <g>
      {elements.map((el) => {
        const color = colorMap.get(el.id) ?? 'gray';
        const pathData = 'svgPathData' in el ? (el as { svgPathData: string }).svgPathData : '';
        if (!pathData) return null;

        // Split into subpaths: Z-closed = fill, open = stroke
        const subpaths = pathData.split(/(?=M\s)/).filter(Boolean);
        const strokePaths = subpaths.filter((p) => !p.trim().endsWith('Z'));
        const fillPaths = subpaths.filter((p) => p.trim().endsWith('Z'));

        return (
          <g key={el.id}>
            {fillPaths.length > 0 && (
              <path
                d={fillPaths.join(' ')}
                style={{
                  fill: color,
                  fillOpacity: 0.3,
                  stroke: color,
                  strokeWidth: 0.1,
                  strokeOpacity: 0.5,
                }}
              />
            )}
            {strokePaths.length > 0 && (
              <path
                d={strokePaths.join(' ')}
                style={{
                  fill: 'none',
                  stroke: color,
                  strokeWidth: 0.5,
                  strokeOpacity: 0.9,
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                }}
              />
            )}
          </g>
        );
      })}
    </g>
  );

  const props: VisualizationRendererProps = {
    elements,
    // Hide all elements from normal rendering — we render them via overlay
    elementStates: Object.fromEntries(elements.map((el) => [el.id, 'hidden' as const])),
    toggles: { showBorders: true },
    backgroundPaths,
    svgOverlay: overlay,
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{
        position: 'absolute', top: 8, left: 8, zIndex: 10,
        background: 'white', padding: '8px 12px', borderRadius: 4,
        fontSize: 13, boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        maxHeight: '90vh', overflow: 'auto',
      }}>
        <strong>{region} Rivers — Color Key</strong>
        <div style={{ columns: elements.length > 30 ? 3 : elements.length > 15 ? 2 : 1, marginTop: 4 }}>
          {elements.map((el) => (
            <div key={el.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '1px 0' }}>
              <span style={{
                display: 'inline-block', width: 12, height: 12, borderRadius: 2,
                background: colorMap.get(el.id), flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{el.label}</span>
            </div>
          ))}
        </div>
      </div>
      <MapRenderer {...props} />
    </div>
  );
}

function useRiverData(region?: string) {
  const [elements, setElements] = useState<ReadonlyArray<VisualizationElement>>([]);
  const [backgrounds, setBackgrounds] = useState<ReadonlyArray<BackgroundPath>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In Storybook, public/ files are served without the /quiz/ base path
    Promise.all([
      fetch('/data/rivers/world-rivers.csv').then((r) => r.text()),
      fetch('/data/borders/world-borders.csv').then((r) => r.text()),
    ]).then(([riversCsv, bordersCsv]) => {
      let rows = parseCsv(riversCsv);
      if (region) {
        rows = applyDataFilter(rows, [
          { column: 'continent', values: [region] },
          { column: 'scalerank', values: ['0', '1', '2', '3', '4', '5', '6'] },
        ]);
      } else {
        rows = applyDataFilter(rows, { column: 'scalerank', values: ['0', '1', '2', '3', '4', '5'] });
      }

      const els = buildMapElements(rows, {
        answer: 'name',
        label: 'name',
        latitude: 'latitude',
        longitude: 'longitude',
        group: 'continent',
        pathRenderStyle: 'stroke',
      });
      setElements(els);
      setBackgrounds(parseBackgroundPaths(parseCsv(bordersCsv)));
      setLoading(false);
    });
  }, [region]);

  return { elements, backgrounds, loading };
}

function RiverDebugStory({ region }: { readonly region?: string }) {
  const { elements, backgrounds, loading } = useRiverData(region);
  if (loading) return <div style={{ padding: 20 }}>Loading river data...</div>;
  return (
    <RiverDebugRenderer
      elements={elements}
      backgroundPaths={backgrounds}
      region={region ?? 'World'}
    />
  );
}

type Story = StoryObj;

export const Europe: Story = {
  render: () => <RiverDebugStory region="Europe" />,
};

export const Asia: Story = {
  render: () => <RiverDebugStory region="Asia" />,
};

export const Africa: Story = {
  render: () => <RiverDebugStory region="Africa" />,
};

export const NorthAmerica: Story = {
  render: () => <RiverDebugStory region="North America" />,
};

export const SouthAmerica: Story = {
  render: () => <RiverDebugStory region="South America" />,
};

export const Oceania: Story = {
  render: () => <RiverDebugStory region="Oceania" />,
};

export const World: Story = {
  render: () => <RiverDebugStory />,
};
