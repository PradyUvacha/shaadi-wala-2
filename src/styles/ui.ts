import type { CSSProperties } from 'react'
import { COLORS, FONT, RADIUS, SIZE, TRACKING, TYPE, WEIGHT } from './tokens.ts'

export const inputStyle: CSSProperties = {
  width: '100%',
  minHeight: SIZE.input,
  padding: '12px 14px',
  borderRadius: RADIUS.input,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.cardBg,
  fontFamily: FONT.body,
  fontSize: TYPE.body,
  outline: 'none',
  color: COLORS.ink,
}

export const selectStyle: CSSProperties = { ...inputStyle, appearance: 'none' }

export const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: TYPE.small,
  fontWeight: WEIGHT.semibold,
  color: COLORS.muted,
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: TRACKING.label,
}

export const sectionLabel: CSSProperties = {
  fontSize: TYPE.small,
  fontWeight: WEIGHT.semibold,
  color: COLORS.goldText,
  textTransform: 'uppercase',
  letterSpacing: TRACKING.label,
  margin: '16px 0 8px',
}

export const cardStyle: CSSProperties = {
  background: COLORS.cardBg,
  border: `1px solid ${COLORS.border}`,
  borderRadius: RADIUS.card,
  padding: 16,
  boxShadow: '0 1px 3px rgba(26,5,5,0.06)',
}

export function primaryButton(background?: string): CSSProperties {
  return {
    width: '100%',
    minHeight: SIZE.button,
    padding: '13px 16px',
    borderRadius: RADIUS.input,
    background: background ?? `linear-gradient(135deg,${COLORS.crimson},${COLORS.maroon})`,
    border: 'none',
    color: '#fff',
    fontSize: TYPE.body,
    fontWeight: WEIGHT.semibold,
    cursor: 'pointer',
  }
}

export const iconButton: CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: TYPE.small,
  padding: 0,
  minWidth: SIZE.tap,
  minHeight: SIZE.tap,
  color: COLORS.crimson,
}
