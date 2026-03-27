import { motion, AnimatePresence } from 'framer-motion';
import type { ElementVisualState } from './VisualizationElement';
import { STATUS_COLORS } from './elementStateColors';

interface RevealPulseProps {
  /** Center X in viewBox coordinates */
  readonly x: number;
  /** Center Y in viewBox coordinates */
  readonly y: number;
  /** Radius of the pulse ring in viewBox units */
  readonly radius: number;
  /** Visual state of the revealed element (determines pulse color) */
  readonly state: ElementVisualState;
  /** Unique key for AnimatePresence tracking */
  readonly pulseKey: string;
}

/**
 * A gentle expanding ring that pulses once to draw attention
 * to an auto-revealed element. Uses the element's state color.
 *
 * Renders as an SVG circle that scales up and fades out.
 * Place inside an SVG `<g>` or as part of the renderer's overlay layer.
 */
export function RevealPulse({ x, y, radius, state, pulseKey }: RevealPulseProps) {
  if (state === 'hidden') return null;
  const color = STATUS_COLORS[state].main;

  return (
    <AnimatePresence>
      <motion.g
        key={pulseKey}
        style={{ x, y }}
        initial={{ scale: 0.6, opacity: 0.8 }}
        animate={{
          scale: [0.6, 1.6],
          opacity: [0.8, 0],
        }}
        transition={{
          duration: 1.0,
          ease: 'easeOut',
          times: [0, 1],
        }}
      >
        <circle
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={radius * 0.15}
        />
      </motion.g>
    </AnimatePresence>
  );
}

interface RevealPulseLayerProps {
  /** Element positions and states to render pulses for */
  readonly pulses: ReadonlyArray<{
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly radius: number;
    readonly state: ElementVisualState;
  }>;
}

/**
 * Renders a layer of RevealPulse rings for multiple elements.
 * Use this as an SVG overlay in renderers.
 */
export function RevealPulseLayer({ pulses }: RevealPulseLayerProps) {
  if (pulses.length === 0) return null;

  return (
    <g className="reveal-pulse-layer" pointerEvents="none">
      {pulses.map((pulse) => (
        <RevealPulse
          key={pulse.id}
          pulseKey={pulse.id}
          x={pulse.x}
          y={pulse.y}
          radius={pulse.radius}
          state={pulse.state}
        />
      ))}
    </g>
  );
}
