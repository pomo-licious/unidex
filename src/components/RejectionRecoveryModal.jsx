// ─────────────────────────────────────────────────────────────────────────────
// src/components/RejectionRecoveryModal.jsx — Suggest backup colleges after rejection
//
// When an application is rejected, show modal with tier 2 (or tier 3) colleges
// that the student hasn't applied to yet
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function RejectionRecoveryModal({ studentId, collegeId, onClose, onAddCollege }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingCollege, setAddingCollege] = useState(null)

  useEffect(() => {
    async function loadSuggestions() {
      try {
        // Get all colleges the student has already applied to
        const { data: applications } = await supabase
          .from('applications')
          .select('college_id')
          .eq('student_id', studentId)

        const appliedCollegeIds = new Set(applications?.map(a => a.college_id) || [])

        // Get student's CAT percentile for matching
        const { data: student } = await supabase
          .from('students')
          .select('academic_background')
          .eq('id', studentId)
          .single()

        const catPercentile = student?.academic_background?.cat_percentile || 0

        // Try tier 2 first, if none available try tier 3
        let { data: tier2Colleges } = await supabase
          .from('colleges')
          .select('id, name, type, location, tier, deadlines')
          .eq('tier', 2)

        let candidates = (tier2Colleges || []).filter(c => !appliedCollegeIds.has(c.id))

        if (candidates.length === 0) {
          const { data: tier3Colleges } = await supabase
            .from('colleges')
            .select('id, name, type, location, tier, deadlines')
            .eq('tier', 3)
          candidates = (tier3Colleges || []).filter(c => !appliedCollegeIds.has(c.id))
        }

        // Score candidates and show top 3
        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD in local time
        const scored = candidates.map(c => {
          const deadlines = c.deadlines || []
          const nextDeadline = deadlines
            .filter(d => d.date >= today) // Compare as date strings, not timestamps
            .sort((a, b) => a.date.localeCompare(b.date))[0]

          return {
            ...c,
            nextDeadline: nextDeadline?.date,
            daysUntil: nextDeadline ? Math.ceil((new Date(nextDeadline.date) - new Date()) / (1000 * 60 * 60 * 24)) : null,
          }
        })

        setSuggestions(scored.slice(0, 3))
        setLoading(false)
      } catch (err) {
        console.error('Failed to load suggestions:', err)
        setLoading(false)
      }
    }

    loadSuggestions()
  }, [studentId])

  async function handleAddCollege(collegeId) {
    setAddingCollege(collegeId)
    await onAddCollege(collegeId)
    setAddingCollege(null)
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-6">
          <p className="text-4xl mb-3">📍</p>
          <h2 className="text-xl font-bold text-gray-900">Here are strong matches</h2>
          <p className="text-sm text-gray-500 mt-1">You haven't applied to these yet</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No more colleges available to add</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {suggestions.map(college => (
                <div key={college.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{college.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{college.location}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                      {college.type}
                    </span>
                  </div>
                  {college.daysUntil !== null && (
                    <p className="text-xs text-amber-600 mb-3">
                      ⏱️ {college.daysUntil} days until next deadline
                    </p>
                  )}
                  <button
                    onClick={() => handleAddCollege(college.id)}
                    disabled={addingCollege === college.id}
                    className="w-full px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {addingCollege === college.id ? 'Adding…' : 'Add to Tracker'}
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  )
}
