import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './app/routes.tsx'
import { AuthProvider } from './state/AuthProvider.tsx'
import { WeddingProvider } from './state/WeddingProvider.tsx'

export default function App() {
  return (
    <AuthProvider>
      <WeddingProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </WeddingProvider>
    </AuthProvider>
  )
}
