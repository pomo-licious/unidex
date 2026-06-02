// ─────────────────────────────────────────────────────────────────────────────
// src/pages/OfferCelebration.jsx — Full-screen offer celebration
//
// Triggered when application status changes to "Offer"
// Shows confetti celebration with college name and referral CTA
//
// Route: /offer/:college_id
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function OfferCelebration() {
  const navigate = useNavigate()
  const { college_id } = useParams()
  const [collegeName, setCollegeName] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [copied, setCopied] = useState(false)

  // Get auth user and college name
  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (college_id) {
          const { data: college } = await supabase
            .from('colleges')
            .select('name')
            .eq('id', college_id)
            .single()

          if (college) {
            setCollegeName(college.name)
          }
        }

        setLoading(false)
      } catch (err) {
        console.error('Failed to load offer data:', err)
        setLoading(false)
      }
    }

    loadData()
  }, [college_id])

  // Copy referral link to clipboard
  async function handleCopyReferral() {
    if (!user) return

    const referralUrl = `${window.location.origin}/signup?ref=${user.id}`
    try {
      await navigator.clipboard.writeText(referralUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Confetti animation
  useEffect(() => {
    if (loading) return

    // Create simple confetti effect
    const container = document.getElementById('confetti-container')
    if (!container) return

    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div')
      confetti.className = 'absolute animate-bounce'
      confetti.style.left = Math.random() * 100 + '%'
      confetti.style.backgroundColor = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][Math.floor(Math.random() * 5)]
      confetti.style.width = Math.random() * 10 + 5 + 'px'
      confetti.style.height = confetti.style.width
      confetti.style.borderRadius = '50%'
      confetti.style.top = '-10px'
      confetti.style.animationDuration = Math.random() * 2 + 2 + 's'
      confetti.style.animationDelay = Math.random() * 0.5 + 's'
      container.appendChild(confetti)
    }
  }, [loading])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center p-4 overflow-hidden">
      {/* Confetti container */}
      <div id="confetti-container" className="fixed inset-0 pointer-events-none" />

      {/* Content */}
      <div className="text-center max-w-lg">
        <div className="mb-8">
          <p className="text-8xl mb-6 animate-bounce" style={{ animationDelay: '0.1s' }}>
            🎉
          </p>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            You got into {collegeName || 'the college'}!
          </h1>
          <p className="text-lg text-gray-600">Congratulations on your offer</p>
        </div>

        <div className="space-y-4 mt-12">
          {/* Share referral CTA */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <p className="text-sm font-semibold text-gray-900 mb-3">Share with a friend</p>
            <p className="text-xs text-gray-500 mb-4">
              Send them your referral link — you both get early access to Unidex Pro
            </p>
            <button
              onClick={handleCopyReferral}
              className="w-full px-4 py-3 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors"
            >
              {copied ? '✓ Copied referral link' : 'Copy referral link'}
            </button>
          </div>

          {/* Back to tracker CTA */}
          <button
            onClick={() => navigate('/tracker')}
            className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 text-gray-900 font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            Back to Tracker
          </button>
        </div>
      </div>
    </div>
  )
}
