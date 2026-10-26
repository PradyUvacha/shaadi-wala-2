import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/auth-context.ts'
import { dismissSurvey, loadSurveyState, savePriceChoice, saveSurvey } from './saveSurvey.ts'
import { SurveySheet } from './SurveySheet.tsx'
import { dueSurvey, surveyDebugEnabled, surveyOverride, type PriceChoice, type SurveyAnswer, type SurveyPrompt } from './surveys.ts'

export function SurveyGate() {
  const { session } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const userId = session?.user.id ?? null
  const [recorded, setRecorded] = useState<SurveyPrompt[] | null>(null)
  const [pendingPrice, setPendingPrice] = useState(false)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [closedPrompt, setClosedPrompt] = useState<SurveyPrompt | null>(null)
  const debug = surveyDebugEnabled()
  const forced = debug ? surveyOverride(location.search) : null

  useEffect(() => {
    if (!userId) return
    let active = true
    void loadSurveyState()
      .then((state) => {
        if (!active) return
        setLoadedFor(userId)
        setRecorded(state.prompts)
        setPendingPrice(state.pendingPriceChoice)
      })
      .catch(() => {
        if (!active) return
        setLoadedFor(userId)
        setRecorded(forced ? [] : null)
        setPendingPrice(false)
      })
    return () => {
      active = false
    }
  }, [userId, forced])

  const recordedPrompts = !userId ? [] : loadedFor === userId ? recorded : null
  const pendingPriceChoice = Boolean(userId && loadedFor === userId && pendingPrice)
  const due = recordedPrompts
    ? dueSurvey({
        signedUpAt: session?.user.created_at ?? null,
        recorded: recordedPrompts,
        override: forced,
        debug,
        pendingPriceChoice,
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
    if (answer.kind === 'price-open') {
      setPendingPrice(true)
      setLoadedFor(userId)
      return
    }
    setRecorded((current) => [...(current ?? []), answer.prompt])
    setLoadedFor(userId)
    finish()
  }

  const onSaveChoice = async (choice: PriceChoice) => {
    await savePriceChoice(choice)
    setPendingPrice(false)
    setRecorded((current) => (current?.includes('price') ? current : [...(current ?? []), 'price']))
    setLoadedFor(userId)
    finish()
  }

  const onDismiss = async () => {
    if (session) await dismissSurvey(due.prompt)
    setPendingPrice(false)
    setRecorded((current) => [...(current ?? []), due.prompt])
    setLoadedFor(userId)
    finish()
  }

  return (
    <SurveySheet
      prompt={due.prompt}
      initialStep={due.step === 'choice' ? 'choice' : 'open'}
      onSave={onSave}
      onSaveChoice={onSaveChoice}
      onDismiss={onDismiss}
      onClose={finish}
    />
  )
}
