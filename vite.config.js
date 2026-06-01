// ─────────────────────────────────────────────────────────────────────────────
// vite.config.js — Build tool configuration
//
// Vite is the tool that takes all your React code and bundles it into a
// website that browsers can understand. Think of it as the compiler/packager.
// This file tells Vite which plugins to use when building the project.
// ─────────────────────────────────────────────────────────────────────────────

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'       // Teaches Vite how to handle React (JSX) files
import tailwindcss from '@tailwindcss/vite'    // Teaches Vite how to process Tailwind CSS classes

export default defineConfig({
  plugins: [
    react(),        // Enables React + JSX support
    tailwindcss(),  // Scans all files for Tailwind classes and generates the CSS
  ],
})
