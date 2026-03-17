import type { ElementCluster } from './VisualizationRendererProps';

interface ClusterBadgeProps {
  readonly cluster: ElementCluster;
  readonly onClick?: (cluster: ElementCluster) => void;
}

/** Badge showing count of clustered elements at low zoom. Placeholder. */
export function ClusterBadge({ cluster, onClick }: ClusterBadgeProps) {
  return (
    <g onClick={() => onClick?.(cluster)}>
      <circle cx={cluster.center.x} cy={cluster.center.y} r={12} />
      <text x={cluster.center.x} y={cluster.center.y} textAnchor="middle" dominantBaseline="central">
        {cluster.count}
      </text>
    </g>
  );
}
