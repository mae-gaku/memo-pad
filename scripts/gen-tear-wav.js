#!/usr/bin/env node
// Generate a short paper-tear sound as a 16-bit mono WAV.
// Synthesised as filtered white-noise bursts with a quick decay envelope.
const fs = require('fs');
const path = require('path');

const sampleRate = 22050;
const duration = 0.36;
const numSamples = Math.floor(sampleRate * duration);

function writeWAVHeader(dataSize, sampleRate) {
  const buf = Buffer.alloc(44);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // fmt size
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // channels
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

const dataSize = numSamples * 2;
const data = Buffer.alloc(dataSize);

// Small burst centres (seconds) — simulate fibres snapping sequentially.
const bursts = [0.01, 0.045, 0.08, 0.12, 0.16, 0.2, 0.24, 0.28, 0.32];

let prev = 0;
for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;

  // Overall decay envelope
  let env = Math.exp(-t * 3.2) * 0.55;
  // Burst spikes
  for (const b of bursts) {
    env += 0.35 * Math.exp(-Math.pow((t - b) / 0.012, 2));
  }

  // White noise
  const noise = Math.random() * 2 - 1;
  // Simple highpass (differentiator) for crispness
  const filtered = noise - prev * 0.68;
  prev = noise;

  const sample = Math.max(-1, Math.min(1, filtered * env * 1.35));
  data.writeInt16LE(Math.round(sample * 31000), i * 2);
}

const header = writeWAVHeader(dataSize, sampleRate);
const wav = Buffer.concat([header, data]);

const outPath = path.join(__dirname, '..', 'assets', 'tear.wav');
fs.writeFileSync(outPath, wav);
console.log(`Wrote ${outPath} (${wav.length} bytes, ${duration}s)`);
