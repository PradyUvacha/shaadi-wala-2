import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
const shell = readFileSync(new URL('../src/app/AppShell.tsx', import.meta.url), 'utf8')
const nav = readFileSync(new URL('../src/components/BottomNav.tsx', import.meta.url), 'utf8')
const activity = readFileSync(
  new URL('../android/app/src/main/java/in/shaadiwala/app/MainActivity.java', import.meta.url),
  'utf8',
)

describe('phone layout', () => {
  it('sets a device-width viewport and does not scale the page', () => {
    expect(html).toContain('width=device-width, initial-scale=1, viewport-fit=cover')
    expect(html).not.toContain('initial-scale=1.0')
    expect(css).not.toMatch(/zoom\s*:/)
    expect(shell).not.toContain('transform:')
    expect(nav).not.toContain('translateX')
    expect(nav).not.toContain('maxWidth:')
  })

  it('keeps every phone and foldable full width, including a large display size', () => {
    expect(css).not.toContain('480px')
    expect(css).not.toContain('440px')
    expect(shell).toContain('app-shell')
    expect(shell).not.toContain('maxWidth:')
    expect(css).toContain('min-height: 100dvh')
    expect(css).toContain('font-size: 16px')
    expect(css).toContain('min-height: 44px')
    expect(css).toContain('.chip-row')
    const setup = readFileSync(new URL('../src/features/wedding/CreateWeddingScreen.tsx', import.meta.url), 'utf8')
    expect(setup).not.toContain('Settings')
    expect(setup).not.toContain('maxWidth')
    expect(setup).not.toContain('desktop-column')
  })

  it('tells the Android WebView to use the device width instead of a scaled overview', () => {
    expect(activity).toContain('setUseWideViewPort(true)')
    expect(activity).toContain('setLoadWithOverviewMode(false)')
    expect(activity).toContain('setInitialScale(0)')
  })
})
