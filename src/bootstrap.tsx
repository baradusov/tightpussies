import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

export function bootstrap() {
  // Remove loading state when React takes over (keep loading-bar for later use)
  document.documentElement.classList.remove('loading')
  document.getElementById('prerender')?.remove()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
