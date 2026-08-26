import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Azure Static Web Apps: keep app routes in the hash so refresh never 404s.
// If someone opens /login or /missions as a real path, bounce to /#/login etc.
(() => {
  const { pathname, search, hash } = window.location
  if (pathname !== '/' && pathname !== '/index.html') {
    const target = `#${pathname}${search}`
    if (hash !== target) {
      window.location.replace(`/${target}`)
    }
  }
})()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
