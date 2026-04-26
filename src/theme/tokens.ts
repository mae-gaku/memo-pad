// Minimal-tech palette. Notion/Ollama direction:
// - Near-white paper, cool neutral grays, near-black ink
// - No warm/leather tones, no decorative colors
// - Typography: Inter everywhere

export const colors = {
  // Surfaces
  surface: '#F4F4F5', // desk / app bg (zinc-100)
  surfaceAlt: '#FAFAFA', // subtle alt surface (neutral-50)
  paper: '#FFFFFF', // the memo sheet
  paperEdge: '#E4E4E7', // paper border (zinc-200)
  paperShadow: 'rgba(0,0,0,0.08)',

  // Grid
  grid: '#EEEEEF', // very subtle grid (between zinc-100 and 200)

  // Ink
  ink: '#09090B', // near-black (zinc-950)
  inkStrong: '#18181B', // zinc-900
  inkMuted: '#71717A', // zinc-500
  inkGhost: '#A1A1AA', // zinc-400

  // Binder (thin dark bar)
  binder: '#18181B', // zinc-900
  binderAccent: '#27272A', // zinc-800

  // Board (replaces cork)
  board: '#F4F4F5',
  boardDot: '#D4D4D8', // zinc-300

  // Pin (minimal)
  pin: '#09090B',
  pinShine: '#52525B', // zinc-600

  // Destructive (used sparingly)
  danger: '#DC2626',
  dangerSoft: 'rgba(220, 38, 38, 0.12)',

  // Priority accent (for pinned memos)
  priorityMid: '#D97706', // amber-600
  priorityHigh: '#DC2626', // red-600
  priorityMidPaper: '#FEF3C7', // amber-100, very soft tint
  priorityHighPaper: '#FEE2E2', // red-100, very soft tint

  // Borders
  border: '#E4E4E7',
  borderStrong: '#D4D4D8',

  // Overlays
  overlay: 'rgba(255, 255, 255, 0.9)',
} as const;

export const fonts = {
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  // Mono accent for tech/labels where useful
  mono: 'ui-monospace',
} as const;

export const fontSizes = {
  memo: 17,
  memoSmall: 13,
  label: 11,
  title: 15,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 2,
  md: 4,
  lg: 8,
} as const;

export const shadows = {
  paper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  memo: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;
