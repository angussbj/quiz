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
  it('renders SVG image elements for flags', () => {
    const { container } = renderWithZoom(1, (
      <MapCountryLabels labels={labels} showNames={false} showFlags={true} />
    ));
    const images = container.querySelectorAll('image');
    expect(images.length).toBeGreaterThanOrEqual(3);
    // Check href points to flag SVGs
    for (const img of images) {
      expect(img.getAttribute('href')).toMatch(/\/flags\/\w+\.svg/);
    }
  });

  it('renders SVG text elements for names', () => {
    const { container } = renderWithZoom(1, (
      <MapCountryLabels labels={labels} showNames={true} showFlags={false} />
    ));
    const texts = container.querySelectorAll('text');
    expect(texts.length).toBeGreaterThanOrEqual(3);
    const names = Array.from(texts).map((t) => t.textContent);
    expect(names).toContain('France');
    expect(names).toContain('Germany');
    expect(names).toContain('Spain');
  });

  it('renders both flags and names together', () => {
    const { container } = renderWithZoom(1, (
      <MapCountryLabels labels={labels} showNames={true} showFlags={true} />
    ));
    expect(container.querySelectorAll('image').length).toBeGreaterThanOrEqual(3);
    expect(container.querySelectorAll('text').length).toBeGreaterThanOrEqual(3);
  });

  it('uses native SVG elements (no foreignObject)', () => {
    const { container } = renderWithZoom(20, (
      <MapCountryLabels labels={labels} showNames={true} showFlags={true} />
    ));
    // No foreignObject — all native SVG
    expect(container.querySelectorAll('foreignObject')).toHaveLength(0);
    // Labels render at any zoom level without sub-pixel issues
    expect(container.querySelectorAll('image').length).toBeGreaterThanOrEqual(3);
    expect(container.querySelectorAll('text').length).toBeGreaterThanOrEqual(3);
  });
});
