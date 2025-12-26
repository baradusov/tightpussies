import './index.css'

// Defer loading React and all interactivity until after first paint
const loadApp = () => {
  import('./bootstrap').then(({ bootstrap }) => bootstrap())
}

// Use requestIdleCallback if available, otherwise setTimeout
if ('requestIdleCallback' in window) {
  requestIdleCallback(loadApp)
} else {
  setTimeout(loadApp, 1)
}
