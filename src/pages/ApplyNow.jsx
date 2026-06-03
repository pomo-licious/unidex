import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STEPS = ['Documents', 'AI Fill', 'Review', 'Submitted']

export default function ApplyNow() {
  const { applicationId } = useParams()
  const navigate = useNavigate()

  // State — only what we need
  const [step, setStep] = useState(1)
  const [user, setUser] = useState(null)
  const [student, setStudent] = useState(null)
  const [application, setApplication] = useState(null)
  const [college, setCollege] = useState(null)
  const [visibleFields, setVisibleFields] = useState([])

  // Ref for animation interval — not state, to avoid dependency loops
  const animationRef = useRef(null)

  // EFFECT 1: Auth listener — runs once on mount, cleans up on unmount
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setUser(session?.user ?? null)
    )
    return () => subscription.unsubscribe()
  }, [])

  // EFFECT 2: Fetch student + application when user logs in
  useEffect(() => {
    if (!user?.id) return

    async function load() {
      try {
        // Fetch student data
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', user.id)
          .single()
        if (studentError) throw studentError

        // Fetch application with college details in parallel
        const { data: appData, error: appError } = await supabase
          .from('applications')
          .select('*, colleges(id, name, location, tier, placement_avg_lpa)')
          .eq('id', applicationId)
          .eq('student_id', studentData.id)
          .single()
        if (appError) throw appError

        setStudent(studentData)
        setApplication(appData)
        if (appData?.colleges) {
          setCollege(appData.colleges)
        }
      } catch (err) {
        console.error('ApplyNow load error:', err)
        navigate('/tracker')
      }
    }

    load()
  }, [user?.id, applicationId, navigate])

  // EFFECT 3: Typewriter animation for step 2 (AI Fill)
  // Only runs when step becomes 2 AND student data is available
  useEffect(() => {
    if (step !== 2 || !student) return

    let index = 0
    const totalFields = 7 // Number of form fields to animate

    animationRef.current = setInterval(() => {
      index++
      setVisibleFields(Array.from({ length: Math.min(index, totalFields) }, (_, i) => i))
      if (index >= totalFields) {
        clearInterval(animationRef.current)
      }
    }, 600)

    return () => {
      if (animationRef.current) clearInterval(animationRef.current)
    }
  }, [step, student?.id])

  // Compute fields from student data — not state
  const formFields = student ? [
    { label: 'Full Name', value: student.name },
    { label: 'Email', value: student.email },
    { label: 'CAT Percentile', value: `${student.academic_background?.cat_percentile}%ile` },
    { label: 'Work Experience', value: `${student.academic_background?.work_exp_yrs || 0} years` },
    { label: 'CGPA', value: student.academic_background?.gpa || 'N/A' },
    { label: 'Batch Year', value: student.academic_background?.grad_year || 'N/A' },
    { label: 'Target Programme', value: 'MBA (2 year full-time)' },
  ] : []

  // Show loading state
  if (!user || !student || !application || !college) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
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
        {/* STEP 1: Document Check */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Document Check</h2>
              <p className="text-sm text-slate-500 mt-1">Ensure all required documents are uploaded</p>
            </div>

            <div className="space-y-3">
              {[
                { key: 'resume_url', label: 'Resume', required: true },
                { key: 'transcripts_url', label: 'Transcripts', required: true },
                { key: 'photo_url', label: 'Profile Photo', required: true },
              ].map(slot => {
                const hasDoc = student?.documents?.[slot.key]
                return (
                  <div
                    key={slot.key}
                    className={`rounded-xl border-2 p-4 flex items-start justify-between ${
                      hasDoc ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                    }`}>
                    <div>
                      <p className="font-medium text-sm text-slate-900">{slot.label}</p>
                      {hasDoc ? (
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
                    <div className="text-2xl">{hasDoc ? '✓' : '○'}</div>
                  </div>
                )
              })}
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full px-4 py-3 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
              Continue →
            </button>
          </div>
        )}

        {/* STEP 2: AI Form Fill */}
        {step === 2 && (
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
                    visibleFields.includes(i) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                  }`}>
                  <label className="text-xs font-medium text-slate-700 mb-1 flex items-center gap-2">
                    {field.label}
                    {visibleFields.includes(i) && <span className="text-emerald-600">✓</span>}
                  </label>
                  <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-sm text-slate-900">{field.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {visibleFields.length === formFields.length && (
              <div className="text-center py-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <p className="text-sm font-medium text-emerald-700">Profile read complete ✓</p>
              </div>
            )}

            <button
              onClick={() => setStep(3)}
              disabled={visibleFields.length < formFields.length}
              className={`w-full px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                visibleFields.length === formFields.length
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}>
              Review application →
            </button>
          </div>
        )}

        {/* STEP 3: Review Screen */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Review Your Application</h2>
              <p className="text-sm text-slate-500 mt-1">College: {college.name}</p>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm font-medium text-amber-900">
                ⚠️ Demo mode — this application will not be submitted to any real institution
              </p>
            </div>

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

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 px-4 py-3 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors">
                ← Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 px-4 py-3 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors">
                Submit →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Confirmation */}
        {step === 4 && (
          <div className="text-center space-y-6 py-8">
            <div id="confetti-container" className="fixed inset-0 pointer-events-none" />

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
        )}
      </div>
    </div>
  )
}
