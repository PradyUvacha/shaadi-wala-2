import raw from '../../app.config.json' with { type: 'json' }
import { isValidVersionCode, isValidVersionName } from './version.ts'

const config = raw as {
  appId: string
  appName: string
  versionCode: number
  versionName: string
}

if (!isValidVersionName(config.versionName) || !isValidVersionCode(config.versionCode)) {
  throw new Error(
    'Invalid app.config.json. versionName must look like SW_0.1_FoundationOAuthMixpanel_03Nov26 and versionCode must be a positive integer.',
  )
}

/** Package id, display name, and Android version. Edit app.config.json only. */
export const appConfig = {
  appId: config.appId,
  appName: config.appName,
  versionCode: config.versionCode,
  versionName: config.versionName,
} as const
