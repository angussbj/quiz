import type { ToggleConstraint } from '../ToggleConstraint';
import { resolveToggleConstraints } from '../resolveToggleConstraints';

describe('resolveToggleConstraints', () => {
  it('returns empty results when no constraints', () => {
    const result = resolveToggleConstraints([], { a: true });
    expect(result.forcedValues).toEqual({});
    expect(result.preventDisable).toEqual(new Set());
  });

  it('forces a toggle value', () => {
    const constraints: ReadonlyArray<ToggleConstraint> = [
      { type: 'forced', key: 'showCityDots', forcedValue: true, reason: 'Required for identify mode' },
    ];
    const result = resolveToggleConstraints(constraints, { showCityDots: false });
    expect(result.forcedValues).toEqual({ showCityDots: true });
    expect(result.reasons).toEqual({ showCityDots: 'Required for identify mode' });
  });

  it('prevents disabling the last enabled toggle in an atLeastOne group', () => {
    const constraints: ReadonlyArray<ToggleConstraint> = [
      { type: 'atLeastOne', keys: ['showCountryNames', 'showPromptFlags'], reason: 'Need at least one hint' },
    ];
    const result = resolveToggleConstraints(constraints, { showCountryNames: true, showPromptFlags: false });
    expect(result.preventDisable).toEqual(new Set(['showCountryNames']));
    expect(result.reasons).toEqual({ showCountryNames: 'Need at least one hint' });
  });

  it('does not prevent disable when multiple toggles in group are on', () => {
    const constraints: ReadonlyArray<ToggleConstraint> = [
      { type: 'atLeastOne', keys: ['showCountryNames', 'showPromptFlags'], reason: 'Need at least one hint' },
    ];
    const result = resolveToggleConstraints(constraints, { showCountryNames: true, showPromptFlags: true });
    expect(result.preventDisable).toEqual(new Set());
  });

  it('forces the first key on when all toggles in an atLeastOne group are off', () => {
    const constraints: ReadonlyArray<ToggleConstraint> = [
      { type: 'atLeastOne', keys: ['showCountryNames', 'showPromptFlags'], reason: 'Need at least one hint' },
    ];
    const result = resolveToggleConstraints(constraints, { showCountryNames: false, showPromptFlags: false });
    expect(result.forcedValues).toEqual({ showCountryNames: true });
    expect(result.reasons).toEqual({ showCountryNames: 'Need at least one hint' });
  });

  it('treats select value "on" as enabled in atLeastOne', () => {
    const constraints: ReadonlyArray<ToggleConstraint> = [
      { type: 'atLeastOne', keys: ['showCountryNames', 'showPromptFlags'], reason: 'Need one' },
    ];
    const result = resolveToggleConstraints(constraints, { showCountryNames: false }, { showPromptFlags: 'on' });
    expect(result.preventDisable).toEqual(new Set(['showPromptFlags']));
  });

  it('treats select value "hint" as not enabled in atLeastOne (hint only shows after a wrong attempt)', () => {
    const constraints: ReadonlyArray<ToggleConstraint> = [
      { type: 'atLeastOne', keys: ['showCountryNames', 'showPromptFlags'], reason: 'Need one' },
    ];
    const result = resolveToggleConstraints(constraints, { showCountryNames: false }, { showPromptFlags: 'hint' });
    expect(result.forcedValues).toEqual({ showCountryNames: true });
  });

  it('treats off select value as disabled in atLeastOne', () => {
    const constraints: ReadonlyArray<ToggleConstraint> = [
      { type: 'atLeastOne', keys: ['showCountryNames', 'showPromptFlags'], reason: 'Need one' },
    ];
    const result = resolveToggleConstraints(constraints, { showCountryNames: false }, { showPromptFlags: 'off' });
    expect(result.forcedValues).toEqual({ showCountryNames: true });
  });

  it('handles multiple constraints', () => {
    const constraints: ReadonlyArray<ToggleConstraint> = [
      { type: 'forced', key: 'showCityDots', forcedValue: true, reason: 'Required' },
      { type: 'atLeastOne', keys: ['a', 'b'], reason: 'Need one' },
    ];
    const result = resolveToggleConstraints(constraints, { showCityDots: false, a: true, b: false });
    expect(result.forcedValues).toEqual({ showCityDots: true });
    expect(result.preventDisable).toEqual(new Set(['a']));
  });
});
