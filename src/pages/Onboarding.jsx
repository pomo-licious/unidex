// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Onboarding.jsx — 3-step profile setup wizard
//
// This is the detailed profile capture form. It walks the student through
// three steps: personal info → academic background → target college selection.
// Currently uses local state only (no Supabase save) — it's a UI concept.
// When wired up: the final "Start Tracking" button should upsert the student
// row in Supabase with all collected form data.
//
// Route: /onboarding
// ─────────────────────────────────────────────────────────────────────────────

import { useState, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { COLLEGES, TYPE_META, fitLabel } from '../lib/mockData'

// ─── Static option lists for dropdowns ───────────────────────────────────────
const DEGREES    = ['B.Tech / B.E.', 'B.Sc', 'B.Com', 'B.A.', 'BBA', 'B.Arch', 'Other']
const CITIES     = ['Mumbai', 'Delhi / NCR', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Other']
const TYPES      = ['All', 'IIM', 'IIT', 'Private', 'Government']   // College type filter buttons
const STEP_LABELS = ['Personal Details', 'Academic Background', 'Target Colleges']

export default function Onboarding() {
  const navigate = useNavigate()

  // ── Which step the wizard is on (1, 2, or 3) ──────────────────────────────
  const [step, setStep]           = useState(1)

  // ── Which college type filter is active on step 3 ─────────────────────────
  const [typeFilter, setTypeFilter] = useState('All')

  // ── All form fields in one state object ───────────────────────────────────
  const [form, setForm] = useState({
    // Step 1 — personal info
    name: '', email: '', phone: '', city: '',
    // Step 2 — academic background
    degree: '', grad_year: '', gpa: '',
    cat_percentile: '', gmat_score: '',
    work_exp_yrs: '', company: '', role: '',
    // Step 3 — college selection (array of college names)
    target_colleges: [],
  })

  // ── Save state for loading and error handling ──────────────────────────────
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // ── set — generic input handler: updates whichever field was changed ───────
  const set = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  // ── toggleCollege — adds or removes a college from the target_colleges array ──
  function toggleCollege(name) {
    setForm(f => ({
      ...f,
      target_colleges: f.target_colleges.includes(name)
        ? f.target_colleges.filter(c => c !== name)   // already selected → remove it
        : [...f.target_colleges, name],               // not selected → add it
    }))
  }

  // ── handleStartTracking — save form data to Supabase and navigate ──────────
  async function handleStartTracking() {
    setSaving(true)
    setError(null)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upsert into students table
      const { error: upsertError } = await supabase
        .from('students')
        .upsert({
          user_id: user.id,
          name: form.name,
          email: form.email,
          target_colleges: form.target_colleges,
          academic_background: {
            phone: form.phone,
            city: form.city,
            degree: form.degree,
            grad_year: form.grad_year ? parseInt(form.grad_year) : null,
            cgpa: form.gpa ? parseFloat(form.gpa) : null,
            cat_percentile: form.cat_percentile ? parseFloat(form.cat_percentile) : null,
            gmat_score: form.gmat_score ? parseInt(form.gmat_score) : null,
            work_exp_yrs: form.work_exp_yrs ? parseFloat(form.work_exp_yrs) : null,
            company: form.company,
            role: form.role,
          }
        }, { onConflict: 'user_id' })

      if (upsertError) throw upsertError

      // Success — navigate to profile
      navigate('/profile')
    } catch (err) {
      console.error('Error saving profile:', err)
      setError(err.message || 'Failed to save profile')
      setSaving(false)
    }
  }

  // ── visible — colleges to show after applying the type filter ─────────────
  const visible = typeFilter === 'All' ? COLLEGES : COLLEGES.filter(c => c.type === typeFilter)

  // ── catPct — student's current CAT percentile input (for fit label calculation) ──
  const catPct = parseFloat(form.cat_percentile) || 0

  // ── step1Valid — "Continue" button on step 1 is disabled unless name + email filled ──
  const step1Valid = form.name.trim().length > 0 && form.email.trim().length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* ── Logo ── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">U</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Unidex</span>
          </div>
          <p className="text-sm text-gray-500">Set up your MBA profile — takes 2 minutes</p>
        </div>

        {/* ── Step indicator — shows which step is active/done/upcoming ── */}
        <div className="flex items-start justify-center mb-8">
          {STEP_LABELS.map((label, i) => {
            const s      = i + 1
            const done   = step > s    // step is in the past — show a checkmark
            const active = step === s  // step is current — highlighted in indigo
            return (
              <Fragment key={s}>
                <div className="flex flex-col items-center gap-1.5 w-24">
                  {/* Circle: checkmark if done, number if upcoming/active */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                    ${done ? 'bg-indigo-600 text-white' : active ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-gray-200 text-gray-500'}`}>
                    {done ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : s}
                  </div>
                  {/* Step label below the circle */}
                  <span className={`text-xs text-center leading-tight ${active ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </div>
                {/* Connecting line between steps — turns indigo when that step is done */}
                {s < 3 && (
                  <div className={`h-0.5 w-12 mt-4 transition-colors ${done ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                )}
              </Fragment>
            )
          })}
        </div>

        {/* ── White card containing the current step's form ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">

          {/* ── STEP 1: Personal details ── */}
          {step === 1 && (
            <div className="space-y-4">
              <Field label="Full name *"   name="name"  value={form.name}  onChange={set} placeholder="Arjun Sharma" />
              <Field label="Email *" name="email" type="email" value={form.email} onChange={set} placeholder="arjun@example.com" required />
              <Field label="Phone"         name="phone" value={form.phone} onChange={set} placeholder="+91 98765 43210" />
              <SelectField label="Current city" name="city" value={form.city} onChange={set} options={CITIES} />
            </div>
          )}

          {/* ── STEP 2: Academic background ── */}
          {step === 2 && (
            <div className="space-y-4">
              <SelectField label="Degree" name="degree" value={form.degree} onChange={set} options={DEGREES} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Graduation year" name="grad_year" type="number" value={form.grad_year} onChange={set} placeholder="2022" min="2020" max="2030" />
                <Field label="GPA / CGPA" name="gpa" type="number" step="0.01" value={form.gpa} onChange={set} placeholder="8.4" min="0" max="10" />
              </div>

              {/* Grouped entrance exam scores */}
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Entrance exam</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="CAT percentile" name="cat_percentile" type="number" step="0.01" value={form.cat_percentile} onChange={set} placeholder="97.6" min="0" max="100" />
                  <Field label="GMAT score" name="gmat_score" type="number" value={form.gmat_score} onChange={set} placeholder="720" min="200" max="800" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Work exp (yrs)" name="work_exp_yrs" type="number" value={form.work_exp_yrs} onChange={set} placeholder="3" min="0" max="50" />
                <div className="col-span-2">
                  <Field label="Current company" name="company" value={form.company} onChange={set} placeholder="Deloitte" />
                </div>
              </div>
              <Field label="Current role" name="role" value={form.role} onChange={set} placeholder="Business Analyst" />
            </div>
          )}

          {/* ── STEP 3: Target college selection ── */}
          {step === 3 && (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Select colleges you want to track. We'll help you manage deadlines and applications.
              </p>

              {/* Filter buttons — clicking one filters the list below */}
              <div className="flex gap-2 flex-wrap mb-3">
                {TYPES.map(t => (
                  <button key={t} onClick={() => setTypeFilter(t)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
                      ${typeFilter === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Scrollable list of colleges with checkboxes */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                {visible.map(college => {
                  const checked = form.target_colleges.includes(college.name)
                  const fit     = fitLabel(catPct, college.cutoff)  // "Strong match", "Good fit", or "Reach"
                  return (
                    <label key={college.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                        ${checked ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCollege(college.name)}
                        className="w-4 h-4 rounded accent-indigo-600 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{college.name}</p>
                        <p className="text-xs text-gray-400">{college.location}</p>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        {/* College type badge (IIM, IIT, etc.) */}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TYPE_META[college.type].color}`}>
                          {college.type}
                        </span>
                        {/* Fit label — only shown if the user entered a CAT percentile */}
                        {catPct > 0 && (
                          <p className={`text-xs font-medium ${fit.color}`}>{fit.label}</p>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>

              {/* Count of selected colleges */}
              {form.target_colleges.length > 0 && (
                <p className="mt-3 text-xs text-indigo-600 font-semibold">
                  {form.target_colleges.length} college{form.target_colleges.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          {/* ── Error message ── */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* ── Navigation buttons (Back / Continue / Start Tracking) ── */}
          <div className="flex justify-between items-center mt-8">
            {/* Show "Back" on steps 2 and 3; empty div on step 1 to keep layout aligned */}
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">
                ← Back
              </button>
            ) : <div />}

            {/* "Continue" on steps 1–2; "Start Tracking" on the final step */}
            {step < 3 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={step === 1 && !step1Valid}  // Disabled until name + email filled
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Continue →
              </button>
            ) : (
              <button
                onClick={handleStartTracking}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {saving ? 'Saving…' : 'Start Tracking →'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Already have an account?{' '}
          <button onClick={() => navigate('/profile')} className="text-indigo-600 hover:underline">Log in</button>
        </p>
      </div>
    </div>
  )
}

// ─── Reusable sub-components (local to this file) ────────────────────────────

// Field — a labelled text/number input. Used everywhere in the form.
function Field({ label, name, type = 'text', step, value, onChange, placeholder, min, max, required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    </div>
  )
}

// SelectField — a labelled dropdown. Renders an <option> for each item in `options`.
function SelectField({ label, name, value, onChange, options }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select name={name} value={value} onChange={onChange}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white appearance-none">
        <option value="">Select…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
