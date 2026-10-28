// src/styles/tokens.ts — v1 ← Sushrut UI (design spec, 27 Oct 2026)
// Source key: [S#] sampled from screenshot pixels, [F] fork lib/core/theme, [v1] existing v1 value, [D] derived for contrast
export const COLORS = {
  crimson: '#7A0A0A',
  maroon: '#5A0606',
  appBar: '#760808',
  gold: '#C8A45A',
  goldText: '#7A5A14',
  goldTint: '#F5EFE1',
  ivory: '#FDF7ED',
  cardBg: '#FFFFFF',
  parchment: '#F8EFE0',
  border: '#EEE0CC',
  ink: '#1A0505',
  muted: '#8E5050',
  danger: '#B42318',
  dangerTint: '#FFF1F0',
  dangerBorder: '#F0C2C2',
  green: '#2D7A4F',
  greenText: '#24643F',
  greenTint: '#E0EBE5',
  roseTint: '#F5ECEC',
  orangeText: '#9A3E0E',
  orangeTint: '#FBEDE2',
} as const

export const FONT = {
  display: "'Playfair Display', serif",
  body: "'Poppins', sans-serif",
} as const

export const TYPE = {
  display: 28,
  title: 22,
  h2: 18,
  number: 24,
  body: 16,
  small: 14,
} as const

export const WEIGHT = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const

export const TRACKING = {
  label: '0.08em',
} as const

export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const

export const RADIUS = {
  sm: 8,
  md: 12,
  card: 16,
  hero: 22,
  sheet: 24,
  input: 14,
  pill: 999,
} as const

export const SHADOW = {
  card: '0 1px 3px rgba(26,5,5,0.06)',
  raised: '0 4px 16px rgba(122,10,10,0.10)',
  fab: '0 6px 18px rgba(122,10,10,0.30)',
} as const

export const SIZE = {
  button: 52,
  tap: 48,
  appBar: 56,
  nav: 64,
  fab: 56,
  chip: 48,
  input: 52,
  avatar: 40,
} as const

export const CATEGORY_COLORS: Record<string, string> = {
  Venue: '#7A0A0A',
  Catering: '#E8720C',
  Decor: '#C8A45A',
  Attire: '#B45309',
  Invitations: '#6B3FA0',
  Photography: '#E8720C',
  'Make Up Artists': '#E8720C',
  Other: '#8E5050',
}

export const CURRENCIES: Record<string, { symbol: string; label: string }> = {
  INR: { symbol: '₹', label: 'INR' },
  USD: { symbol: '$', label: 'USD' },
  EUR: { symbol: '€', label: 'EUR' },
  GBP: { symbol: '£', label: 'GBP' },
}

export const PRIORITY_COLORS: Record<string, string> = {
  High: COLORS.crimson,
  Medium: COLORS.orangeText,
  Low: COLORS.goldText,
}
