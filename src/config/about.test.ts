import { describe, expect, it } from 'vitest'
import { aboutVersionLabel, shortCommitSha } from './about.ts'

const versionName = 'SW_0.1_FoundationOAuthMixpanel_03Nov26'

describe('about version label', () => {
  it('shows the release name, build number, and short commit', () => {
    expect(aboutVersionLabel({
      versionName,
      versionCode: 4,
      commitSha: 'a97f8efae9106626975104ef273e5e60bda52c0e',
    })).toBe('SW_0.1_FoundationOAuthMixpanel_03Nov26 (build 4, a97f8ef)')
    expect(aboutVersionLabel({
      versionName,
      versionCode: 4,
      buildNumber: '128',
      commitSha: 'ABCDEF1234567890',
    })).toBe('SW_0.1_FoundationOAuthMixpanel_03Nov26 (build 128, abcdef1)')
    expect(shortCommitSha('')).toBe('unknown')
    expect(shortCommitSha('not-a-sha')).toBe('unknown')
    expect(aboutVersionLabel({ versionName, versionCode: 4, buildNumber: '0', commitSha: null })).toBe(
      'SW_0.1_FoundationOAuthMixpanel_03Nov26 (build 4, unknown)',
    )
  })
})
