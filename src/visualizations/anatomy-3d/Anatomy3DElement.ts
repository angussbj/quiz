import type { VisualizationElement } from '../VisualizationElement';

/** A single mesh entry within a 3D bone element. */
export interface Anatomy3DMeshEntry {
  /** Name of the mesh in the GLB scene (always the .r or no-suffix version). */
  readonly meshName: string;
  /** Which side this mesh represents. */
  readonly side: 'left' | 'right' | 'midline';
  /**
   * When true, this mesh is physically present in the GLB scene with exactly this name.
   * When false (left-side .r bones), the renderer generates the left side by x-mirroring
   * the right-side mesh.
   */
  readonly directMesh: boolean;
}

/**
 * A 3D skeleton bone element.
 *
 * `viewBoxCenter` carries the 3D position in model space (cm, y-up).
 * The z coordinate uses the optional `z` field added to ViewBoxPosition.
 *
 * When elements are grouped (bilateral or numbered), `meshEntries` contains
 * ALL constituent meshes. Every mesh in the group displays the same state,
 * responds to the same click, and gets its own label sprite.
 */
export interface Anatomy3DElement extends VisualizationElement {
  /**
   * All meshes that belong to this element. For ungrouped bones this is a single entry.
   * For bilateral groups it's 2 entries (left + right). For numbered groups it can be many.
   */
  readonly meshEntries: ReadonlyArray<Anatomy3DMeshEntry>;
}

export function isAnatomy3DElement(el: VisualizationElement): el is Anatomy3DElement {
  return 'meshEntries' in el;
}
