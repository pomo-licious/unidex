// ─────────────────────────────────────────────────────────────────────────────
// src/main.jsx — Application entry point
//
// This is the very first file that runs when someone opens the app.
// Its only job is to find the <div id="root"> in index.html and inject the
// entire React app into it. You almost never need to touch this file.
// ─────────────────────────────────────────────────────────────────────────────

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'   // Loads the global CSS (which loads Tailwind)
import App from './App.jsx'

// Find the empty <div id="root"> in index.html and mount the whole app inside it
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* StrictMode runs extra checks in development to catch common mistakes */}
    <App />
  </StrictMode>,
)

// Remove the initial HTML loader once React has rendered
document.getElementById('initial-loader')?.remove()

// Hard timeout: if the loader is still visible after 10 seconds, something is broken
setTimeout(() => {
  const loader = document.getElementById('initial-loader')
  if (loader && loader.parentElement) {
    loader.remove()
    // Show a fallback error message
    const errorDiv = document.createElement('div')
    errorDiv.innerHTML = `
      <div style="position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: #fff; z-index: 9999;">
        <div style="text-align: center; max-width: 400px; padding: 2rem;">
          <p style="font-size: 3rem; margin: 0;">⚠️</p>
          <p style="font-size: 1.25rem; font-weight: bold; color: #333; margin-top: 1rem;">Loading Error</p>
          <p style="color: #666; margin-top: 0.5rem; font-size: 0.875rem;">The app is taking too long to load. Please try refreshing the page.</p>
          <button onclick="location.reload()" style="margin-top: 1.5rem; padding: 0.5rem 1rem; background: #4f46e5; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 500;">Refresh Page</button>
        </div>
      </div>
    `
    document.body.appendChild(errorDiv)
  }
}, 10000)
