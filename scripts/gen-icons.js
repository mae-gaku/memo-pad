// Generates app icons + splash matching the landing page design.
// Concept: a torn memo sheet — paper rectangle with a jagged top edge, a few
// faint writing lines inside, and a small mono wordmark beneath. The torn
// edge directly signals the app's core gesture.
// Run:  node scripts/gen-icons.js

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'assets');

// Palette (mirrors src/theme/tokens.ts)
const INK = '#09090B';
const INK_GHOST = '#A1A1AA';
const BORDER = '#D4D4D8';
const BORDER_SOFT = '#E4E4E7';
const GRID = '#EEEEEF';

// Deterministic jagged top-edge path. Starts bottom-left, goes up the left,
// zig-zags across the top, comes down the right, closes along the bottom.
function tornPath({ x, y, w, h, r, depth, segments, seed }) {
  // simple seeded rng
  let s = seed >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };

  const top = y;
  const left = x;
  const right = x + w;
  const bottom = y + h;

  const pts = [];
  pts.push(`M ${left} ${bottom - r}`);
  pts.push(`L ${left} ${top + r}`);
  // slight top-left chip into tear line
  pts.push(`Q ${left} ${top} ${left + r} ${top}`);

  // Jagged top
  const span = right - (left + r * 2);
  const step = span / segments;
  for (let i = 1; i <= segments; i++) {
    const px = left + r + step * i;
    // alternate above/below the nominal top line
    const jitter = (rnd() - 0.4) * depth * (i === segments ? 0.3 : 1);
    const py = top + jitter;
    pts.push(`L ${px} ${py}`);
  }

  pts.push(`Q ${right} ${top} ${right} ${top + r}`);
  pts.push(`L ${right} ${bottom - r}`);
  pts.push(`Q ${right} ${bottom} ${right - r} ${bottom}`);
  pts.push(`L ${left + r} ${bottom}`);
  pts.push(`Q ${left} ${bottom} ${left} ${bottom - r}`);
  pts.push('Z');
  return pts.join(' ');
}

function svg({
  size = 1024,
  bg = '#FFFFFF',
  showFrame = true,
  showGrid = true,
  showCornerTicks = true,
  showMono = true,
  scale = 1,
  tornSeed = 7,
}) {
  const S = size;
  const cx = S / 2;

  // Sheet geometry (centered, biased slightly up so mono label fits below)
  const sheetW = S * 0.56;
  const sheetH = S * 0.62;
  const sheetX = cx - sheetW / 2;
  const sheetY = S * 0.17;
  const sheetR = Math.max(2, S * 0.008);
  const tearDepth = S * 0.02;
  const tearSegments = 18;

  // Grid background
  const gap = S / 14;
  const gridLines = [];
  if (showGrid) {
    for (let i = 1; i < Math.ceil(S / gap); i++) {
      const p = i * gap;
      gridLines.push(
        `<line x1="${p}" y1="0" x2="${p}" y2="${S}" stroke="${GRID}" stroke-width="1"/>`,
        `<line x1="0" y1="${p}" x2="${S}" y2="${p}" stroke="${GRID}" stroke-width="1"/>`
      );
    }
  }

  // Corner ticks
  const tickLen = S * 0.045;
  const tickStroke = Math.max(2, S * 0.0028);
  const tickInset = S * 0.1;
  const tc = INK_GHOST;
  const corners = showCornerTicks
    ? [
        `<line x1="${tickInset}" y1="${tickInset}" x2="${tickInset + tickLen}" y2="${tickInset}" stroke="${tc}" stroke-width="${tickStroke}"/>`,
        `<line x1="${tickInset}" y1="${tickInset}" x2="${tickInset}" y2="${tickInset + tickLen}" stroke="${tc}" stroke-width="${tickStroke}"/>`,
        `<line x1="${S - tickInset}" y1="${tickInset}" x2="${S - tickInset - tickLen}" y2="${tickInset}" stroke="${tc}" stroke-width="${tickStroke}"/>`,
        `<line x1="${S - tickInset}" y1="${tickInset}" x2="${S - tickInset}" y2="${tickInset + tickLen}" stroke="${tc}" stroke-width="${tickStroke}"/>`,
        `<line x1="${tickInset}" y1="${S - tickInset}" x2="${tickInset + tickLen}" y2="${S - tickInset}" stroke="${tc}" stroke-width="${tickStroke}"/>`,
        `<line x1="${tickInset}" y1="${S - tickInset}" x2="${tickInset}" y2="${S - tickInset - tickLen}" stroke="${tc}" stroke-width="${tickStroke}"/>`,
        `<line x1="${S - tickInset}" y1="${S - tickInset}" x2="${S - tickInset - tickLen}" y2="${S - tickInset}" stroke="${tc}" stroke-width="${tickStroke}"/>`,
        `<line x1="${S - tickInset}" y1="${S - tickInset}" x2="${S - tickInset}" y2="${S - tickInset - tickLen}" stroke="${tc}" stroke-width="${tickStroke}"/>`,
      ].join('')
    : '';

  // Frame
  const frameInset = S * 0.065;
  const frame = showFrame
    ? `<rect x="${frameInset}" y="${frameInset}" width="${S - frameInset * 2}" height="${S - frameInset * 2}" fill="none" stroke="${BORDER_SOFT}" stroke-width="${Math.max(1, S * 0.0016)}"/>`
    : '';

  // Torn sheet
  const d = tornPath({
    x: sheetX,
    y: sheetY,
    w: sheetW,
    h: sheetH,
    r: sheetR,
    depth: tearDepth,
    segments: tearSegments,
    seed: tornSeed,
  });
  const sheet = `
    <path d="${d}" fill="#FFFFFF" stroke="${BORDER}" stroke-width="${Math.max(1.2, S * 0.002)}" stroke-linejoin="round" stroke-linecap="round"/>
  `;

  // Perforation dots across the tear line (tech feel)
  const perfY = sheetY - S * 0.015;
  const perfCount = 7;
  const perfSpan = sheetW * 0.78;
  const perfStart = cx - perfSpan / 2;
  const perfR = S * 0.0075;
  const perfs = Array.from({ length: perfCount })
    .map((_, i) => {
      const px = perfStart + (perfSpan / (perfCount - 1)) * i;
      return `<circle cx="${px}" cy="${perfY}" r="${perfR}" fill="${INK_GHOST}"/>`;
    })
    .join('');

  // Writing lines inside the sheet — 3 lines, widths tapering down
  const innerPadX = sheetW * 0.14;
  const lineStartY = sheetY + sheetH * 0.3;
  const lineGapY = sheetH * 0.14;
  const lineH = Math.max(4, S * 0.011);
  const lineX = sheetX + innerPadX;
  const lineMaxW = sheetW - innerPadX * 2;
  const widths = [lineMaxW, lineMaxW * 0.82, lineMaxW * 0.48];
  const lines = widths
    .map((lw, i) => {
      const ly = lineStartY + lineGapY * i;
      return `<rect x="${lineX}" y="${ly}" width="${lw}" height="${lineH}" rx="${lineH / 2}" fill="${INK}"/>`;
    })
    .join('');

  // Accent dot (suggests a pin/status) — top-right of sheet
  const accent = `<circle cx="${sheetX + sheetW - S * 0.06}" cy="${sheetY + sheetH * 0.18}" r="${S * 0.012}" fill="${INK}"/>`;

  // Mono wordmark beneath the sheet
  const monoY = sheetY + sheetH + S * 0.08;
  const monoFs = S * 0.045;
  const mono = showMono
    ? `
      <text x="${cx}" y="${monoY}" text-anchor="middle"
            font-family="ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
            font-weight="500" font-size="${monoFs}" fill="${INK}"
            letter-spacing="${monoFs * 0.18}">memo · pad</text>
    `
    : '';

  const content = `
    ${gridLines.join('')}
    ${frame}
    ${corners}
    ${perfs}
    ${sheet}
    ${lines}
    ${accent}
    ${mono}
  `;

  const inner = scale !== 1
    ? `<g transform="translate(${(1 - scale) * cx} ${(1 - scale) * (S / 2)}) scale(${scale})">${content}</g>`
    : content;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <rect width="${S}" height="${S}" fill="${bg}"/>
  ${inner}
</svg>`;
}

async function writePng(str, outPath, size) {
  const buf = await sharp(Buffer.from(str), { density: 384 })
    .resize(size, size, { fit: 'contain' })
    .png()
    .toBuffer();
  fs.writeFileSync(outPath, buf);
  console.log('  →', path.relative(process.cwd(), outPath), `(${size}x${size})`);
}

(async () => {
  console.log('Generating assets…');

  // App icon: full composition
  await writePng(svg({ size: 1024, bg: '#FFFFFF' }), path.join(OUT, 'icon.png'), 1024);

  // Adaptive icon (Android): scale content into 66% safe zone, drop grid/frame
  await writePng(
    svg({
      size: 1024,
      bg: '#FFFFFF',
      showGrid: false,
      showFrame: false,
      showCornerTicks: false,
      scale: 0.78,
    }),
    path.join(OUT, 'adaptive-icon.png'),
    1024
  );

  // Splash: focused — torn sheet only, no chrome
  await writePng(
    svg({
      size: 1024,
      bg: '#FFFFFF',
      showGrid: false,
      showFrame: false,
      showCornerTicks: false,
    }),
    path.join(OUT, 'splash-icon.png'),
    1024
  );

  // Favicon: simplify further (no mono label → stays legible at 32/48)
  await writePng(
    svg({
      size: 256,
      bg: '#FFFFFF',
      showGrid: false,
      showFrame: false,
      showCornerTicks: false,
      showMono: false,
    }),
    path.join(OUT, 'favicon.png'),
    48
  );

  console.log('Done.');
})();
