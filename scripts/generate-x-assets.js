const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'marketing', 'x-assets');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const INK = '#09090B';
const PAPER = '#FFFFFF';
const GRID = '#EEEEEF';
const BORDER = '#D4D4D8';
const GHOST = '#A1A1AA';
const MUTED = '#52525B';

/* ---------- ICON A: black circle + m (matches avatar the user liked) ---------- */
const iconA = `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="${INK}"/>
  <text x="200" y="200"
        font-family="ui-sans-serif, -apple-system, Inter, sans-serif"
        font-size="230" font-weight="600"
        fill="${PAPER}"
        text-anchor="middle"
        dominant-baseline="central"
        letter-spacing="-6">m</text>
</svg>`;

/* ---------- ICON B: torn paper style, with subtle m ---------- */
const iconB = `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="${INK}"/>
  <!-- torn paper shape -->
  <path d="
    M 80 70
    L 320 70
    L 325 92
    L 318 115
    L 326 140
    L 320 330
    L 80 325
    L 86 140
    L 78 115
    L 84 92
    Z"
    fill="${PAPER}"/>
  <!-- binding holes -->
  <circle cx="120" cy="70" r="5" fill="${INK}"/>
  <circle cx="160" cy="70" r="5" fill="${INK}"/>
  <circle cx="200" cy="70" r="5" fill="${INK}"/>
  <circle cx="240" cy="70" r="5" fill="${INK}"/>
  <circle cx="280" cy="70" r="5" fill="${INK}"/>
  <!-- m letter -->
  <text x="200" y="225"
        font-family="ui-sans-serif, -apple-system, Inter, sans-serif"
        font-size="150" font-weight="600"
        fill="${INK}"
        text-anchor="middle"
        dominant-baseline="central"
        letter-spacing="-4">m</text>
</svg>`;

/* ---------- BANNER: 1500x500, grid paper, brand, tagline ---------- */
// Note: safe zone — avoid bottom-left ~360px (profile photo overlay)
const banner = `
<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="500" viewBox="0 0 1500 500">
  <defs>
    <pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse">
      <path d="M 56 0 L 0 0 0 56" fill="none" stroke="${GRID}" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- paper background -->
  <rect width="1500" height="500" fill="${PAPER}"/>
  <rect width="1500" height="500" fill="url(#grid)"/>

  <!-- outer frame -->
  <rect x="48" y="48" width="1404" height="404" fill="none" stroke="${BORDER}" stroke-width="1"/>

  <!-- corner ticks (inside frame) -->
  <g stroke="${GHOST}" stroke-width="2" fill="none">
    <!-- TL -->
    <path d="M 48 68 L 48 48 L 68 48"/>
    <!-- TR -->
    <path d="M 1432 48 L 1452 48 L 1452 68"/>
    <!-- BL -->
    <path d="M 48 432 L 48 452 L 68 452"/>
    <!-- BR -->
    <path d="M 1432 452 L 1452 452 L 1452 432"/>
  </g>

  <!-- top-left meta (outside safe zone overlap) -->
  <text x="88" y="102"
        font-family="ui-monospace, Menlo, Consolas, monospace"
        font-size="14" fill="${GHOST}" letter-spacing="2.5">MEMO · PAD</text>

  <!-- top-right meta -->
  <text x="1412" y="102"
        font-family="ui-monospace, Menlo, monospace"
        font-size="13" fill="${GHOST}" letter-spacing="2"
        text-anchor="end">v1.0 · 2026</text>

  <!-- tiny divider -->
  <line x1="88" y1="118" x2="180" y2="118" stroke="${INK}" stroke-width="1.5"/>

  <!-- MAIN HEADLINE (right-shifted to avoid profile photo safe zone) -->
  <text x="540" y="240"
        font-family="ui-sans-serif, -apple-system, Inter, sans-serif"
        font-size="78" font-weight="600" fill="${INK}"
        letter-spacing="-2">tear your notes.</text>

  <!-- sub headline -->
  <text x="540" y="282"
        font-family="ui-sans-serif, Inter, sans-serif"
        font-size="22" fill="${MUTED}" letter-spacing="0.3">A minimal memo app. Paper, in your pocket.</text>

  <!-- meta line -->
  <text x="540" y="312"
        font-family="ui-monospace, Menlo, monospace"
        font-size="13" fill="${GHOST}" letter-spacing="2.5">iOS · WEB · OFFLINE · NO LOGIN</text>

  <!-- flow: write → tear → pin (right side mini-icons) -->
  <g transform="translate(540, 360)">
    <!-- step 1: write (pencil line) -->
    <text x="0" y="20" font-family="ui-monospace, Menlo, monospace" font-size="11"
          fill="${GHOST}" letter-spacing="2">01 WRITE</text>
    <line x1="0" y1="38" x2="92" y2="38" stroke="${INK}" stroke-width="3"/>

    <!-- arrow -->
    <text x="115" y="44" font-family="ui-monospace, Menlo, monospace" font-size="16"
          fill="${GHOST}">→</text>

    <!-- step 2: tear (jagged line) -->
    <text x="150" y="20" font-family="ui-monospace, Menlo, monospace" font-size="11"
          fill="${GHOST}" letter-spacing="2">02 TEAR</text>
    <path d="M 150 38 L 160 34 L 168 42 L 178 32 L 186 40 L 196 34 L 206 42 L 216 34 L 226 40 L 236 36 L 244 38"
          stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- arrow -->
    <text x="265" y="44" font-family="ui-monospace, Menlo, monospace" font-size="16"
          fill="${GHOST}">→</text>

    <!-- step 3: pin (dot) -->
    <text x="300" y="20" font-family="ui-monospace, Menlo, monospace" font-size="11"
          fill="${GHOST}" letter-spacing="2">03 PIN</text>
    <circle cx="312" cy="38" r="6" fill="#E11D48"/>
    <circle cx="344" cy="38" r="6" fill="#F59E0B"/>
    <circle cx="376" cy="38" r="6" fill="${INK}"/>
  </g>

  <!-- right side mini torn-paper illustration -->
  <g transform="translate(1180, 170)">
    <path d="M 0 0
             L 180 0
             L 184 18
             L 178 35
             L 186 55
             L 180 220
             L 4 218
             L 10 55
             L 2 35
             L 8 18 Z"
          fill="${PAPER}" stroke="${BORDER}" stroke-width="1"/>
    <circle cx="26" cy="0" r="3.5" fill="${GHOST}"/>
    <circle cx="60" cy="0" r="3.5" fill="${GHOST}"/>
    <circle cx="94" cy="0" r="3.5" fill="${GHOST}"/>
    <circle cx="128" cy="0" r="3.5" fill="${GHOST}"/>
    <circle cx="162" cy="0" r="3.5" fill="${GHOST}"/>
    <line x1="26" y1="95" x2="160" y2="95" stroke="${INK}" stroke-width="4"/>
    <line x1="26" y1="125" x2="130" y2="125" stroke="${INK}" stroke-width="4"/>
    <line x1="26" y1="155" x2="90" y2="155" stroke="${INK}" stroke-width="4"/>
    <circle cx="160" cy="32" r="6" fill="#E11D48"/>
  </g>

  <!-- bottom meta -->
  <text x="1412" y="432"
        font-family="ui-monospace, Menlo, monospace"
        font-size="12" fill="${GHOST}" letter-spacing="2"
        text-anchor="end">write · tear · pin · archive</text>
</svg>`;

async function run() {
  const tasks = [
    { name: 'icon-x-a.png', svg: iconA, size: 400 },
    { name: 'icon-x-a@2x.png', svg: iconA, size: 800 },
    { name: 'icon-x-b.png', svg: iconB, size: 400 },
    { name: 'icon-x-b@2x.png', svg: iconB, size: 800 },
    { name: 'banner-x.png', svg: banner, size: null },
    { name: 'banner-x@2x.png', svg: banner, size: null, scale: 2 },
  ];

  for (const t of tasks) {
    const buf = Buffer.from(t.svg);
    let pipeline = sharp(buf, { density: 400 });
    if (t.size) {
      pipeline = pipeline.resize(t.size, t.size);
    } else if (t.scale === 2) {
      pipeline = pipeline.resize(3000, 1000);
    } else {
      pipeline = pipeline.resize(1500, 500);
    }
    await pipeline.png({ compressionLevel: 9 }).toFile(path.join(outDir, t.name));
    console.log('✓', t.name);
  }

  // Also save SVG source for editing
  fs.writeFileSync(path.join(outDir, 'icon-x-a.svg'), iconA);
  fs.writeFileSync(path.join(outDir, 'icon-x-b.svg'), iconB);
  fs.writeFileSync(path.join(outDir, 'banner-x.svg'), banner);
  console.log('✓ svg sources saved');
}

run().catch((e) => { console.error(e); process.exit(1); });
