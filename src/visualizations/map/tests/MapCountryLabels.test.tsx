import { render } from '@testing-library/react';
import { ZoomPanContext } from '../../ZoomPanContext';
import { MapCountryLabels } from '../MapCountryLabels';
import type { BackgroundLabel } from '../BackgroundLabel';

function renderWithZoom(scale: number, ui: React.ReactElement) {
  return render(
    <ZoomPanContext.Provider value={{ scale, clusteredElementIds: new Set() }}>
      <svg>{ui}</svg>
    </ZoomPanContext.Provider>,
  );
}

const makeLabel = (name: string, x: number, y: number, area: number, code: string): BackgroundLabel => ({
  id: name,
  name,
  center: { x, y },
  centers: [{ x, y }],
  area,
  code,
  sovereign: name,
  region: 'Europe',
});

const labels: ReadonlyArray<BackgroundLabel> = [
  makeLabel('France', 2, -47, 40, 'fr'),
  makeLabel('Germany', 10, -51, 25, 'de'),
  makeLabel('Spain', -4, -40, 35, 'es'),
];

describe('MapCountryLabels rendering', () => {
  it('renders flag images in flags-only mode at default zoom', () => {
    const { container } = renderWithZoom(1, (
      <MapCountryLabels labels={labels} showNames={false} showFlags={true} />
    ));
    const imgs = container.querySelectorAll('img');
    expect(imgs.length).toBeGreaterThanOrEqual(3);
  });

  it('renders content at readable pixel sizes via CSS zoom at high zoom', () => {
    const { container } = renderWithZoom(20, (
      <MapCountryLabels labels={labels} showNames={false} showFlags={true} />
    ));
    const imgs = container.querySelectorAll('img');
    expect(imgs.length).toBeGreaterThanOrEqual(3);
    for (const img of imgs) {
      const height = parseFloat(img.style.height);
      // Image height should be in readable CSS pixels (not sub-pixel viewBox units)
      expect(height).toBeGreaterThanOrEqual(10);
    }
    // Container should use CSS zoom to scale down and have readable font size
    const labelContainers = container.querySelectorAll('[class*="labelContainer"]');
    for (const lc of labelContainers) {
      const el = lc as HTMLElement;
      expect(parseFloat(el.style.fontSize)).toBeGreaterThanOrEqual(10);
      expect(el.style.zoom).toBeTruthy();
    }
  });

  it('CSS zoom is always applied since viewBox font sizes are sub-pixel', () => {
    const { container } = renderWithZoom(1, (
      <MapCountryLabels labels={labels} showNames={true} showFlags={true} />
    ));
    // Find all divs with inline zoom style inside foreignObjects
    const foreignObjects = container.querySelectorAll('foreignObject');
    expect(foreignObjects.length).toBeGreaterThanOrEqual(3);
    for (const fo of foreignObjects) {
      const div = fo.querySelector('div') as HTMLElement;
      expect(div).not.toBeNull();
      // ViewBox fontSize (0.8) is always < MIN_RENDER_SIZE, so zoom is always applied
      expect(div.style.zoom).toBeTruthy();
      expect(parseFloat(div.style.fontSize)).toBeGreaterThanOrEqual(10);
    }
  });
});
