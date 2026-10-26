/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { SurveySheet } from './SurveySheet.tsx'
import { PRICE_CLOSED_QUESTION, PRICE_OPEN_QUESTION } from './surveys.ts'

function setNativeValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
}

async function fireInput(input: HTMLInputElement, value: string, inputType: string) {
  await act(async () => {
    setNativeValue(input, value)
    input.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType }))
  })
}

describe('open price field', () => {
  it('rejects typed and pasted -50 and stays on the open question', async () => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const saved: string[] = []
    const container = document.createElement('div')
    document.body.append(container)
    const root: Root = createRoot(container)
    await act(async () => {
      root.render(
        <SurveySheet
          prompt="price"
          onSave={async (answer) => {
            if (answer.kind === 'price-open') saved.push(answer.willingness)
          }}
          onSaveChoice={async () => {}}
          onDismiss={async () => {}}
          onClose={() => {}}
        />,
      )
    })

    const input = container.querySelector('input')
    if (!(input instanceof HTMLInputElement)) throw new Error('missing price field')
    expect(input.type).toBe('text')
    expect(input.inputMode).toBe('numeric')

    let draft = ''
    for (const char of '-50') {
      draft += char
      await fireInput(input, draft, 'insertText')
    }
    expect(input.value).toBe('-50')
    expect(container.textContent).toMatch(/digits only/)
    expect(container.textContent).not.toContain(PRICE_CLOSED_QUESTION)

    const next = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Next')
    await act(async () => {
      next?.click()
    })
    expect(saved).toEqual([])
    expect(input.value).toBe('-50')
    expect(container.textContent).toContain(PRICE_OPEN_QUESTION)
    expect(container.textContent).toMatch(/digits only/)
    expect(container.textContent).not.toContain(PRICE_CLOSED_QUESTION)

    await fireInput(input, '', 'deleteContentBackward')
    await fireInput(input, '-50', 'insertFromPaste')
    expect(input.value).toBe('-50')
    expect(container.textContent).toMatch(/digits only/)
    await act(async () => {
      next?.click()
    })
    expect(saved).toEqual([])
    expect(input.value).toBe('-50')
    expect(container.textContent).toContain(PRICE_OPEN_QUESTION)
    expect(container.textContent).not.toContain(PRICE_CLOSED_QUESTION)

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})