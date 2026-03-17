/**
 * An entry in the hierarchical navigation tree.
 * Full URL path is computed by traversal from root.
 */
export interface NavigationNode {
  readonly label: string;
  readonly children: ReadonlyArray<NavigationNode>;
  /** Quiz definition ID if this is a leaf node */
  readonly quizId?: string;
}
