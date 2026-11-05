import { INVESTIGATOR_BY_ID } from '../engine/data/investigators';
import { investigatorUrl } from './assets';

/** Sheet scans are 769×554. The 7…0 tracks run down the left (Sanity) and right (Strength) edges. */
const W = 769;
const H = 554;
const DIGIT = 36; // height of one track number on the scan
/** Measured per sheet: top of the "7" and bottom of the "0" on each track, in scan pixels. */
const TRACKS: Record<string, { san: [number, number]; str: [number, number] }> = {
  carolyn_fern: { san: [49, 507], str: [44, 498] },
  gloria_goldberg: { san: [56, 514], str: [51, 505] },
  harvey_walters: { san: [49, 507], str: [44, 498] },
  jenny_barnes: { san: [52, 510], str: [47, 501] },
  joe_diamond: { san: [54, 512], str: [49, 503] },
  mandy_thompson: { san: [52, 510], str: [47, 501] },
  monterey_jack: { san: [54, 512], str: [49, 503] },
  vincent_lee: { san: [56, 514], str: [51, 505] },
};
const FALLBACK = { san: [53, 511] as [number, number], str: [48, 502] as [number, number] };
/** Horizontal centre of the numbers on each track. */
const SAN_X = 50;
const STR_X = 727;
/** The clips stick out past the paper, so the drawing extends beyond the scan on both sides. */
const PAD = 90;

function trackY(track: [number, number], value: number) {
  const [top, bottom] = track;
  const step = (bottom - top - DIGIT) / 7;
  const v = Math.max(0, Math.min(7, value));
  return top + DIGIT / 2 + (7 - v) * step;
}

/** Perceived brightness, to pick a contrasting outline for dark pawns. */
function isDark(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 90;
}

/**
 * A paper clip lying horizontally, gripping the sheet edge. Drawn pointing right from x = 0;
 * the wires sit at ±7 and ±15 so the clip is about as tall as a track number.
 */
const CLIP_PATH = 'M 24 -7 L 62 -7 A 7 7 0 0 1 62 7 L 11 7 A 11 11 0 0 1 11 -15 L 70 -15 A 15 15 0 0 1 70 15 L 30 15';
const CLIP_LEN = 85;
/** Drawn larger than life so the clip still reads on the small dock thumbnail. */
const CLIP_SCALE = 1.3;
const REACH = CLIP_LEN * CLIP_SCALE;

function Clip({ x, y, flip, color, label }: { x: number; y: number; flip: boolean; color: string; label: string }) {
  const outline = isDark(color) ? '#f5f0e6' : '#1c1917';
  // The clip's inner end overlaps the paper margin; the rest hangs off the edge.
  const transform = `translate(${x}px, ${y}px) scale(${flip ? -CLIP_SCALE : CLIP_SCALE}, ${CLIP_SCALE})`;
  return (
    <g style={{ transform, transition: 'transform 450ms cubic-bezier(.3,1.4,.5,1)' }} aria-label={label}>
      <path d={CLIP_PATH} fill="none" stroke={outline} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
      <path d={CLIP_PATH} fill="none" stroke={color} strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d={CLIP_PATH} fill="none" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" opacity={0.45} transform="translate(0,-1.6)" />
    </g>
  );
}

function Marker({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <rect
      x={x - 26} y={-24} width={52} height={48} rx={10}
      fill={color} fillOpacity={0.16} stroke={color} strokeWidth={4}
      style={{ transform: `translateY(${y}px)`, transition: 'transform 450ms cubic-bezier(.3,1.4,.5,1)' }}
    />
  );
}

interface Props {
  defId: string;
  str: number;
  san: number;
  className?: string;
  /** Hide the clips (e.g. an investigator not yet chosen on the setup screen). */
  bare?: boolean;
}

/** The original investigator sheet with paper clips in the investigator's colour on Sanity and Strength. */
export function Sheet({ defId, str, san, className, bare }: Props) {
  const d = INVESTIGATOR_BY_ID[defId];
  const t = TRACKS[defId] ?? FALLBACK;
  const color = d?.pawn ?? '#b45309';
  const sanY = trackY(t.san, san);
  const strY = trackY(t.str, str);
  return (
    <svg
      viewBox={`${-PAD} 0 ${W + 2 * PAD} ${H}`}
      className={className}
      role="img"
      aria-label={`${d?.name ?? defId}: Strength ${str}, Sanity ${san}`}
    >
      <image href={investigatorUrl(defId)} x={0} y={0} width={W} height={H} />
      {!bare && (
        <>
          <Marker x={SAN_X} y={sanY} color={color} />
          <Marker x={STR_X} y={strY} color={color} />
          {/* Sanity clip grips the left edge, Strength clip the right edge. */}
          <Clip x={-REACH + 26} y={sanY} flip={false} color={color} label={`Sanity ${san}`} />
          <Clip x={W + REACH - 26} y={strY} flip color={color} label={`Strength ${str}`} />
        </>
      )}
    </svg>
  );
}
