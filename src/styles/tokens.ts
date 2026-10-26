export const COLORS = {
  crimson: '#8B0000',
  maroon: '#6B0000',
  deepRed: '#A01010',
  gold: '#C9A84C',
  lightGold: '#E8D48B',
  saffron: '#FF6B00',
  ivory: '#FDF6EC',
  parchment: '#F5E6CC',
  darkBg: '#1A0505',
  cardBg: '#FFF9F0',
  green: '#2D7A4F',
  orange: '#E8720C',
} as const

export const CATEGORY_COLORS: Record<string, string> = {
  Venue: '#7C3AED',
  Catering: '#EA580C',
  Decor: '#DB2777',
  Attire: '#B45309',
  Invitations: '#BE185D',
  Other: '#92400E',
}

export const CURRENCIES: Record<string, { symbol: string; label: string }> = {
  INR: { symbol: '₹', label: 'INR' },
  USD: { symbol: '$', label: 'USD' },
  EUR: { symbol: '€', label: 'EUR' },
  GBP: { symbol: '£', label: 'GBP' },
}

export const PRIORITY_COLORS: Record<string, string> = {
  High: COLORS.crimson,
  Medium: COLORS.saffron,
  Low: COLORS.gold,
}
