import { useState } from 'react'
import { FormError } from '../../components/ui.tsx'
import { toErrorMessage } from '../../lib/errors.ts'
import { COLORS } from '../../styles/tokens.ts'
import { inputStyle, primaryButton } from '../../styles/ui.ts'
import {
  NPS_QUESTION,
  PRICE_CLOSED_QUESTION,
  PRICE_OPEN_QUESTION,
  npsAnswerError,
  priceChoiceError,
  priceOpenError,
  type PriceChoice,
  type SurveyAnswer,
  type SurveyPrompt,
} from './surveys.ts'

const choiceButton = (selected: boolean) => ({
  flex: 1,
  minHeight: 48,
  borderRadius: 12,
  border: `1px solid ${selected ? COLORS.crimson : COLORS.gold}`,
  background: selected ? COLORS.crimson : '#fff',
  color: selected ? '#fff' : COLORS.crimson,
  fontWeight: 700,
  cursor: 'pointer',
})

export function SurveySheet({
  prompt,
  initialStep = 'open',
  onSave,
  onSaveChoice,
  onDismiss,
  onClose,
}: {
  prompt: SurveyPrompt
  initialStep?: 'open' | 'choice'
  onSave: (answer: SurveyAnswer) => Promise<void>
  onSaveChoice: (choice: PriceChoice) => Promise<void>
  onDismiss: () => Promise<void>
  onClose: () => void
}) {
  const [score, setScore] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [willingness, setWillingness] = useState('')
  const [step, setStep] = useState<'open' | 'choice'>(initialStep)
  const [choice, setChoice] = useState<PriceChoice | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (caught) {
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  const submitNps = () => {
    const problem = npsAnswerError(score)
    if (problem || score === null || prompt === 'price') {
      setError(problem ?? 'Choose a score from 0 to 10.')
      return
    }
    void run(() => onSave({ kind: 'nps', prompt, score, comment }))
  }

  const continuePrice = () => {
    const problem = priceOpenError(willingness)
    if (problem) {
      setError(problem)
      return
    }
    void run(async () => {
      await onSave({ kind: 'price-open', willingness })
      setStep('choice')
    })
  }

  const submitPrice = () => {
    const problem = priceChoiceError(choice)
    if (problem || !choice) {
      setError(problem ?? 'Choose Yes or No.')
      return
    }
    void run(() => onSaveChoice(choice))
  }

  const close = () => {
    if (prompt === 'price' && step === 'choice') {
      onClose()
      return
    }
    void run(onDismiss)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(26,5,5,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="survey-title" style={{ width: '100%', maxWidth: 480, background: COLORS.cardBg, borderRadius: '20px 20px 0 0', padding: '18px 18px calc(18px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))', boxShadow: '0 -8px 30px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div id="survey-title" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, color: COLORS.crimson, fontWeight: 700 }}>
            {prompt === 'price' ? 'A question about price' : 'A quick question'}
          </div>
          <button type="button" onClick={close} disabled={busy} style={{ background: 'transparent', border: 'none', color: '#8B5050', fontWeight: 700, cursor: 'pointer', minHeight: 44 }}>
            Not now
          </button>
        </div>
        {prompt === 'price' ? (
          step === 'open' ? (
            <>
              <p style={{ color: '#3C1515', fontSize: 15, lineHeight: 1.45 }}>{PRICE_OPEN_QUESTION}</p>
              <input
                style={inputStyle}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={willingness}
                onChange={(event) => {
                  const next = event.target.value
                  setWillingness(next)
                  setError(priceOpenError(next))
                }}
                placeholder="Amount in rupees"
                aria-label={PRICE_OPEN_QUESTION}
              />
              <FormError message={error} />
              <button type="button" disabled={busy} onClick={continuePrice} style={{ ...primaryButton(COLORS.crimson), marginTop: 8 }}>{busy ? 'Saving…' : 'Next'}</button>
            </>
          ) : (
            <>
              <p style={{ color: '#3C1515', fontSize: 15, lineHeight: 1.45 }}>{PRICE_CLOSED_QUESTION}</p>
              <div style={{ display: 'flex', gap: 8 }} role="group" aria-label={PRICE_CLOSED_QUESTION}>
                {(['yes', 'no'] as const).map((value) => (
                  <button key={value} type="button" aria-pressed={choice === value} onClick={() => setChoice(value)} style={choiceButton(choice === value)}>
                    {value === 'yes' ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
              <FormError message={error} />
              <button type="button" disabled={busy} onClick={submitPrice} style={{ ...primaryButton(COLORS.crimson), marginTop: 12 }}>{busy ? 'Saving…' : 'Save answer'}</button>
            </>
          )
        ) : (
          <>
            <p style={{ color: '#3C1515', fontSize: 15, lineHeight: 1.45 }}>{NPS_QUESTION}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} role="group" aria-label="Score from 0 to 10">
              {Array.from({ length: 11 }, (_, value) => (
                <button key={value} type="button" aria-pressed={score === value} onClick={() => setScore(value)} style={{ width: 44, height: 44, borderRadius: 10, border: `1px solid ${score === value ? COLORS.crimson : '#E0CABB'}`, background: score === value ? COLORS.crimson : '#fff', color: score === value ? '#fff' : COLORS.crimson, fontWeight: 700, cursor: 'pointer' }}>
                  {value}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8B5050', marginTop: 4 }}>
              <span>Not likely</span>
              <span>Very likely</span>
            </div>
            <label style={{ display: 'block', marginTop: 14, fontSize: 12, fontWeight: 700, color: COLORS.crimson }}>
              Comment (optional)
              <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical', marginTop: 6 }} value={comment} maxLength={1000} onChange={(event) => setComment(event.target.value)} aria-label="Comment (optional)" />
            </label>
            <FormError message={error} />
            <button type="button" disabled={busy} onClick={submitNps} style={{ ...primaryButton(COLORS.crimson), marginTop: 8 }}>{busy ? 'Saving…' : 'Send score'}</button>
          </>
        )}
      </div>
    </div>
  )
}
