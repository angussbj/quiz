import { renderHook, act } from '@testing-library/react';
import { usePanelLevel } from '../usePanelLevel';

beforeEach(() => {
  localStorage.clear();
});

describe('usePanelLevel', () => {
  it('returns "simple" as the default level', () => {
    const { result } = renderHook(() => usePanelLevel());
    expect(result.current.panelLevel).toBe('simple');
  });

  it('persists the chosen level to localStorage', () => {
    const { result } = renderHook(() => usePanelLevel());
    act(() => {
      result.current.setPanelLevel('advanced');
    });
    expect(result.current.panelLevel).toBe('advanced');
    expect(JSON.parse(localStorage.getItem('quizzical:panelLevel')!)).toBe('advanced');
  });

  it('loads a previously stored level', () => {
    localStorage.setItem('quizzical:panelLevel', JSON.stringify('full'));
    const { result } = renderHook(() => usePanelLevel());
    expect(result.current.panelLevel).toBe('full');
  });

  it('uses the key quizzical:panelLevel', () => {
    const { result } = renderHook(() => usePanelLevel());
    act(() => {
      result.current.setPanelLevel('full');
    });
    expect(localStorage.getItem('quizzical:panelLevel')).not.toBeNull();
    expect(localStorage.getItem('quizzical:level')).toBeNull();
  });
});
