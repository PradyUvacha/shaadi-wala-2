import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { HINDU_CHECKLIST } from '../src/data/hinduChecklist.ts'
import { isValidVersionCode, isValidVersionName } from '../src/config/version.ts'
import { ONBOARDING_STEPS } from '../src/features/onboarding/steps.ts'
import { deleteAccount } from '../src/features/account/deleteAccount.ts'
import { acceptInvite } from '../src/features/invites/acceptInvite.ts'

const appConfig = JSON.parse(readFileSync(new URL('../app.config.json', import.meta.url), 'utf8')) as {
  appId: string
  appName: string
  versionCode: number
  versionName: string
}

describe('app.config.json', () => {
  it('keeps the final Android package id in one file', () => {
    expect(appConfig.appId).toBe('in.shaadiwala.app')
    expect(appConfig.appName).toBe('Shaadi Wala')
    const capacitor = readFileSync(new URL('../capacitor.config.js', import.meta.url), 'utf8')
    expect(capacitor).toContain('app.config.json')
    expect(capacitor).not.toContain('in.shaadiwala.app')
  })

  it('follows SW_<version>_<key features>_<date> and keeps versionCode an integer', () => {
    expect(isValidVersionName(appConfig.versionName)).toBe(true)
    expect(isValidVersionName('SW_1.0_Checklist-Budget-Guests_2026-11-17')).toBe(true)
    expect(isValidVersionName('1.0')).toBe(false)
    expect(isValidVersionName('SW_1.0_Checklist Budget_2026-11-17')).toBe(false)
    expect(isValidVersionCode(appConfig.versionCode)).toBe(true)
  })

  it('lets Gradle read the package id and version from that file', () => {
    const gradle = readFileSync(new URL('../android/app/build.gradle', import.meta.url), 'utf8')
    expect(gradle).toContain('app.config.json')
    expect(gradle).toContain('def versionCodeValue = (appConfig.versionCode as Number).intValue()')
    expect(gradle).toContain('versionCode versionCodeValue')
    expect(gradle).toContain('versionName appConfig.versionName')
    expect(gradle).not.toMatch(/versionName\s+"/)
    const manifest = readFileSync(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8')
    expect(manifest).toContain('android:scheme="@string/custom_url_scheme"')
    expect(manifest).toContain('android:host="auth"')
    expect(manifest).toContain('android:pathPrefix="/callback"')
    const activity = readFileSync(
      new URL('../android/app/src/main/java/in/shaadiwala/app/MainActivity.java', import.meta.url),
      'utf8',
    )
    expect(activity).toContain(`package ${appConfig.appId};`)
  })

  it('uses the same name in the web document title', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
    expect(html).toContain(`<title>${appConfig.appName}</title>`)
    expect(html).not.toContain('Vite + React')
  })
})

describe('starter checklist migration', () => {
  it('seeds every Hindu checklist title', () => {
    const sql = readFileSync(new URL('../supabase/migrations/20261024180000_init.sql', import.meta.url), 'utf8')
    expect(sql).toContain('hindu-starter')
    expect(sql).toContain('enable row level security')
    expect(sql).toContain('create_wedding')
    for (const item of HINDU_CHECKLIST) {
      expect(sql).toContain(item.title.replaceAll("'", "''"))
    }
  })
})

describe('later product seams', () => {
  it('lists the onboarding steps without building the wizard yet', () => {
    expect(ONBOARDING_STEPS.map((step) => step.id)).toEqual(['account', 'wedding', 'side', 'checklist'])
  })

  it('reserves account deletion and invite acceptance', async () => {
    await expect(deleteAccount()).rejects.toThrow(/not available/i)
    await expect(acceptInvite('token')).rejects.toThrow(/not available/i)
    await expect(acceptInvite('  ')).rejects.toThrow(/missing/i)
  })
})
