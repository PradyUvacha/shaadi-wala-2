export const FUNCTION_PHASES = ['pre_wedding', 'wedding_day', 'post_wedding'] as const
export type FunctionPhase = (typeof FUNCTION_PHASES)[number]

export const PHASE_LABELS: Record<FunctionPhase, string> = {
  pre_wedding: 'Pre-wedding',
  wedding_day: 'Wedding day',
  post_wedding: 'Post-wedding',
}

const PHASE_BY_NAME: Record<string, FunctionPhase> = {
  roka: 'pre_wedding',
  sagai: 'pre_wedding',
  haldi: 'pre_wedding',
  mehendi: 'pre_wedding',
  sangeet: 'pre_wedding',
  wedding: 'wedding_day',
  vidaai: 'wedding_day',
  reception: 'post_wedding',
}

/** Known ceremonies land in their phase. Any other name, including a custom function, starts in pre-wedding. */
export function defaultPhaseForFunction(name: string): FunctionPhase {
  return PHASE_BY_NAME[name.trim().toLowerCase()] ?? 'pre_wedding'
}

export function asFunctionPhase(value: unknown, name = ''): FunctionPhase {
  if (value === 'pre_wedding' || value === 'wedding_day' || value === 'post_wedding') return value
  return defaultPhaseForFunction(name)
}
