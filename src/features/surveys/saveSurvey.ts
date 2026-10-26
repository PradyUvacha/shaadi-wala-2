import { assertNoError } from '../../lib/errors.ts'
import { supabase } from '../../lib/supabase.ts'
import {
  priceChoiceError,
  surveyAnswerRow,
  surveyDismissalRow,
  type PriceChoice,
  type SurveyAnswer,
  type SurveyPrompt,
  type SurveyRow,
} from './surveys.ts'

const SIGN_IN = 'Sign in to record this survey. This preview stays on this device.'
const ALREADY = 'This survey is already recorded for your account.'

export type SurveyLoad = {
  prompts: SurveyPrompt[]
  pendingPriceChoice: boolean
}

export async function loadSurveyState(): Promise<SurveyLoad> {
  if (!supabase) return { prompts: [], pendingPriceChoice: false }
  const { data, error } = await supabase.from('survey_responses').select('prompt, willingness, price_choice, dismissed')
  assertNoError(error)
  const prompts: SurveyPrompt[] = []
  let pendingPriceChoice = false
  for (const row of data ?? []) {
    const prompt = row.prompt
    if (prompt !== 'day_14' && prompt !== 'day_30' && prompt !== 'price') continue
    const partialPrice = prompt === 'price'
      && row.dismissed !== true
      && (row.price_choice == null || row.price_choice === '')
      && typeof row.willingness === 'string'
      && row.willingness.trim().length > 0
    if (partialPrice) {
      pendingPriceChoice = true
      continue
    }
    prompts.push(prompt)
  }
  return { prompts, pendingPriceChoice }
}

export async function saveSurvey(answer: SurveyAnswer): Promise<void> {
  await insertSurvey((userId) => surveyAnswerRow(userId, answer), answer.kind === 'price-open')
}

export async function savePriceChoice(choice: PriceChoice): Promise<void> {
  const problem = priceChoiceError(choice)
  if (problem) throw new Error(problem)
  if (!supabase) throw new Error(SIGN_IN)
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw new Error(userError.message)
  if (!userData.user) throw new Error(SIGN_IN)
  const { data, error } = await supabase
    .from('survey_responses')
    .update({ price_choice: choice })
    .eq('user_id', userData.user.id)
    .eq('prompt', 'price')
    .is('price_choice', null)
    .select('id')
  if (error?.code === '23505') throw new Error(ALREADY)
  assertNoError(error)
  if (!data || data.length === 0) throw new Error(ALREADY)
}

export async function dismissSurvey(prompt: SurveyPrompt): Promise<void> {
  await insertSurvey((userId) => surveyDismissalRow(userId, prompt), false)
}

async function insertSurvey(build: (userId: string) => SurveyRow, ignoreDuplicate: boolean): Promise<void> {
  if (!supabase) throw new Error(SIGN_IN)
  const { data, error: userError } = await supabase.auth.getUser()
  if (userError) throw new Error(userError.message)
  if (!data.user) throw new Error(SIGN_IN)
  const { error } = await supabase.from('survey_responses').insert(build(data.user.id))
  if (error?.code === '23505') {
    if (ignoreDuplicate) return
    throw new Error(ALREADY)
  }
  assertNoError(error)
}
