import { projectGeo } from '../projectGeo';

describe('projectGeo', () => {
  it('maps longitude to x', () => {
    const result = projectGeo({ latitude: 0, longitude: 10 });
    expect(result.x).toBe(10);
  });

  it('maps negative latitude to positive y (flipped)', () => {
    const result = projectGeo({ latitude: 48, longitude: 0 });
    expect(result.y).toBe(-48);
  });

  it('handles negative longitude', () => {
    const result = projectGeo({ latitude: 40, longitude: -3.7 });
    expect(result.x).toBeCloseTo(-3.7);
    expect(result.y).toBeCloseTo(-40);
  });

  it('handles the origin', () => {
    const result = projectGeo({ latitude: 0, longitude: 0 });
    expect(result.x).toBe(0);
    expect(result.y).toBe(-0);
  });
});
