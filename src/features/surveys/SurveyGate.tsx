import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/auth-context.ts'
import { dismissSurvey, loadSurveyPrompts, saveSurvey } from './saveSurvey.ts'
import { SurveySheet } from './SurveySheet.tsx'
import { dueSurvey, type SurveyAnswer, type SurveyPrompt } from './surveys.ts'

export function SurveyGate() {
  const { session } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const userId = session?.user.id ?? null
  const [recorded, setRecorded] = useState<SurveyPrompt[] | null>(null)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [closedPrompt, setClosedPrompt] = useState<SurveyPrompt | null>(null)
  const override = new URLSearchParams(location.search).get('survey')
  const forced = override === 'nps' || override === 'price' ? override : null

  useEffect(() => {
    if (!userId) return
    let active = true
    void loadSurveyPrompts()
      .then((prompts) => {
        if (!active) return
        setLoadedFor(userId)
        setRecorded(prompts)
      })
      .catch(() => {
        if (!active) return
        setLoadedFor(userId)
        setRecorded(forced ? [] : null)
      })
    return () => {
      active = false
    }
  }, [userId, forced])

  const recordedPrompts = !userId ? [] : loadedFor === userId ? recorded : null
  const due = recordedPrompts
    ? dueSurvey({
        signedUpAt: session?.user.created_at ?? null,
        recorded: recordedPrompts,
        override: forced,
      })
    : null
  if (!due || closedPrompt === due.prompt) return null

  const finish = () => {
    setClosedPrompt(due.prompt)
    if (!forced) return
    const params = new URLSearchParams(location.search)
    params.delete('survey')
    const search = params.toString()
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true })
  }

  const onSave = async (answer: SurveyAnswer) => {
    await saveSurvey(answer)
    setRecorded((current) => [...(current ?? []), answer.prompt])
    setLoadedFor(userId)
    finish()
  }

  const onDismiss = async () => {
    if (session) await dismissSurvey(due.prompt)
    setRecorded((current) => [...(current ?? []), due.prompt])
    setLoadedFor(userId)
    finish()
  }

  return <SurveySheet prompt={due.prompt} onSave={onSave} onDismiss={onDismiss} />
}
