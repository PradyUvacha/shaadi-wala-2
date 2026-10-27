export const FUNCTION_PHASES = ['pre_wedding', 'wedding_day', 'post_wedding'] as const
export type FunctionPhase = (typeof FUNCTION_PHASES)[number]

export const PHASE_LABELS: Record<FunctionPhase, string> = {
  pre_wedding: 'Pre-wedding',
  wedding_day: 'Wedding day',
  post_wedding: 'Post-wedding',
}

/** Group headers on Planning. Uppercase, as on the event row. */
export const PHASE_HEADERS: Record<FunctionPhase, string> = {
  pre_wedding: 'PRE-WEDDING',
  wedding_day: 'WEDDING DAY',
  post_wedding: 'POST-WEDDING',
}

const PHASE_BY_NAME: Record<string, FunctionPhase> = {
  roka: 'pre_wedding',
  sagai: 'pre_wedding',
  haldi: 'pre_wedding',
  mehendi: 'pre_wedding',
  sangeet: 'pre_wedding',
  wedding: 'wedding_day',
  vidaai: 'wedding_day',
  kanyadaan: 'wedding_day',
  'saat phere': 'wedding_day',
  mangalsutra: 'wedding_day',
  reception: 'post_wedding',
  'griha pravesh': 'post_wedding',
}

/** Known ceremonies land in their phase. Any other name, including a custom function, starts in pre-wedding. */
export function defaultPhaseForFunction(name: string): FunctionPhase {
  return PHASE_BY_NAME[name.trim().toLowerCase()] ?? 'pre_wedding'
}

/** A stored phase. Null and anything else stay null so a cleared phase is not invented from the name. */
export function asFunctionPhase(value: unknown): FunctionPhase | null {
  if (value === 'pre_wedding' || value === 'wedding_day' || value === 'post_wedding') return value
  return null
}
