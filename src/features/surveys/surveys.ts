export const NPS_QUESTION = 'How likely are you to recommend Shaadi Wala to a friend or family member?'
export const PRICE_OPEN_QUESTION = 'What would you pay for Shaadi Wala for your wedding?'
export const PRICE_CLOSED_QUESTION = 'Would you pay ₹4,999 per wedding?'

export const SURVEY_PROMPTS = ['day_14', 'day_30', 'price'] as const
export type SurveyPrompt = (typeof SURVEY_PROMPTS)[number]
export type SurveyKind = 'nps' | 'price'
export type PriceChoice = 'yes' | 'maybe' | 'no'

/** The price survey waits until day 21, and an NPS prompt that is still due goes first. */
export const PRICE_SURVEY_DAY = 21

export type SurveyAnswer =
  | { kind: 'nps'; prompt: 'day_14' | 'day_30'; score: number; comment: string }
  | { kind: 'price'; prompt: 'price'; willingness: string; choice: PriceChoice }

export type SurveyRow = {
  user_id: string
  kind: SurveyKind
  prompt: SurveyPrompt
  nps_score: number | null
  comment: string | null
  willingness: string | null
  price_choice: PriceChoice | null
  dismissed: boolean
}

export function daysSinceSignup(createdAt: string, now = new Date()): number {
  const start = new Date(createdAt)
  if (Number.isNaN(start.getTime())) return 0
  const startDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.floor((today - startDay) / 86400000)
}

export function surveyOverride(search: string): SurveyKind | null {
  const value = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('survey')
  if (value === 'nps' || value === 'price') return value
  return null
}

export function pathWithSurvey(path: string, search: string): string {
  const survey = surveyOverride(search)
  if (!survey) return path
  const [pathname, existing] = path.split('?')
  const params = new URLSearchParams(existing ?? '')
  params.set('survey', survey)
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function dueSurvey(input: {
  signedUpAt: string | null
  recorded: readonly SurveyPrompt[]
  now?: Date
  override?: SurveyKind | null
}): { kind: SurveyKind; prompt: SurveyPrompt } | null {
  const has = (prompt: SurveyPrompt) => input.recorded.includes(prompt)
  if (input.override === 'nps') {
    if (!has('day_14')) return { kind: 'nps', prompt: 'day_14' }
    if (!has('day_30')) return { kind: 'nps', prompt: 'day_30' }
    return { kind: 'nps', prompt: 'day_14' }
  }
  if (input.override === 'price') return { kind: 'price', prompt: 'price' }
  if (!input.signedUpAt) return null
  const days = daysSinceSignup(input.signedUpAt, input.now)
  if (days >= 14 && days < 30 && !has('day_14')) return { kind: 'nps', prompt: 'day_14' }
  if (days >= 30 && !has('day_30')) return { kind: 'nps', prompt: 'day_30' }
  if (days >= PRICE_SURVEY_DAY && !has('price')) return { kind: 'price', prompt: 'price' }
  return null
}

export function npsAnswerError(score: number | null): string | null {
  if (score === null || !Number.isInteger(score) || score < 0 || score > 10) return 'Choose a score from 0 to 10.'
  return null
}

export function priceOpenError(value: string): string | null {
  if (!value.trim()) return 'Tell us what you would pay.'
  if (value.trim().length > 500) return 'Keep that answer under 500 characters.'
  return null
}

export function surveyAnswerRow(userId: string, answer: SurveyAnswer): SurveyRow {
  if (answer.kind === 'nps') {
    const problem = npsAnswerError(answer.score)
    if (problem) throw new Error(problem)
    const comment = answer.comment.trim()
    if (comment.length > 1000) throw new Error('Keep the comment under 1,000 characters.')
    return {
      user_id: userId,
      kind: 'nps',
      prompt: answer.prompt,
      nps_score: answer.score,
      comment: comment || null,
      willingness: null,
      price_choice: null,
      dismissed: false,
    }
  }
  const problem = priceOpenError(answer.willingness)
  if (problem) throw new Error(problem)
  return {
    user_id: userId,
    kind: 'price',
    prompt: 'price',
    nps_score: null,
    comment: null,
    willingness: answer.willingness.trim(),
    price_choice: answer.choice,
    dismissed: false,
  }
}

export function surveyDismissalRow(userId: string, prompt: SurveyPrompt): SurveyRow {
  return {
    user_id: userId,
    kind: prompt === 'price' ? 'price' : 'nps',
    prompt,
    nps_score: null,
    comment: null,
    willingness: null,
    price_choice: null,
    dismissed: true,
  }
}
