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
