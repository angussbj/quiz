import type { VisualizationRendererProps } from './VisualizationRendererProps';

/**
 * Look up a per-element toggle, falling back to the global toggle value.
 * Defaults to true (show) when neither per-element nor global toggle is set,
 * so features are visible unless explicitly toggled off.
 */
export function elementToggle(
  elementToggles: VisualizationRendererProps['elementToggles'],
  toggles: Readonly<Record<string, boolean>>,
  elementId: string,
  toggleKey: string,
): boolean {
  return elementToggles?.[elementId]?.[toggleKey] ?? toggles[toggleKey] ?? true;
}
