import { elementToggle } from '../elementToggle';

const globalToggles = { showLabels: true, showBars: false, showDots: true };

describe('elementToggle', () => {
  it('returns per-element override when present', () => {
    const elementToggles = { el1: { showLabels: false } };
    expect(elementToggle(elementToggles, globalToggles, 'el1', 'showLabels')).toBe(false);
  });

  it('falls back to global toggle when no per-element override', () => {
    const elementToggles = { el1: { showLabels: false } };
    expect(elementToggle(elementToggles, globalToggles, 'el1', 'showBars')).toBe(false);
    expect(elementToggle(elementToggles, globalToggles, 'el1', 'showDots')).toBe(true);
  });

  it('falls back to global toggle when element not in elementToggles', () => {
    const elementToggles = { el1: { showLabels: false } };
    expect(elementToggle(elementToggles, globalToggles, 'el2', 'showLabels')).toBe(true);
  });

  it('falls back to global toggle when elementToggles is undefined', () => {
    expect(elementToggle(undefined, globalToggles, 'el1', 'showLabels')).toBe(true);
    expect(elementToggle(undefined, globalToggles, 'el1', 'showBars')).toBe(false);
  });

  it('defaults to true when toggle key is not in global toggles either', () => {
    expect(elementToggle(undefined, globalToggles, 'el1', 'nonExistent')).toBe(true);
  });

  it('prefers per-element true over global false', () => {
    const elementToggles = { el1: { showBars: true } };
    expect(elementToggle(elementToggles, globalToggles, 'el1', 'showBars')).toBe(true);
  });

  it('handles empty elementToggles object', () => {
    expect(elementToggle({}, globalToggles, 'el1', 'showLabels')).toBe(true);
  });
});
