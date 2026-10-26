import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const appConfig = JSON.parse(readFileSync(resolve(root, 'app.config.json'), 'utf8'))

// Named exports: Capacitor loads this file with require(), which surfaces named
// exports on the module object. The values still come only from app.config.json.
export const appId = appConfig.appId
export const appName = appConfig.appName
export const webDir = 'dist'
export const backgroundColor = '#FDF6EC'
export const android = {
  backgroundColor: '#FDF6EC',
  allowMixedContent: false,
}
export const server = {
  androidScheme: 'https',
}
export const plugins = {
  SplashScreen: {
    launchAutoHide: true,
    backgroundColor: '#6B0000',
    showSpinner: false,
  },
}
