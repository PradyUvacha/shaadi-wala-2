export const NPS_QUESTION = 'How likely are you to recommend Shaadi Wala to a friend or family member?'
export const PRICE_OPEN_QUESTION = 'What would you pay for Shaadi Wala for your wedding?'
export const PRICE_CLOSED_QUESTION = 'Would you pay ₹4,999 per wedding?'

export const SURVEY_PROMPTS = ['day_14', 'day_30', 'price'] as const
export type SurveyPrompt = (typeof SURVEY_PROMPTS)[number]
export type SurveyKind = 'nps' | 'price'
export type PriceChoice = 'yes' | 'no'
export type SurveyStep = 'nps' | 'open' | 'choice'

/** The price survey waits until day 21, and an NPS prompt that is still due goes first. */
export const PRICE_SURVEY_DAY = 21
/** Digits only, from ₹0 through ₹10,00,000. */
export const MAX_PRICE_RUPEES = 1_000_000

export type SurveyAnswer =
  | { kind: 'nps'; prompt: 'day_14' | 'day_30'; score: number; comment: string }
  | { kind: 'price-open'; willingness: string }

export type DueSurvey = {
  kind: SurveyKind
  prompt: SurveyPrompt
  step: SurveyStep
}

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

/** Dev server, or a preview build that sets VITE_SURVEY_DEBUG. Production and release APKs leave it unset. */
export function surveyDebugEnabled(): boolean {
  return import.meta.env.DEV === true || import.meta.env.VITE_SURVEY_DEBUG === 'true'
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
  debug?: boolean
  pendingPriceChoice?: boolean
}): DueSurvey | null {
  if (input.pendingPriceChoice) return { kind: 'price', prompt: 'price', step: 'choice' }
  const has = (prompt: SurveyPrompt) => input.recorded.includes(prompt)
  if (input.debug && input.override === 'nps') {
    const days = input.signedUpAt ? daysSinceSignup(input.signedUpAt, input.now) : 0
    if (days >= 30) return has('day_30') ? null : { kind: 'nps', prompt: 'day_30', step: 'nps' }
    return has('day_14') ? null : { kind: 'nps', prompt: 'day_14', step: 'nps' }
  }
  if (input.debug && input.override === 'price') {
    return has('price') ? null : { kind: 'price', prompt: 'price', step: 'open' }
  }
  if (!input.signedUpAt) return null
  const days = daysSinceSignup(input.signedUpAt, input.now)
  if (days >= 14 && days < 30 && !has('day_14')) return { kind: 'nps', prompt: 'day_14', step: 'nps' }
  if (days >= 30 && !has('day_30')) return { kind: 'nps', prompt: 'day_30', step: 'nps' }
  if (days >= PRICE_SURVEY_DAY && !has('price')) return { kind: 'price', prompt: 'price', step: 'open' }
  return null
}

export function npsAnswerError(score: number | null): string | null {
  if (score === null || !Number.isInteger(score) || score < 0 || score > 10) return 'Choose a score from 0 to 10.'
  return null
}

export function priceOpenError(value: string): string | null {
  if (!/^[0-9]+$/.test(value)) return 'Enter a whole amount in rupees, digits only.'
  const amount = Number(value)
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > MAX_PRICE_RUPEES) {
    return 'Enter an amount from ₹0 to ₹10,00,000.'
  }
  return null
}

export function priceChoiceError(choice: string | null): string | null {
  if (choice !== 'yes' && choice !== 'no') return 'Choose Yes or No.'
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
    willingness: String(Number(answer.willingness)),
    price_choice: null,
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
