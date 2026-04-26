// Generates a TikTok-format MP4 (1080x1920, vertical).
// Instead of static screenshot backgrounds with abstract overlays, this
// renders the pad UI programmatically and animates the user typing a memo
// with a human-like cadence (variable per-char delays, word pauses, a
// "thinking" gap), then tears it off the pad and pins it to the wall.
// Landing and board scenes still use the matching screenshots as backdrops.
// Run:  node scripts/gen-tiktok.js

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const sharp = require('sharp');
const ffmpegPath = require('ffmpeg-static');

// ─── Canvas / output ────────────────────────────────────────────────────────
const W = 1080;
const H = 1920;
const FPS = 30;
const TMP_DIR = path.join(__dirname, '..', '.video-tmp');
const OUT_DIR = path.join(__dirname, '..', 'marketing');
const OUT_FILE = path.join(OUT_DIR, 'tiktok.mp4');

const SRC_W = 1290;
const SRC_H = 2796;
const DISPLAY_H = H;
const DISPLAY_W = Math.round(H * (SRC_W / SRC_H));

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

const FONT_SANS = 'Ubuntu, Inter, -apple-system, Helvetica, Arial, sans-serif';
const FONT_MONO = 'ui-monospace, Menlo, DejaVu Sans Mono, monospace';

// ─── Easings ────────────────────────────────────────────────────────────────
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
function easeBackOut(t, s = 1.70158) {
  const p = t - 1;
  return 1 + (s + 1) * p * p * p + s * p * p;
}

// Deterministic seeded PRNG so every render produces the same video.
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// ─── Typing script ──────────────────────────────────────────────────────────
// Builds a deterministic per-character event list with a human-ish cadence:
// small random jitter per keystroke, longer newline pauses, and one
// "thinking" gap in the middle of the memo.
function buildTypeScript() {
  const rand = seeded(1337);
  const events = [];
  let t = 400; // scene preamble before the first keystroke
  let text = '';

  const type = (s, base = 75, jit = 22) => {
    for (const ch of s) {
      const dt = base + (rand() - 0.5) * 2 * jit;
      t += Math.max(28, dt);
      text += ch;
      events.push({ time: t, text });
    }
  };
  const newline = (ms) => {
    t += ms;
    text += '\n';
    events.push({ time: t, text });
  };

  // Natural, everyday weekend-plans memo. Slightly different from the
  // static screenshot so the video shows something fresh.
  type('sun plans', 78, 22);
  newline(540);
  type('- coffee 11am', 70, 25);
  newline(460);
  type('- library', 80, 28);
  newline(980);               // short "hmm, what else…" pause
  type('- dinner w/ mia', 68, 20);

  return { events, endMs: t };
}
const TYPING = buildTypeScript();

function typedTextAt(ms) {
  let out = '';
  for (const e of TYPING.events) {
    if (e.time > ms) break;
    out = e.text;
  }
  return out;
}

// ─── Scenes ─────────────────────────────────────────────────────────────────
const SCENES = [
  { id: 'intro',  dur: 1.6 },
  { id: 'pad',    dur: (TYPING.endMs + 900) / 1000 },
  { id: 'tear',   dur: 1.3 },
  { id: 'board',  dur: 2.4 },
];
const TOTAL_DUR = SCENES.reduce((a, s) => a + s.dur, 0);
const TOTAL_FRAMES = Math.round(TOTAL_DUR * FPS);

function sceneAt(frame) {
  const t = frame / FPS;
  let acc = 0;
  for (const s of SCENES) {
    if (t < acc + s.dur) return { ...s, t: (t - acc) / s.dur, tAbs: t - acc };
    acc += s.dur;
  }
  const last = SCENES[SCENES.length - 1];
  return { ...last, t: 1, tAbs: last.dur };
}

// ─── Pad (programmatic, animated) ───────────────────────────────────────────
// Sheet geometry sized for the 1080x1920 canvas.
const SHEET_W = 780;
const SHEET_H = 1280;
const SHEET_X = (W - SHEET_W) / 2;
const SHEET_Y = 300;
const BINDER_H = 50;

const TEXT_X_OFFSET = 64;
const TEXT_Y_OFFSET = 160;
const HEADER_SIZE = 52;
const BODY_SIZE = 42;
const LINE_GAP = 78;

// Rough per-char advance for positioning the cursor. Ubuntu sans at the
// body size averages ~0.5em; good enough for a blinking indicator.
function charAdvance(ch, size) {
  if (ch === ' ') return size * 0.28;
  if (/[.,:;'!/?-]/.test(ch)) return size * 0.28;
  if (/[ilj]/.test(ch)) return size * 0.26;
  if (/[mw]/.test(ch)) return size * 0.74;
  if (/[A-Z0-9]/.test(ch)) return size * 0.58;
  return size * 0.5;
}

function lineWidth(line, size) {
  let w = 0;
  for (const ch of line) w += charAdvance(ch, size);
  return w;
}

function renderPadGroup({ text, cursorVisible, liftY = 0, liftRot = 0, sheetOpacity = 1 }) {
  const lines = text.split('\n');
  // Render text — first line is the header, rest are body items.
  const textSvg = lines.map((ln, i) => {
    const size = i === 0 ? HEADER_SIZE : BODY_SIZE;
    const weight = i === 0 ? 600 : 400;
    const y = SHEET_Y + TEXT_Y_OFFSET + i * LINE_GAP + (i === 0 ? 0 : 30);
    // xml-escape & swap hyphens so SVG renders a proper dash
    const safe = ln
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<text x="${SHEET_X + TEXT_X_OFFSET}" y="${y}"
      font-family="${FONT_SANS}" font-weight="${weight}" font-size="${size}" fill="${INK}">${safe}</text>`;
  }).join('');

  // Header underline — only once the header is fully typed
  const headerDone = lines.length > 1 || (lines[0] && lines[0].length >= 9);
  const headerUnderline = headerDone
    ? `<line x1="${SHEET_X + TEXT_X_OFFSET}" y1="${SHEET_Y + TEXT_Y_OFFSET + 18}"
         x2="${SHEET_X + TEXT_X_OFFSET + 260}" y2="${SHEET_Y + TEXT_Y_OFFSET + 18}"
         stroke="${BORDER}" stroke-width="2"/>`
    : '';

  // Cursor sits at the end of the last line (or on its own if empty)
  const lastIdx = lines.length - 1;
  const lastSize = lastIdx === 0 ? HEADER_SIZE : BODY_SIZE;
  const cursorLineY = SHEET_Y + TEXT_Y_OFFSET + lastIdx * LINE_GAP + (lastIdx === 0 ? 0 : 30);
  const cursorX = SHEET_X + TEXT_X_OFFSET + lineWidth(lines[lastIdx] || '', lastSize) + 4;
  const cursorTop = cursorLineY - lastSize * 0.82;
  const cursorH = lastSize * 1.05;
  const cursor = cursorVisible
    ? `<rect x="${cursorX}" y="${cursorTop}" width="3" height="${cursorH}" fill="${INK}"/>`
    : '';

  // Inner grid (subtle paper lines, matches screenshot style)
  const innerGrid = [];
  for (let x = SHEET_X + 40; x < SHEET_X + SHEET_W - 30; x += 44) {
    innerGrid.push(`<line x1="${x}" y1="${SHEET_Y + 24}" x2="${x}" y2="${SHEET_Y + SHEET_H - 24}" stroke="${GRID}" stroke-width="1"/>`);
  }
  for (let y = SHEET_Y + 44; y < SHEET_Y + SHEET_H - 24; y += 44) {
    innerGrid.push(`<line x1="${SHEET_X + 24}" y1="${y}" x2="${SHEET_X + SHEET_W - 24}" y2="${y}" stroke="${GRID}" stroke-width="1"/>`);
  }

  // Binder rivets
  const rivets = Array.from({ length: 12 }).map((_, i) => {
    const px = SHEET_X + 40 + i * (SHEET_W - 80) / 11;
    return `<circle cx="${px}" cy="${SHEET_Y - BINDER_H / 2}" r="6" fill="${PAPER}" opacity="0.85"/>`;
  }).join('');

  // Stacked paper behind (depth)
  const stackBack = `
    <rect x="${SHEET_X + 12}" y="${SHEET_Y + 14}" width="${SHEET_W}" height="${SHEET_H}"
      fill="${PAPER}" stroke="${BORDER_SOFT}" stroke-width="1" rx="4" opacity="0.55"/>
    <rect x="${SHEET_X + 6}" y="${SHEET_Y + 7}" width="${SHEET_W}" height="${SHEET_H}"
      fill="${PAPER}" stroke="${BORDER_SOFT}" stroke-width="1" rx="4" opacity="0.8"/>
  `;

  // The front sheet + content group, wrapped so we can translate/rotate it
  // as a whole (used by the tear animation).
  const cx = SHEET_X + SHEET_W / 2;
  const cy = SHEET_Y + SHEET_H / 2;
  const frontSheet = `
    <g transform="translate(0 ${liftY}) rotate(${liftRot} ${cx} ${cy})" opacity="${sheetOpacity}">
      <rect x="${SHEET_X}" y="${SHEET_Y}" width="${SHEET_W}" height="${SHEET_H}"
        fill="${PAPER}" stroke="${BORDER}" stroke-width="2" rx="4"/>
      ${innerGrid.join('')}
      ${headerUnderline}
      ${textSvg}
      ${cursor}
    </g>
  `;

  // Binder stays put (it's the spine) — sheet slides off it during tear
  const binder = `
    <rect x="${SHEET_X}" y="${SHEET_Y - BINDER_H}" width="${SHEET_W}" height="${BINDER_H}" fill="${INK}" rx="4"/>
    ${rivets}
  `;

  return { frontSheet, binder, stackBack };
}

// ─── Screens ────────────────────────────────────────────────────────────────
function topChrome({ rightText = 'NO_001 / 2026.04', mutedOp = 1 } = {}) {
  // Small status-style bar + page label
  return `
    <g font-family="${FONT_MONO}" font-size="22" letter-spacing="3" fill="${INK_MUTED}" opacity="${mutedOp}">
      <circle cx="80" cy="140" r="8" fill="${INK}"/>
      <circle cx="80" cy="140" r="13" fill="none" stroke="${INK}" stroke-width="2" opacity="0.25"/>
      <text x="104" y="148">READY</text>
      <text x="${W - 80}" y="148" text-anchor="end">${rightText}</text>
    </g>
  `;
}

function padHint(t, visible = true) {
  const pulse = 0.45 + 0.25 * Math.sin(t * 4);
  const op = visible ? pulse : 0;
  return `
    <g opacity="${op}">
      <text x="${W / 2}" y="${H - 180}" text-anchor="middle"
        font-family="${FONT_SANS}" font-weight="500" font-size="26" letter-spacing="4" fill="${INK_MUTED}">↑ DRAG UP TO TEAR</text>
    </g>
  `;
}

function svgDoc(body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${body}
</svg>`;
}

// Pad scene — programmatic, with live typing + blinking cursor
function padSceneSvg(t, sceneDur) {
  const ms = t * sceneDur * 1000;
  const text = typedTextAt(ms);
  // Cursor blinks ~1Hz
  const cursorVisible = (Math.floor(ms / 520) % 2) === 0 || ms < 380;

  // Subtle Ken-Burns on the whole pad (micro scale + drift)
  const e = easeInOut(t);
  const scale = 1 + e * 0.015;
  const drift = e * -6;
  const sceneT = t * sceneDur;
  const hintVisible = ms > TYPING.endMs + 200;

  const { frontSheet, binder, stackBack } = renderPadGroup({ text, cursorVisible });

  return svgDoc(`
    <rect width="${W}" height="${H}" fill="${SURFACE}"/>
    <g transform="translate(0 ${drift}) scale(${scale}) translate(${-(scale - 1) * W / 2} ${-(scale - 1) * H / 2})">
      ${topChrome()}
      ${stackBack}
      ${binder}
      ${frontSheet}
    </g>
    ${padHint(sceneT, hintVisible)}
  `);
}

// Tear scene — sheet lifts with a finger cue, binder stays put
function tearSceneSvg(t) {
  const text = TYPING.events[TYPING.events.length - 1].text;

  // Phase 1 (0 - 0.28): finger indicator appears near base of sheet
  // Phase 2 (0.28 - 0.85): sheet lifts upward with subtle rotation
  // Phase 3 (0.85 - 1.0): empty pad visible
  const liftPhase = clamp((t - 0.15) / 0.65);
  const lifted = easeIn(liftPhase);
  const liftY = -lifted * 2200;
  const liftRot = lifted * -4;

  const fingerPhase = clamp(t / 0.3);
  const fingerOp = clamp(t / 0.15) * (1 - clamp((t - 0.5) / 0.15));
  const fingerY = SHEET_Y + SHEET_H - 180 + (1 - easeOut(fingerPhase)) * 80 - lifted * 2200;
  const fingerX = W / 2;

  const { frontSheet, binder, stackBack } = renderPadGroup({
    text,
    cursorVisible: false,
    liftY,
    liftRot,
  });

  return svgDoc(`
    <rect width="${W}" height="${H}" fill="${SURFACE}"/>
    ${topChrome()}
    ${stackBack}
    ${binder}
    ${frontSheet}

    <!-- Finger / touch indicator -->
    <g opacity="${fingerOp}">
      <circle cx="${fingerX}" cy="${fingerY}" r="44" fill="${INK}"/>
      <circle cx="${fingerX}" cy="${fingerY}" r="64" fill="none" stroke="${INK}" stroke-width="3" opacity="0.25"/>
      <path d="M ${fingerX - 18} ${fingerY + 8} L ${fingerX} ${fingerY - 18} L ${fingerX + 18} ${fingerY + 8}"
        fill="none" stroke="${PAPER}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  `);
}

// ─── Intro overlay (over landing screenshot) ────────────────────────────────
function introOverlay(t) {
  const veilOp = (1 - clamp(t / 0.3)) * 0.5;   // fade-in from white
  const outOp = clamp((t - 0.82) / 0.18) * 0.35; // soft fade to next scene
  return svgDoc(`
    <rect width="${W}" height="${H}" fill="${PAPER}" opacity="${veilOp}"/>
    <rect width="${W}" height="${H}" fill="${PAPER}" opacity="${outOp}"/>
  `);
}

// ─── Board overlay (over board screenshot) ──────────────────────────────────
// A mini torn memo drops in from above and lands near the top-center of
// the board (among the existing memos) with a pin. Then the wordmark
// fades in at the bottom.
function boardOverlay(t) {
  // Mini memo geometry — sized to match the board's memos
  const memoW = 320;
  const memoH = 380;
  const landX = W / 2 - memoW / 2;
  const landY = 380;
  const finalRot = 2;

  // Drop animation with small bounce
  const drop = easeBackOut(clamp(t / 0.55));
  const startY = -memoH - 80;
  const y = lerp(startY, landY, drop);
  const rotStart = -12;
  const rot = lerp(rotStart, finalRot, drop);

  // Pin drops after memo lands
  const pinT = clamp((t - 0.5) / 0.2);
  const pinY = lerp(180, y + 48, easeBackOut(pinT));
  const pinOp = pinT > 0 ? 1 : 0;

  // Wordmark fades in last
  const brandOp = clamp((t - 0.75) / 0.2);
  const ctaOp = clamp((t - 0.9) / 0.1);

  const cx = landX + memoW / 2;
  const cy = y + memoH / 2;

  const text = TYPING.events[TYPING.events.length - 1].text;
  const lines = text.split('\n').slice(0, 4);

  const safe = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const textSvg = lines.map((ln, i) => {
    const size = i === 0 ? 26 : 22;
    const weight = i === 0 ? 600 : 400;
    const ty = y + 130 + i * 52 + (i === 0 ? 0 : 18);
    return `<text x="${landX + 28}" y="${ty}"
      font-family="${FONT_SANS}" font-weight="${weight}" font-size="${size}" fill="${INK}">${safe(ln)}</text>`;
  }).join('');

  // Simple torn-edge polygon for the mini memo (bottom edge is jagged)
  const tornRand = seeded(91);
  const pts = [`${landX},${y}`, `${landX + memoW},${y}`, `${landX + memoW},${y + memoH - 14}`];
  const seg = 12;
  for (let i = seg; i >= 0; i--) {
    const px = landX + (memoW / seg) * i;
    const py = y + memoH + (tornRand() - 0.4) * 12;
    pts.push(`${px},${py}`);
  }
  pts.push(`${landX},${y + memoH - 14}`);

  return svgDoc(`
    <g transform="rotate(${rot} ${cx} ${cy})">
      <!-- soft shadow -->
      <rect x="${landX + 6}" y="${y + 10}" width="${memoW}" height="${memoH}" fill="${INK}" opacity="0.14" rx="4"/>
      <polygon points="${pts.join(' ')}" fill="${PRIORITY_HIGH_PAPER}" stroke="${BORDER}" stroke-width="2" stroke-linejoin="round"/>
      ${textSvg}
      <g opacity="${pinOp}">
        <circle cx="${landX + memoW / 2}" cy="${pinY}" r="16" fill="${PRIORITY_HIGH}"/>
        <circle cx="${landX + memoW / 2}" cy="${pinY}" r="22" fill="none" stroke="${PRIORITY_HIGH}" stroke-width="2" opacity="0.3"/>
        <circle cx="${landX + memoW / 2 - 4}" cy="${pinY - 4}" r="4" fill="${PAPER}" opacity="0.6"/>
      </g>
    </g>

    <!-- Wordmark + CTA -->
    <g opacity="${brandOp}">
      <line x1="${W / 2 - 120}" y1="${H - 380}" x2="${W / 2 + 120}" y2="${H - 380}" stroke="${INK}" stroke-width="2"/>
      <text x="${W / 2}" y="${H - 320}" text-anchor="middle"
        font-family="${FONT_MONO}" font-weight="500" font-size="40" letter-spacing="9" fill="${INK}">memo · pad</text>
      <line x1="${W / 2 - 120}" y1="${H - 290}" x2="${W / 2 + 120}" y2="${H - 290}" stroke="${INK}" stroke-width="2"/>
    </g>
    <g opacity="${ctaOp}">
      <text x="${W / 2}" y="${H - 220}" text-anchor="middle"
        font-family="${FONT_MONO}" font-size="24" letter-spacing="6" fill="${INK_MUTED}">COMING SOON · iOS</text>
    </g>
  `);
}

// ─── Pipeline ───────────────────────────────────────────────────────────────

async function loadScreenshot(name) {
  const p = path.join(OUT_DIR, `screenshot-${name}.png`);
  if (!fs.existsSync(p)) {
    throw new Error(`Missing ${p}. Run:  node scripts/gen-screenshots.js`);
  }
  return sharp(p).resize(DISPLAY_W, DISPLAY_H, { fit: 'cover', position: 'top' }).png().toBuffer();
}

async function placeScreenshotBg(bgBuf, scale, panX, panY) {
  const scaledW = Math.round(DISPLAY_W * scale);
  const scaledH = Math.round(DISPLAY_H * scale);
  let buf = await sharp(bgBuf).resize(scaledW, scaledH).toBuffer();
  let placeLeft, placeTop, outW = scaledW, outH = scaledH;

  if (scaledW <= W) {
    placeLeft = Math.round((W - scaledW) / 2 + panX);
  } else {
    const extractLeft = Math.max(0, Math.min(scaledW - W, Math.round((scaledW - W) / 2 - panX)));
    buf = await sharp(buf).extract({ left: extractLeft, top: 0, width: W, height: scaledH }).toBuffer();
    outW = W;
    placeLeft = 0;
  }

  if (scaledH <= H) {
    placeTop = Math.round((H - scaledH) / 2 + panY);
  } else {
    const extractTop = Math.max(0, Math.min(scaledH - H, Math.round((scaledH - H) / 2 - panY)));
    buf = await sharp(buf).extract({ left: 0, top: extractTop, width: outW, height: H }).toBuffer();
    outH = H;
    placeTop = 0;
  }

  return { buf, top: placeTop, left: placeLeft, width: outW, height: outH };
}

async function renderFrame(f, bgImages) {
  const scene = sceneAt(f);

  let baseLayer; // { input, top, left }
  let overlaySvg;

  if (scene.id === 'intro') {
    // Landing with gentle Ken Burns
    const e = easeInOut(scene.t);
    const scale = lerp(1.02, 1.06, e);
    const panX = lerp(0, 10, e);
    const panY = lerp(0, -6, e);
    const { buf, top, left } = await placeScreenshotBg(bgImages.landing, scale, panX, panY);
    baseLayer = { input: buf, top, left };
    overlaySvg = introOverlay(scene.t);
  } else if (scene.id === 'pad') {
    // Fully programmatic — no screenshot
    overlaySvg = padSceneSvg(scene.t, scene.dur);
  } else if (scene.id === 'tear') {
    overlaySvg = tearSceneSvg(scene.t);
  } else {
    // Board — static screenshot with overlay
    const e = easeInOut(scene.t);
    const scale = lerp(1.02, 1.05, e);
    const panY = lerp(-4, 6, e);
    const { buf, top, left } = await placeScreenshotBg(bgImages.board, scale, 0, panY);
    baseLayer = { input: buf, top, left };
    overlaySvg = boardOverlay(scene.t);
  }

  const layers = [];
  if (baseLayer) layers.push(baseLayer);
  layers.push({ input: Buffer.from(overlaySvg), top: 0, left: 0 });

  return sharp({
    create: { width: W, height: H, channels: 3, background: SURFACE },
  })
    .composite(layers)
    .png()
    .toBuffer();
}

async function main() {
  console.log(`Rendering ${TOTAL_FRAMES} frames @ ${FPS}fps (${TOTAL_DUR.toFixed(2)}s)…`);

  const bgImages = {
    landing: await loadScreenshot('landing'),
    board: await loadScreenshot('board'),
  };

  if (fs.existsSync(TMP_DIR)) {
    for (const f of fs.readdirSync(TMP_DIR)) fs.unlinkSync(path.join(TMP_DIR, f));
  } else {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const start = Date.now();
  const BATCH = 6;
  for (let i = 0; i < TOTAL_FRAMES; i += BATCH) {
    const end = Math.min(i + BATCH, TOTAL_FRAMES);
    const bufs = await Promise.all(
      Array.from({ length: end - i }, (_, k) => renderFrame(i + k, bgImages))
    );
    bufs.forEach((buf, k) => {
      const idx = i + k;
      fs.writeFileSync(path.join(TMP_DIR, `frame_${String(idx).padStart(4, '0')}.png`), buf);
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    process.stdout.write(`\r  frame ${end}/${TOTAL_FRAMES}  ${elapsed}s`);
  }
  process.stdout.write('\n');

  console.log('Encoding MP4 with ffmpeg…');
  const args = [
    '-y',
    '-framerate', String(FPS),
    '-i', path.join(TMP_DIR, 'frame_%04d.png'),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'medium',
    '-crf', '20',
    '-movflags', '+faststart',
    OUT_FILE,
  ];
  const r = spawnSync(ffmpegPath, args, { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('ffmpeg failed');
    process.exit(r.status || 1);
  }

  for (const f of fs.readdirSync(TMP_DIR)) fs.unlinkSync(path.join(TMP_DIR, f));
  fs.rmdirSync(TMP_DIR);

  const bytes = fs.statSync(OUT_FILE).size;
  console.log(`\nDone → ${path.relative(process.cwd(), OUT_FILE)}  (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
