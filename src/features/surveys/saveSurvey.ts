import { assertNoError } from '../../lib/errors.ts'
import { supabase } from '../../lib/supabase.ts'
import { surveyAnswerRow, surveyDismissalRow, type SurveyAnswer, type SurveyPrompt, type SurveyRow } from './surveys.ts'

const SIGN_IN = 'Sign in to record this survey. This preview stays on this device.'

export async function loadSurveyPrompts(): Promise<SurveyPrompt[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('survey_responses').select('prompt')
  assertNoError(error)
  return (data ?? []).flatMap((row) => {
    const prompt = row.prompt
    if (prompt === 'day_14' || prompt === 'day_30' || prompt === 'price') return [prompt]
    return []
  })
}

export async function saveSurvey(answer: SurveyAnswer): Promise<void> {
  await insertSurvey((userId) => surveyAnswerRow(userId, answer))
}

export async function dismissSurvey(prompt: SurveyPrompt): Promise<void> {
  await insertSurvey((userId) => surveyDismissalRow(userId, prompt))
}

async function insertSurvey(build: (userId: string) => SurveyRow): Promise<void> {
  if (!supabase) throw new Error(SIGN_IN)
  const { data, error: userError } = await supabase.auth.getUser()
  if (userError) throw new Error(userError.message)
  if (!data.user) throw new Error(SIGN_IN)
  const { error } = await supabase.from('survey_responses').insert(build(data.user.id))
  if (error?.code === '23505') throw new Error('This survey is already recorded for your account.')
  assertNoError(error)
}
