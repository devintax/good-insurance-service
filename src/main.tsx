import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import posthog from 'posthog-js'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

posthog.init('phc_aXgOzTjVD92jkhpQmow6YJoognFaYdDHvaF3Hqag8wG', {
  api_host: 'https://posthog.dfgworld.net',
  person_profiles: 'identified_only',
  capture_pageview: true,
  autocapture: true,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
