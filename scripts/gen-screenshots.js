// Generates iPhone 6.7" (1290x2796) screenshots of the three main screens:
//   - Landing
//   - Pad (writing)
//   - Board (wall with pinned memos)
// Fonts: Latin only (WSL has no Japanese fonts), so all overlays are English.
// Run:  node scripts/gen-screenshots.js

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// ─── Canvas ─────────────────────────────────────────────────────────────────
const W = 1290;
const H = 2796;
const OUT_DIR = path.join(__dirname, '..', 'marketing');

// ─── Palette ────────────────────────────────────────────────────────────────
const INK = '#09090B';
const INK_MUTED = '#71717A';
const INK_GHOST = '#A1A1AA';
const BORDER = '#D4D4D8';
const BORDER_SOFT = '#E4E4E7';
const GRID = '#EEEEEF';
const SURFACE = '#F4F4F5';
const PAPER = '#FFFFFF';
const PRIORITY_HIGH = '#DC2626';
const PRIORITY_HIGH_PAPER = '#FEE2E2';
const PRIORITY_MID = '#D97706';
const PRIORITY_MID_PAPER = '#FEF3C7';

// ─── Helpers ────────────────────────────────────────────────────────────────
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function tornEdgePath(x, y, w, h, segments = 22, depth = 14, seed = 7) {
  const rand = seeded(seed);
  const pts = [];
  pts.push(`M ${x} ${y + h}`);
  pts.push(`L ${x} ${y + depth}`);
  const step = w / segments;
  for (let i = 0; i <= segments; i++) {
    const px = x + i * step;
    const py = y + (rand() - 0.3) * depth * 1.5;
    pts.push(`L ${px} ${py}`);
  }
  pts.push(`L ${x + w} ${y + h}`);
  pts.push('Z');
  return pts.join(' ');
}

function gridLines({ gap = 64, color = GRID } = {}) {
  const out = [];
  for (let x = gap; x < W; x += gap) {
    out.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${color}" stroke-width="1"/>`);
  }
  for (let y = gap; y < H; y += gap) {
    out.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${color}" stroke-width="1"/>`);
  }
  return out.join('');
}

function dottedBoard({ gap = 72, color = BORDER } = {}) {
  const out = [];
  for (let y = 260; y < H - 140; y += gap) {
    for (let x = 160; x < W - 160; x += gap) {
      out.push(`<circle cx="${x}" cy="${y}" r="2" fill="${color}"/>`);
    }
  }
  return out.join('');
}

function cornerTicks({ inset = 90, len = 44, stroke = 2, color = BORDER } = {}) {
  const ti = inset;
  const tl = len;
  return `
    <g stroke="${color}" stroke-width="${stroke}">
      <line x1="${ti}" y1="${ti}" x2="${ti + tl}" y2="${ti}"/>
      <line x1="${ti}" y1="${ti}" x2="${ti}" y2="${ti + tl}"/>
      <line x1="${W - ti}" y1="${ti}" x2="${W - ti - tl}" y2="${ti}"/>
      <line x1="${W - ti}" y1="${ti}" x2="${W - ti}" y2="${ti + tl}"/>
      <line x1="${ti}" y1="${H - ti}" x2="${ti + tl}" y2="${H - ti}"/>
      <line x1="${ti}" y1="${H - ti}" x2="${ti}" y2="${H - ti - tl}"/>
      <line x1="${W - ti}" y1="${H - ti}" x2="${W - ti - tl}" y2="${H - ti}"/>
      <line x1="${W - ti}" y1="${H - ti}" x2="${W - ti}" y2="${H - ti - tl}"/>
    </g>
  `;
}

function topMeta({ rightText = 'NO_001 / 2026.04' } = {}) {
  return `
    <g font-family="ui-monospace, Menlo, monospace" font-size="32" letter-spacing="3.5" fill="${INK_MUTED}">
      <circle cx="160" cy="216" r="10" fill="${INK}"/>
      <circle cx="160" cy="216" r="16" fill="none" stroke="${INK}" stroke-width="2" opacity="0.25"/>
      <text x="192" y="228">READY</text>
      <text x="${W - 160}" y="228" text-anchor="end">${rightText}</text>
    </g>
  `;
}

function statusBar() {
  // Decorative iPhone-like status bar (not a real iOS bar — just enough to feel native)
  return `
    <g font-family="Inter, -apple-system, sans-serif" font-weight="500" fill="${INK}">
      <text x="110" y="112" font-size="38">9:41</text>
      <g transform="translate(${W - 360} 82)">
        <!-- signal dots -->
        <rect x="0" y="10" width="6" height="20" rx="1" fill="${INK}"/>
        <rect x="10" y="6" width="6" height="24" rx="1" fill="${INK}"/>
        <rect x="20" y="2" width="6" height="28" rx="1" fill="${INK}"/>
        <rect x="30" y="-2" width="6" height="32" rx="1" fill="${INK}"/>
        <!-- wifi -->
        <g transform="translate(66 4) scale(1.2)" fill="${INK}">
          <path d="M0 12 Q12 0 24 12 L22 14 Q12 3 2 14 Z"/>
          <path d="M4 16 Q12 7 20 16 L18 18 Q12 10 6 18 Z"/>
          <circle cx="12" cy="22" r="2.5"/>
        </g>
        <!-- battery -->
        <g transform="translate(142 4)" fill="none" stroke="${INK}" stroke-width="2">
          <rect x="0" y="0" width="58" height="28" rx="6"/>
        </g>
        <rect x="146" y="8" width="46" height="16" rx="2" fill="${INK}"/>
        <rect x="194" y="12" width="4" height="10" rx="1" fill="${INK}"/>
      </g>
    </g>
  `;
}

// ─── Landing ────────────────────────────────────────────────────────────────
function renderLanding() {
  const cx = W / 2;
  const cy = H / 2;
  const sheetW = 860;
  const sheetH = 1040;
  const sx = cx - sheetW / 2;
  const sy = cy - sheetH / 2 - 120;

  // Perforation dots above sheet
  const perfY = sy - 28;
  const perfCount = 9;
  const perfs = Array.from({ length: perfCount }).map((_, i) => {
    const px = sx + sheetW * 0.04 + (sheetW * 0.92 / (perfCount - 1)) * i;
    return `<circle cx="${px}" cy="${perfY}" r="7" fill="${INK_GHOST}"/>`;
  }).join('');

  const d = tornEdgePath(sx, sy, sheetW, sheetH, 24, 18, 7);

  // Writing lines inside
  const innerPadX = 70;
  const lineY0 = sy + 240;
  const lineGap = 84;
  const lineH = 16;
  const lineMaxW = sheetW - innerPadX * 2;
  const widths = [lineMaxW, lineMaxW * 0.82, lineMaxW * 0.48];
  const lines = widths.map((lw, i) => {
    return `<rect x="${sx + innerPadX}" y="${lineY0 + lineGap * i}" width="${lw}" height="${lineH}" rx="${lineH / 2}" fill="${INK}"/>`;
  }).join('');

  // Pin dot inside sheet (top-right)
  const pinX = sx + sheetW - 90;
  const pinY = sy + 100;

  // Wordmark inside sheet near bottom
  const wmY = sy + sheetH - 120;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${SURFACE}"/>
  ${gridLines()}
  ${statusBar()}
  ${cornerTicks()}
  ${topMeta()}

  ${perfs}
  <path d="${d}" fill="${PAPER}" stroke="${BORDER}" stroke-width="2.5" stroke-linejoin="round"/>
  ${lines}
  <circle cx="${pinX}" cy="${pinY}" r="16" fill="${INK}"/>
  <circle cx="${pinX}" cy="${pinY}" r="22" fill="none" stroke="${INK}" stroke-width="2" opacity="0.2"/>

  <!-- wordmark inside sheet -->
  <line x1="${cx - 80}" y1="${wmY - 22}" x2="${cx + 80}" y2="${wmY - 22}" stroke="${BORDER}" stroke-width="1.5"/>
  <text x="${cx}" y="${wmY + 10}" text-anchor="middle"
    font-family="ui-monospace, Menlo, monospace" font-size="42" letter-spacing="9" fill="${INK}">memo · pad</text>
  <line x1="${cx - 80}" y1="${wmY + 30}" x2="${cx + 80}" y2="${wmY + 30}" stroke="${BORDER}" stroke-width="1.5"/>

  <!-- tagline -->
  <text x="${cx}" y="${sy + sheetH + 160}" text-anchor="middle"
    font-family="ui-monospace, Menlo, monospace" font-size="34" letter-spacing="10" fill="${INK_MUTED}">TEAR · PIN · ARCHIVE</text>

  <!-- CTA -->
  <g transform="translate(${cx} ${H - 380})">
    <text x="-190" y="0" font-family="ui-monospace, Menlo, monospace" font-size="40" fill="${INK_GHOST}">$</text>
    <text x="-140" y="0" font-family="ui-monospace, Menlo, monospace" font-size="40" fill="${INK}" letter-spacing="2">tap to begin</text>
    <text x="190" y="0" font-family="ui-monospace, Menlo, monospace" font-size="40" fill="${INK}">▌</text>
    <text x="0" y="64" text-anchor="middle"
      font-family="ui-monospace, Menlo, monospace" font-size="26" letter-spacing="7" fill="${INK_GHOST}">PRESS ANYWHERE</text>
  </g>

  <!-- bottom meta -->
  <text x="${cx}" y="${H - 160}" text-anchor="middle"
    font-family="ui-monospace, Menlo, monospace" font-size="28" letter-spacing="3" fill="${INK_GHOST}">v1.0.0 · build 2026.04.19</text>
</svg>`;
}

// ─── Pad ────────────────────────────────────────────────────────────────────
function renderPad() {
  const cx = W / 2;
  const sheetW = 980;
  const sheetH = 1540;
  const sx = cx - sheetW / 2;
  const sy = 480;
  const binderH = 56;

  // Corner button top-right
  const btn = `
    <g transform="translate(${W - 240} 200)">
      <rect x="0" y="0" width="180" height="78" rx="16" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5"/>
      <text x="90" y="52" text-anchor="middle"
        font-family="Inter, -apple-system, sans-serif" font-weight="500" font-size="34" letter-spacing="2" fill="${INK}">— ↗</text>
    </g>
  `;

  // Stacked sheets behind
  const stackBack = `
    <rect x="${sx + 14}" y="${sy + 18}" width="${sheetW}" height="${sheetH}"
      fill="${PAPER}" stroke="${BORDER_SOFT}" stroke-width="1" rx="4" opacity="0.55"/>
    <rect x="${sx + 7}" y="${sy + 9}" width="${sheetW}" height="${sheetH}"
      fill="${PAPER}" stroke="${BORDER_SOFT}" stroke-width="1" rx="4" opacity="0.8"/>
  `;

  // Binder
  const binder = `
    <rect x="${sx}" y="${sy - binderH}" width="${sheetW}" height="${binderH}" fill="${INK}" rx="4"/>
    ${Array.from({ length: 15 }).map((_, i) => {
      const px = sx + 50 + i * (sheetW - 100) / 14;
      return `<circle cx="${px}" cy="${sy - binderH / 2}" r="7" fill="${PAPER}" opacity="0.85"/>`;
    }).join('')}
  `;

  // Front sheet with inner grid
  const innerGrid = [];
  for (let x = sx + 48; x < sx + sheetW - 40; x += 48) {
    innerGrid.push(`<line x1="${x}" y1="${sy + 24}" x2="${x}" y2="${sy + sheetH - 24}" stroke="${GRID}" stroke-width="1"/>`);
  }
  for (let y = sy + 48; y < sy + sheetH - 24; y += 48) {
    innerGrid.push(`<line x1="${sx + 24}" y1="${y}" x2="${sx + sheetW - 24}" y2="${y}" stroke="${GRID}" stroke-width="1"/>`);
  }

  // Natural memo-in-progress content. Kept short & casual to feel jotted.
  const contentStartY = sy + 200;
  const contentGap = 96;
  const contentX = sx + 78;

  // [text, sizePx, weight, row]  row=0 is header
  const content = [
    ['this weekend',            60, 600, 0],
    ['- coffee w/ sam 11am',    46, 400, 1],
    ['- finish essay draft',    46, 400, 2],
    // blank row 3
    ['- film @ cvs',            46, 400, 4],
    ['- gym',                   46, 400, 5],
  ];
  const lines = content.map(([t, size, weight, row]) => {
    return `<text x="${contentX}" y="${contentStartY + contentGap * row}"
      font-family="Ubuntu, Inter, -apple-system, Helvetica, Arial, sans-serif"
      font-weight="${weight}" font-size="${size}" fill="${INK}">${t}</text>`;
  }).join('');

  // Thin underline under the header
  const headerUnderline = `<line x1="${contentX}" y1="${contentStartY + 22}"
    x2="${contentX + 340}" y2="${contentStartY + 22}" stroke="${BORDER}" stroke-width="2"/>`;

  // Cursor right after "- gym" on the last row (~ chars * 0.48em wide)
  const lastRowY = contentStartY + contentGap * 5;
  const cursorX = contentX + Math.round(5 * 46 * 0.52); // "- gym" ≈ 5 chars
  const cursor = `<rect x="${cursorX + 6}" y="${lastRowY - 42}" width="3" height="52" fill="${INK}"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${SURFACE}"/>
  ${gridLines()}
  ${statusBar()}

  ${btn}

  ${stackBack}
  ${binder}

  <!-- Front sheet -->
  <rect x="${sx}" y="${sy}" width="${sheetW}" height="${sheetH}"
    fill="${PAPER}" stroke="${BORDER}" stroke-width="2" rx="4"/>
  ${innerGrid.join('')}
  ${headerUnderline}
  ${lines}
  ${cursor}

  <!-- Hint at bottom -->
  <g transform="translate(${cx} ${H - 220})">
    <text x="0" y="0" text-anchor="middle"
      font-family="Inter, -apple-system, sans-serif" font-weight="500" font-size="30" letter-spacing="4" fill="${INK_MUTED}">↑ DRAG UP TO TEAR</text>
  </g>
</svg>`;
}

// ─── Board ──────────────────────────────────────────────────────────────────
function renderBoard() {
  // Header strip
  const header = `
    <rect x="0" y="0" width="${W}" height="240" fill="${SURFACE}"/>
    <line x1="0" y1="240" x2="${W}" y2="240" stroke="${BORDER}" stroke-width="1"/>

    <g font-family="Inter, -apple-system, sans-serif" font-weight="500">
      <text x="80" y="188" font-size="32" letter-spacing="2.5" fill="${INK}">← PAD</text>

      <text x="${W / 2}" y="188" text-anchor="middle" font-size="40" letter-spacing="4" fill="${INK}">
        WALL · <tspan fill="${INK_MUTED}">4</tspan>
      </text>

      <text x="${W - 80}" y="188" text-anchor="end"
        font-family="Inter, -apple-system, sans-serif" font-size="22" letter-spacing="2.5" fill="${INK_MUTED}">HOLD FOR ACTIONS</text>
    </g>
  `;

  // Four pinned memos with natural, everyday content
  const memos = [
    { x: 180, y: 420,  w: 420, h: 520, rot: -6, priority: 'high',  seed: 3,
      title: 'exam mon', body: ['9am rm 301', 'bring ID', 'calculator!'] },
    { x: 700, y: 520,  w: 420, h: 460, rot: 4,  priority: 'normal', seed: 9,
      title: 'groceries', body: ['oat milk', 'eggs, bread'] },
    { x: 240, y: 1120, w: 440, h: 580, rot: 3,  priority: 'mid',   seed: 17,
      title: 'call mom', body: ['her bday sun', 'pick cake', 'tulips?'] },
    { x: 760, y: 1220, w: 420, h: 520, rot: -4, priority: 'normal', seed: 23,
      title: 'gym 6pm', body: ['leg day', 'w/ jake'] },
  ];

  const memoSvg = memos.map((m) => {
    const tint = m.priority === 'high' ? PRIORITY_HIGH_PAPER
      : m.priority === 'mid' ? PRIORITY_MID_PAPER
      : PAPER;
    const pinColor = m.priority === 'high' ? PRIORITY_HIGH
      : m.priority === 'mid' ? PRIORITY_MID
      : INK;

    const path = tornEdgePath(m.x, m.y, m.w, m.h, 18, 14, m.seed);

    // Text content
    const innerPad = 40;
    const titleY = m.y + 160;
    const bodyY0 = m.y + 240;
    const bodyGap = 68;
    const fontStack = 'Ubuntu, Inter, -apple-system, Helvetica, Arial, sans-serif';
    const titleSvg = `<text x="${m.x + innerPad}" y="${titleY}"
      font-family="${fontStack}" font-weight="600" font-size="42" fill="${INK}">${m.title}</text>`;
    const underline = `<line x1="${m.x + innerPad}" y1="${titleY + 16}"
      x2="${m.x + innerPad + 120}" y2="${titleY + 16}" stroke="${INK_GHOST}" stroke-width="2"/>`;
    const bodySvg = m.body.map((t, i) => {
      return `<text x="${m.x + innerPad}" y="${bodyY0 + bodyGap * i}"
        font-family="${fontStack}" font-weight="400" font-size="34" fill="${INK}">${t}</text>`;
    }).join('');
    const innerLines = `${titleSvg}${underline}${bodySvg}`;

    // Pin
    const pinX = m.x + m.w / 2;
    const pinY = m.y + 56;

    return `
      <g transform="rotate(${m.rot} ${m.x + m.w / 2} ${m.y + m.h / 2})">
        <!-- drop shadow -->
        <rect x="${m.x + 6}" y="${m.y + 12}" width="${m.w}" height="${m.h}" fill="${INK}" opacity="0.1" rx="6"/>
        <path d="${path}" fill="${tint}" stroke="${BORDER}" stroke-width="2" stroke-linejoin="round"/>
        ${innerLines}
        <!-- pin -->
        <circle cx="${pinX}" cy="${pinY}" r="20" fill="${pinColor}"/>
        <circle cx="${pinX}" cy="${pinY}" r="28" fill="none" stroke="${pinColor}" stroke-width="2" opacity="0.25"/>
        <circle cx="${pinX - 5}" cy="${pinY - 5}" r="5" fill="${PAPER}" opacity="0.5"/>
      </g>
    `;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${SURFACE}"/>
  ${dottedBoard()}
  ${statusBar()}
  ${header}
  ${memoSvg}

  <!-- bottom tag -->
  <text x="${W / 2}" y="${H - 140}" text-anchor="middle"
    font-family="ui-monospace, Menlo, monospace" font-size="26" letter-spacing="6" fill="${INK_GHOST}">tear · pin · archive</text>
</svg>`;
}

async function writePng(svg, outFile) {
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  fs.writeFileSync(outFile, buf);
  console.log(`  → ${path.relative(process.cwd(), outFile)}`);
}

(async () => {
  console.log(`Generating iPhone 6.7" screenshots (${W}x${H})…`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  await writePng(renderLanding(), path.join(OUT_DIR, 'screenshot-landing.png'));
  await writePng(renderPad(),     path.join(OUT_DIR, 'screenshot-pad.png'));
  await writePng(renderBoard(),   path.join(OUT_DIR, 'screenshot-board.png'));

  console.log('Done.');
})();
