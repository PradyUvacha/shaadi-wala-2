import type { CSSProperties } from 'react'
import { COLORS } from './tokens.ts'

export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1.5px solid #E0CABB',
  background: '#FFFAF4',
  fontSize: 16,
  outline: 'none',
  color: '#2A0A0A',
}

export const selectStyle: CSSProperties = { ...inputStyle, appearance: 'none' }

export const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: COLORS.crimson,
  marginBottom: 5,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

export function primaryButton(background: string): CSSProperties {
  return {
    width: '100%',
    padding: '13px',
    borderRadius: 12,
    background,
    border: 'none',
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  }
}

export const iconButton: CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  padding: 0,
}
