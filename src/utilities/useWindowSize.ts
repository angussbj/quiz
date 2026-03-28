import { useState, useEffect } from 'react';

interface WindowSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Tracks window.innerWidth and window.innerHeight.
 * Updates on resize and on visualViewport resize (catches virtual keyboard changes on mobile).
 */
export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  }));

  useEffect(() => {
    function update() {
      const vv = window.visualViewport;
      setSize({
        width: vv?.width ?? window.innerWidth,
        height: vv?.height ?? window.innerHeight,
      });
    }

    window.addEventListener('resize', update);

    // visualViewport fires when the virtual keyboard appears/disappears on mobile.
    // window.resize doesn't always fire in that case.
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', update);
    }

    return () => {
      window.removeEventListener('resize', update);
      if (vv) {
        vv.removeEventListener('resize', update);
      }
    };
  }, []);

  return size;
}
