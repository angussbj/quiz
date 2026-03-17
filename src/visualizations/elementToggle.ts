import type { VisualizationRendererProps } from './VisualizationRendererProps';

/** Look up a per-element toggle, falling back to the global toggle value. */
export function elementToggle(
  elementToggles: VisualizationRendererProps['elementToggles'],
  toggles: Readonly<Record<string, boolean>>,
  elementId: string,
  toggleKey: string,
): boolean {
  return elementToggles?.[elementId]?.[toggleKey] ?? toggles[toggleKey] ?? false;
}
