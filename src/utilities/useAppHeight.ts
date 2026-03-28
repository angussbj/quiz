import { useEffect } from 'react';

/**
 * Sets a --app-height CSS custom property on <html> to the visual viewport height.
 * On iOS, the virtual keyboard is an overlay — dvh/vh don't change when it opens.
 * This hook uses the visualViewport API to track the actual visible height and
 * exposes it as a CSS variable so the layout can size itself correctly.
 */
export function useAppHeight(): void {
  useEffect(() => {
    function update() {
      const height = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${height}px`);
    }

    update();

    window.addEventListener('resize', update);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
    }

    return () => {
      window.removeEventListener('resize', update);
      if (vv) {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      }
    };
  }, []);
}
