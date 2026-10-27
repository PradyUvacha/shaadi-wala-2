import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { appConfig } from './config/app.ts'
import App from './App.tsx'
import './index.css'

document.title = appConfig.appName

if (Capacitor.isNativePlatform()) {
  void StatusBar.setOverlaysWebView({ overlay: false }).catch(() => undefined)
  void StatusBar.setBackgroundColor({ color: '#760808' }).catch(() => undefined)
  void StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
