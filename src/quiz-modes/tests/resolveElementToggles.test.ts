import type { ToggleDefinition } from '../ToggleDefinition';
import { resolveElementToggles } from '../resolveElementToggles';

const toggleDefs: ReadonlyArray<ToggleDefinition> = [
  { key: 'showBorders', label: 'Borders', defaultValue: true, group: 'display', hiddenBehavior: 'never' },
  { key: 'showDots', label: 'City dots', defaultValue: true, group: 'display', hiddenBehavior: 'on-reveal' },
  { key: 'showFlags', label: 'Flags', defaultValue: false, group: 'display', hiddenBehavior: { hintAfter: 2 } },
  { key: 'showNames', label: 'Names', defaultValue: true, group: 'display' }, // no hiddenBehavior
];

describe('resolveElementToggles', () => {
  it('returns empty when all toggles are on', () => {
    const globalToggles = { showBorders: true, showDots: true, showFlags: true, showNames: true };
    const result = resolveElementToggles(toggleDefs, globalToggles, {
      el1: { isAnswered: false, wrongAttempts: 0 },
    });
    expect(result).toEqual({});
  });

  it('returns empty when no toggles have hiddenBehavior', () => {
    const defs: ReadonlyArray<ToggleDefinition> = [
      { key: 'showBorders', label: 'Borders', defaultValue: true, group: 'display' },
    ];
    const result = resolveElementToggles(defs, { showBorders: false }, {
      el1: { isAnswered: false, wrongAttempts: 0 },
    });
    expect(result).toEqual({});
  });

  it('resolves never behavior to false for all elements', () => {
    const globalToggles = { showBorders: false, showDots: true, showFlags: true, showNames: true };
    const result = resolveElementToggles(toggleDefs, globalToggles, {
      el1: { isAnswered: true, wrongAttempts: 3 },
      el2: { isAnswered: false, wrongAttempts: 0 },
    });
    expect(result['el1']?.['showBorders']).toBe(false);
    expect(result['el2']?.['showBorders']).toBe(false);
  });

  it('resolves on-reveal to true when answered', () => {
    const globalToggles = { showBorders: true, showDots: false, showFlags: true, showNames: true };
    const result = resolveElementToggles(toggleDefs, globalToggles, {
      el1: { isAnswered: true, wrongAttempts: 0 },
      el2: { isAnswered: false, wrongAttempts: 0 },
    });
    expect(result['el1']?.['showDots']).toBe(true);
    expect(result['el2']?.['showDots']).toBe(false);
  });

  it('resolves hintAfter to true when wrong attempts reach threshold', () => {
    const globalToggles = { showBorders: true, showDots: true, showFlags: false, showNames: true };
    const result = resolveElementToggles(toggleDefs, globalToggles, {
      el1: { isAnswered: false, wrongAttempts: 1 },
      el2: { isAnswered: false, wrongAttempts: 2 },
      el3: { isAnswered: false, wrongAttempts: 5 },
    });
    expect(result['el1']?.['showFlags']).toBe(false);
    expect(result['el2']?.['showFlags']).toBe(true);
    expect(result['el3']?.['showFlags']).toBe(true);
  });

  it('resolves multiple off toggles for the same element', () => {
    const globalToggles = { showBorders: false, showDots: false, showFlags: false, showNames: true };
    const result = resolveElementToggles(toggleDefs, globalToggles, {
      el1: { isAnswered: true, wrongAttempts: 3 },
    });
    expect(result['el1']?.['showBorders']).toBe(false);
    expect(result['el1']?.['showDots']).toBe(true);
    expect(result['el1']?.['showFlags']).toBe(true);
  });

  it('handles empty element states', () => {
    const result = resolveElementToggles(toggleDefs, { showBorders: false }, {});
    expect(result).toEqual({});
  });
});
