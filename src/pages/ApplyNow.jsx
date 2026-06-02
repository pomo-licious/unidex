// pages/ApplyNow.jsx
// Demo-only Apply Now wizard — 4-step flow with real profile data

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STEPS = ['Documents', 'AI Fill', 'Review', 'Submitted']

export default function ApplyNow() {
  const navigate = useNavigate()
  const { applicationId } = useParams()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)

  // Data
  const [application, setApplication] = useState(null)
  const [college, setCollege] = useState(null)
  const [student, setStudent] = useState(null)

  // Step 2 — AI form fill animation
  const [formFields, setFormFields] = useState([])
  const [animatedFields, setAnimatedFields] = useState([])

  // Auth listener — with cleanup and empty dependency array
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => setUser(session?.user ?? null)
    )
    return () => subscription?.unsubscribe()
  }, [])

  // Fetch student data — only when user.id changes
  useEffect(() => {
    if (!user?.id || !applicationId) return

    async function loadData() {
      setLoading(true)
      try {
        // Get student
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', user.id)
          .single()
        if (studentError) throw studentError
        setStudent(studentData)

        // Get application
        const { data: appData, error: appError } = await supabase
          .from('applications')
          .select('*')
          .eq('id', applicationId)
          .eq('student_id', studentData.id)
          .single()
        if (appError) throw appError
        setApplication(appData)

        // Get college
        const { data: collegeData, error: collegeError } = await supabase
          .from('colleges')
          .select('*')
          .eq('id', appData.college_id)
          .single()
        if (collegeError) throw collegeError
        setCollege(collegeData)

        setLoading(false)
      } catch (err) {
        console.error('ApplyNow load error:', err)
        setError(err.message)
        setLoading(false)
      }
    }
    loadData()
  }, [user?.id, applicationId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button
            onClick={() => navigate('/tracker')}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
            Back to Tracker
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Progress bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 mb-4">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center transition-colors ${
                    i + 1 < step
                      ? 'bg-emerald-500 text-white'
                      : i + 1 === step
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                  {i + 1 < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-medium ${i + 1 <= step ? 'text-slate-900' : 'text-slate-400'}`}>
                  {s}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 ${i + 1 < step ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        {step === 1 && <StepDocuments student={student} onNext={() => setStep(2)} />}
        {step === 2 && (
          <StepAIFill
            student={student}
            formFields={formFields}
            setFormFields={setFormFields}
            animatedFields={animatedFields}
            setAnimatedFields={setAnimatedFields}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <StepReview
            college={college}
            student={student}
            formFields={formFields}
            onBack={() => setStep(2)}
            onSubmit={() => setStep(4)}
          />
        )}
        {step === 4 && <StepSubmitted college={college} navigate={navigate} />}
      </div>
    </div>
  )
}

// ── Step 1: Document Check ──────────────────────────────────
function StepDocuments({ student, onNext }) {
  const docs = student?.documents || {}

  const slots = [
    { key: 'resume_url', label: 'Resume', required: true },
    { key: 'transcripts_url', label: 'Transcripts', required: true },
    { key: 'photo_url', label: 'Profile Photo', required: true },
  ]

  const ready = slots.every(s => docs[s.key])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Document Check</h2>
        <p className="text-sm text-slate-500 mt-1">Ensure all required documents are uploaded</p>
      </div>

      <div className="space-y-3">
        {slots.map(slot => (
          <div
            key={slot.key}
            className={`rounded-xl border-2 p-4 flex items-start justify-between ${
              docs[slot.key]
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
            <div>
              <p className="font-medium text-sm text-slate-900">{slot.label}</p>
              {docs[slot.key] ? (
                <p className="text-xs text-emerald-700 mt-0.5">✓ Ready</p>
              ) : (
                <p className="text-xs text-amber-700 mt-0.5">
                  Not uploaded.{' '}
                  <a href="/documents" className="underline hover:no-underline">
                    Upload here
                  </a>
                </p>
              )}
            </div>
            <div className="text-2xl">{docs[slot.key] ? '✓' : '○'}</div>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={!ready}
        className={`w-full px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
          ready
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
        }`}>
        Continue →
      </button>
    </div>
  )
}

// ── Step 2: AI Form Fill ────────────────────────────────────
function StepAIFill({ student, formFields, setFormFields, animatedFields, setAnimatedFields, onNext }) {
  // Populate form fields once when student data loads
  useEffect(() => {
    if (formFields.length === 0 && student?.id) {
      setFormFields([
        { label: 'Full Name', value: student.name },
        { label: 'Email', value: student.email },
        { label: 'CAT Percentile', value: student.academic_background?.cat_percentile || 'N/A' },
        { label: 'Work Experience', value: (student.academic_background?.work_exp_yrs || 0) + ' years' },
        { label: 'CGPA', value: student.academic_background?.gpa || 'N/A' },
        { label: 'Batch Year', value: student.academic_background?.grad_year || 'N/A' },
        { label: 'Target Programme', value: 'MBA (2 year full-time)' },
      ])
    }
  }, [student?.id])

  // Animate fields in sequentially — only triggered when formFields length changes
  useEffect(() => {
    if (formFields.length > 0 && animatedFields.length < formFields.length) {
      const timer = setTimeout(() => {
        setAnimatedFields(prev => [
          ...prev,
          prev.length,
        ])
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [formFields.length])

  const isComplete = animatedFields.length === formFields.length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">AI is reading your profile</h2>
        <p className="text-sm text-slate-500 mt-1">Filling your application from your Unidex profile</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        {formFields.map((field, i) => (
          <div
            key={i}
            className={`transition-all duration-300 ${
              animatedFields.includes(i)
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-2'
            }`}>
            <label className="text-xs font-medium text-slate-700 mb-1 flex items-center gap-2">
              {field.label}
              {animatedFields.includes(i) && <span className="text-emerald-600">✓</span>}
            </label>
            <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-sm text-slate-900">{field.value}</p>
            </div>
          </div>
        ))}
      </div>

      {isComplete && (
        <div className="text-center py-4 rounded-lg bg-emerald-50 border border-emerald-200">
          <p className="text-sm font-medium text-emerald-700">Profile read complete ✓</p>
        </div>
      )}

      <button
        onClick={onNext}
        disabled={!isComplete}
        className={`w-full px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
          isComplete
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
        }`}>
        Review application →
      </button>
    </div>
  )
}

// ── Step 3: Review Screen ───────────────────────────────────
function StepReview({ college, student, formFields, onBack, onSubmit }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Review Your Application</h2>
        <p className="text-sm text-slate-500 mt-1">College: {college?.name}</p>
      </div>

      {/* Demo mode banner */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
        <p className="text-sm font-medium text-amber-900">
          ⚠️ Demo mode — this application will not be submitted to any real institution
        </p>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {formFields.map((field, i) => (
            <div key={i} className="border-b border-slate-100 pb-3 last:border-0">
              <p className="text-xs font-medium text-slate-700">{field.label}</p>
              <p className="text-sm text-slate-900 mt-0.5">{field.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-3 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors">
          ← Back
        </button>
        <button
          onClick={onSubmit}
          className="flex-1 px-4 py-3 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors">
          Submit →
        </button>
      </div>
    </div>
  )
}

// ── Step 4: Confirmation ────────────────────────────────────
function StepSubmitted({ college, navigate }) {
  // Confetti animation (reused from OfferCelebration)
  useEffect(() => {
    const container = document.getElementById('confetti-container')
    if (!container) return

    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div')
      confetti.className = 'fixed animate-bounce'
      confetti.style.left = Math.random() * 100 + '%'
      confetti.style.backgroundColor = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][Math.floor(Math.random() * 5)]
      confetti.style.width = Math.random() * 10 + 5 + 'px'
      confetti.style.height = confetti.style.width
      confetti.style.borderRadius = '50%'
      confetti.style.top = '-10px'
      confetti.style.pointerEvents = 'none'
      confetti.style.animationDuration = Math.random() * 2 + 2 + 's'
      confetti.style.animationDelay = Math.random() * 0.5 + 's'
      container.appendChild(confetti)
    }
  }, [])

  return (
    <div className="relative">
      <div id="confetti-container" className="fixed inset-0 pointer-events-none" />

      <div className="text-center space-y-6 py-8">
        <div>
          <p className="text-6xl mb-4 animate-bounce">✓</p>
          <h2 className="text-2xl font-bold text-slate-900">Demo submitted!</h2>
          <p className="text-sm text-slate-500 mt-2">
            This was a demonstration of the Apply Now flow.<br />
            No real application was submitted.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={() => navigate('/tracker')}
            className="flex-1 px-4 py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
            Back to Tracker
          </button>
          <button
            onClick={() => navigate('/colleges')}
            className="flex-1 px-4 py-3 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors">
            Browse more colleges
          </button>
        </div>
      </div>
    </div>
  )
}
