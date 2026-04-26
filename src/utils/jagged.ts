// Deterministic jagged edge path generator. Given a width and a seed,
// produces an SVG path `d` for a torn-paper top edge.
// The edge fluctuates in height using a tiny pseudo-random sequence so
// the same memo always has the same tear shape.

export function jaggedEdgePath(opts: {
  width: number;
  height: number; // total memo height
  tearDepth?: number; // how deep the tear fluctuates
  segments?: number; // how many jitter points
  seed?: number;
}): string {
  const { width, height, tearDepth = 6, segments = 18, seed = 1 } = opts;

  // Small LCG for deterministic noise
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };

  const step = width / segments;
  const points: Array<[number, number]> = [[0, tearDepth]];
  for (let i = 1; i <= segments; i++) {
    const x = i * step;
    const jitter = (rand() - 0.5) * tearDepth * 2;
    const y = Math.max(0, Math.min(tearDepth * 2, tearDepth + jitter));
    points.push([x, y]);
  }

  // Build path: start bottom-left, up to first jitter point, across the jagged
  // top, down the right side, and close.
  const [sx, sy] = points[0];
  let d = `M0,${height} L0,${sy} `;
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i];
    // Mid-control for subtle curve between jitter points
    const [px, py] = points[i - 1];
    const mx = (px + x) / 2;
    const my = (py + y) / 2;
    d += `Q${px.toFixed(2)},${py.toFixed(2)} ${mx.toFixed(2)},${my.toFixed(2)} `;
    d += `T${x.toFixed(2)},${y.toFixed(2)} `;
  }
  const lastX = points[points.length - 1][0];
  d += `L${lastX},${height} Z`;
  return d;
}

export function seedFromString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h || 1;
}
