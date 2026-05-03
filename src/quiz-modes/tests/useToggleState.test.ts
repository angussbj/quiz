import { act, renderHook } from '@testing-library/react';
import type { ToggleDefinition, TogglePreset } from '../ToggleDefinition';
import { useToggleState } from '../useToggleState';

const toggles: ReadonlyArray<ToggleDefinition> = [
  { key: 'show-labels', label: 'Show labels', defaultValue: true, group: 'display', hiddenBehavior: 'on-reveal' },
  { key: 'show-borders', label: 'Show borders', defaultValue: true, group: 'display', hiddenBehavior: 'never' },
  { key: 'show-flags', label: 'Show flags', defaultValue: false, group: 'display', hiddenBehavior: { hintAfter: 2 } },
  { key: 'accept-misspellings', label: 'Accept misspellings', defaultValue: true, group: 'difficulty', hiddenBehavior: 'never' },
];

const presets: ReadonlyArray<TogglePreset> = [
  {
    name: 'easy',
    label: 'Easy',
    values: { 'show-labels': true, 'show-borders': true, 'show-flags': true, 'accept-misspellings': true },
  },
  {
    name: 'hard',
    label: 'Hard',
    values: { 'show-labels': false, 'show-borders': false, 'show-flags': false, 'accept-misspellings': false },
  },
];

describe('useToggleState', () => {
  it('initializes values from toggle defaults', () => {
    const { result } = renderHook(() => useToggleState(toggles, presets));

    expect(result.current.values).toEqual({
      'show-labels': true,
      'show-borders': true,
      'show-flags': false,
      'accept-misspellings': true,
    });
  });

  it('sets an individual toggle', () => {
    const { result } = renderHook(() => useToggleState(toggles, presets));

    act(() => result.current.set('show-flags', true));

    expect(result.current.values['show-flags']).toBe(true);
  });

  it('preserves other values when setting one toggle', () => {
    const { result } = renderHook(() => useToggleState(toggles, presets));

    act(() => result.current.set('show-flags', true));

    expect(result.current.values['show-labels']).toBe(true);
    expect(result.current.values['show-borders']).toBe(true);
  });

  it('applies a preset', () => {
    const { result } = renderHook(() => useToggleState(toggles, presets));

    act(() => result.current.applyPreset(presets[1]));

    expect(result.current.values).toEqual({
      'show-labels': false,
      'show-borders': false,
      'show-flags': false,
      'accept-misspellings': false,
    });
  });

  it('detects the active preset when values match', () => {
    const { result } = renderHook(() => useToggleState(toggles, presets));

    act(() => result.current.applyPreset(presets[0]));

    expect(result.current.activePreset).toBe('easy');
  });

  it('returns undefined activePreset when no preset matches', () => {
    const { result } = renderHook(() => useToggleState(toggles, presets));

    expect(result.current.activePreset).toBeUndefined();
  });

  it('clears activePreset after individual toggle change breaks match', () => {
    const { result } = renderHook(() => useToggleState(toggles, presets));

    act(() => result.current.applyPreset(presets[0]));
    expect(result.current.activePreset).toBe('easy');

    act(() => result.current.set('show-flags', false));
    expect(result.current.activePreset).toBeUndefined();
  });

  it('resets to defaults', () => {
    const { result } = renderHook(() => useToggleState(toggles, presets));

    act(() => result.current.applyPreset(presets[1]));
    act(() => result.current.reset());

    expect(result.current.values).toEqual({
      'show-labels': true,
      'show-borders': true,
      'show-flags': false,
      'accept-misspellings': true,
    });
  });

  it('works with empty presets', () => {
    const { result } = renderHook(() => useToggleState(toggles, []));

    expect(result.current.activePreset).toBeUndefined();
    act(() => result.current.set('show-flags', true));
    expect(result.current.values['show-flags']).toBe(true);
  });

  it('works with empty toggles', () => {
    const { result } = renderHook(() => useToggleState([], []));

    expect(result.current.values).toEqual({});
  });

  it('matches first preset when multiple match', () => {
    const duplicatePresets: ReadonlyArray<TogglePreset> = [
      { name: 'first', label: 'First', values: { 'show-labels': true } },
      { name: 'second', label: 'Second', values: { 'show-labels': true } },
    ];
    const { result } = renderHook(() => useToggleState(toggles, duplicatePresets));

    expect(result.current.activePreset).toBe('first');
  });

  describe('applyDifficulty', () => {
    it('applies toggleOverrides from the difficulty preset', () => {
      const { result } = renderHook(() => useToggleState(toggles, presets));
      act(() => {
        result.current.applyDifficulty({
          label: 'Hard',
          mode: 'identify',
          toggleOverrides: { 'show-labels': false, 'show-flags': true },
        });
      });
      expect(result.current.values['show-labels']).toBe(false);
      expect(result.current.values['show-flags']).toBe(true);
    });

    it('applies selectToggleOverrides from the difficulty preset', () => {
      const selectToggles = [
        {
          key: 'precision',
          label: 'Precision',
          options: [{ value: 'year', label: 'Year' }, { value: 'day', label: 'Day' }],
          defaultValue: 'year',
          group: 'display',
        },
      ];
      const { result } = renderHook(() => useToggleState(toggles, presets, selectToggles));
      act(() => {
        result.current.applyDifficulty({
          label: 'Hard',
          mode: 'identify',
          selectToggleOverrides: { precision: 'day' },
        });
      });
      expect(result.current.selectValues['precision']).toBe('day');
    });

    it('does nothing when neither toggleOverrides nor selectToggleOverrides are provided', () => {
      const { result } = renderHook(() => useToggleState(toggles, presets));
      const before = result.current.values;
      act(() => {
        result.current.applyDifficulty({ label: 'Easy', mode: 'locate' });
      });
      expect(result.current.values).toEqual(before);
    });

    it('merges with existing values, not replacing unrelated keys', () => {
      const { result } = renderHook(() => useToggleState(toggles, presets));
      act(() => {
        result.current.set('show-borders', false);
      });
      act(() => {
        result.current.applyDifficulty({
          label: 'Hard',
          mode: 'identify',
          toggleOverrides: { 'show-labels': false },
        });
      });
      expect(result.current.values['show-borders']).toBe(false);
      expect(result.current.values['show-labels']).toBe(false);
    });
  });
});
