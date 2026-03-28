/**
 * Responsive breakpoints based on window dimensions.
 * All responsive behavior should use these constants for consistency.
 *
 * Width breakpoints: narrow (phone portrait), medium (phone landscape/small tablet), wide (desktop).
 * Height breakpoints: short (virtual keyboard visible or very small screen).
 */

/** Below this width, collapse buttons into overflow menus. */
export const NARROW_WIDTH = 480;

/** Below this width, use compact padding but keep buttons visible. */
export const MEDIUM_WIDTH = 640;

/** Below this height, reduce controls area to give visualization more space. */
export const SHORT_HEIGHT = 500;

/** Below this height, use minimal controls (virtual keyboard likely open). */
export const VERY_SHORT_HEIGHT = 360;
