import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

export function bootstrap() {
  // Remove loading indicators when React takes over
  document.documentElement.classList.remove('loading')
  document.getElementById('loading-bar')?.remove()
  document.getElementById('prerender')?.remove()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
