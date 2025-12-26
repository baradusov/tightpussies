import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

export function bootstrap() {
  // Remove pre-rendered HTML when React takes over
  document.getElementById('prerender')?.remove()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
