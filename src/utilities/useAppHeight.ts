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
      const vv = window.visualViewport;
      const height = vv?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${height}px`);

      // iOS scrolls the page when the keyboard opens to keep the input visible.
      // Since our layout is sized to the visual viewport, we don't need that —
      // force scroll back to the top so the layout stays pinned.
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
      if (vv && vv.offsetTop !== 0) {
        window.scrollTo(0, 0);
      }
    }

    update();

    window.addEventListener('resize', update);
    window.addEventListener('scroll', update);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
    }

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update);
      if (vv) {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      }
    };
  }, []);
}
