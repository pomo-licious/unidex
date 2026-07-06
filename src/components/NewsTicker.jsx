// ─────────────────────────────────────────────────────────────────────────────
// src/components/NewsTicker.jsx — Live college news ticker
//
// Scrolling ticker showing latest news about college admissions, scholarships,
// portal openings, and application deadlines. Mock data rotates continuously.
// Shown at top of dashboard on all authenticated pages.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'

const MOCK_NEWS = [
  { id: 1, text: 'IIM Ahmedabad opens Round 2 applications — CAT cutoff: 99%ile', timestamp: '2 min ago' },
  { id: 2, text: 'Infosys scholarship program 2026 announced — ₹10 lac awards available', timestamp: '15 min ago' },
  { id: 3, text: 'ISB Hyderabad extends application deadline to Oct 31', timestamp: '1 hour ago' },
  { id: 4, text: 'XLRI Jamshedpur interviews begin next week — shortlist released', timestamp: '2 hours ago' },
  { id: 5, text: 'McKinsey MBA internship portal now live — 50 seats available', timestamp: '3 hours ago' },
  { id: 6, text: 'IIT Delhi DMS announces interview results for 240 candidates', timestamp: '4 hours ago' },
  { id: 7, text: 'FMS Delhi final round applications close tomorrow — apply now', timestamp: '5 hours ago' },
  { id: 8, text: 'MDI Gurgaon scholarship round now accepting applications', timestamp: '6 hours ago' },
]

export function NewsTicker() {
  const [activeNews, setActiveNews] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveNews(prev => (prev + 1) % MOCK_NEWS.length)
    }, 5000)  // Change news every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const news = MOCK_NEWS[activeNews]

  return (
    <div className="w-full bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-6 py-3">
      <div className="flex items-center gap-3">
        {/* Breaking news badge */}
        <div className="shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            Live News
          </span>
        </div>

        {/* News text — scrolling effect via fade */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="transition-opacity duration-500 animate-fade-in">
            <p className="text-sm font-medium text-gray-800 truncate">{news.text}</p>
            <p className="text-xs text-gray-500 mt-0.5">{news.timestamp}</p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="shrink-0 flex items-center gap-1">
          {MOCK_NEWS.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === activeNews ? 'w-4 bg-amber-600' : 'w-1.5 bg-amber-200'
              }`}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 300ms ease-in;
        }
      `}</style>
    </div>
  )
}
