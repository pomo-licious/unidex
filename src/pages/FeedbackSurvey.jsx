import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function FeedbackSurvey() {
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    user_type: '',
    cat_percentile: '',
    device: '',
    tasks_completed: [],
    rating_overall: 0,
    rating_ease: 0,
    rating_design: 0,
    rating_usefulness: 0,
    rating_data_quality: 0,
    nps_score: 5,
    best_feature: '',
    biggest_problem: '',
    missing_feature: '',
    would_pay: '',
    bugs_found: '',
    bug_severity: 'None',
    comments: '',
  })

  const tasks = [
    'Signed up / created account',
    'Browsed the college directory',
    'Added a college to my tracker',
    'Viewed a college profile page',
    'Moved a college to a different status',
    'Tried the Apply Now flow',
    'Checked the deadline calendar',
    'Uploaded a document',
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleTaskToggle = (task) => {
    setFormData(prev => ({
      ...prev,
      tasks_completed: prev.tasks_completed.includes(task)
        ? prev.tasks_completed.filter(t => t !== task)
        : [...prev.tasks_completed, task]
    }))
  }

  const handleRatingChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleNPSChange = (value) => {
    setFormData(prev => ({ ...prev, nps_score: value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('uat_feedback')
        .insert([formData])

      if (error) throw error
      setSubmitted(true)
    } catch (err) {
      console.error('Error submitting feedback:', err)
      alert('Error submitting feedback. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-6">✓</div>
          <h1 className="text-4xl font-bold text-white mb-4">Thank you!</h1>
          <p className="text-xl text-slate-400 mb-8">Your feedback helps us build a better product.</p>
          <a
            href="/"
            className="inline-block px-8 py-3 bg-[#C9A84C] text-[#0A1628] rounded-full font-semibold hover:bg-amber-300 transition">
            Back to Unidex
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A1628] py-12">
      <div className="max-w-2xl mx-auto px-6">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">We'd love your feedback</h1>
          <p className="text-slate-400">Help us improve Unidex. Takes ~5 minutes.</p>
        </div>

        {/* Progress bar */}
        <div className="mb-12 flex gap-2">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full transition-colors ${
                s <= step ? 'bg-[#C9A84C]' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Step counter */}
        <div className="text-sm text-slate-400 mb-8">
          STEP {step} OF 4
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-6 bg-[#0F2040] p-8 rounded-2xl border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-8">About you</h2>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full name *</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-[#0A1628] border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-[#0A1628] border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">I am a *</label>
              <div className="space-y-2">
                {['CAT aspirant', 'MBA student', 'Working professional', 'Other'].map(type => (
                  <label key={type} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="user_type"
                      value={type}
                      checked={formData.user_type === type}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <span className="text-slate-300">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">CAT percentile (optional)</label>
              <input
                type="number"
                name="cat_percentile"
                value={formData.cat_percentile}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-[#0A1628] border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                placeholder="e.g., 95"
                min="0"
                max="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Device used *</label>
              <div className="space-y-2">
                {['Desktop', 'Mobile', 'Tablet'].map(device => (
                  <label key={device} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="device"
                      value={device}
                      checked={formData.device === device}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <span className="text-slate-300">{device}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-6 bg-[#0F2040] p-8 rounded-2xl border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-2">Task completion</h2>
            <p className="text-slate-400 mb-6">Tick each task you were able to complete</p>

            <div className="space-y-3">
              {tasks.map(task => (
                <label key={task} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-[#0A1628] transition">
                  <input
                    type="checkbox"
                    checked={formData.tasks_completed.includes(task)}
                    onChange={() => handleTaskToggle(task)}
                    className="w-5 h-5"
                  />
                  <span className="text-slate-300">{task}</span>
                </label>
              ))}
            </div>

            <div className="text-sm text-slate-400 mt-8 pt-6 border-t border-slate-600">
              {formData.tasks_completed.length} of {tasks.length} tasks completed
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-8 bg-[#0F2040] p-8 rounded-2xl border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-8">Ratings</h2>

            {[
              { field: 'rating_overall', label: 'Overall experience' },
              { field: 'rating_ease', label: 'Ease of use' },
              { field: 'rating_design', label: 'Visual design' },
              { field: 'rating_usefulness', label: 'Usefulness for MBA applications' },
              { field: 'rating_data_quality', label: 'Quality of college data' },
            ].map(({ field, label }) => (
              <div key={field}>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-slate-300">{label}</label>
                  <span className="text-[#C9A84C] font-semibold">{formData[field]}/5</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => handleRatingChange(field, rating)}
                      className={`flex-1 py-2 rounded-lg transition ${
                        formData[field] === rating
                          ? 'bg-[#C9A84C] text-[#0A1628]'
                          : 'bg-[#0A1628] text-slate-400 hover:text-white'
                      }`}>
                      ⭐
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="pt-6 border-t border-slate-600">
              <label className="block text-slate-300 mb-4">
                How likely are you to recommend Unidex to a fellow CAT aspirant?
              </label>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500">Not at all</span>
                <span className="text-[#C9A84C] font-semibold">{formData.nps_score}/10</span>
                <span className="text-xs text-slate-500">Definitely</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={formData.nps_score}
                onChange={(e) => handleNPSChange(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#C9A84C]"
              />
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div className="space-y-6 bg-[#0F2040] p-8 rounded-2xl border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-8">Open feedback</h2>

            {[
              { field: 'best_feature', label: 'What did you like most?' },
              { field: 'biggest_problem', label: 'What was most frustrating or broken?' },
              { field: 'missing_feature', label: "What feature is missing that you'd want?" },
              { field: 'would_pay', label: 'Would you pay for this? If yes, how much?' },
              { field: 'bugs_found', label: 'Any bugs you noticed?' },
              { field: 'comments', label: 'General comments (optional)' },
            ].map(({ field, label }) => (
              <div key={field}>
                <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
                <textarea
                  name={field}
                  value={formData[field]}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#0A1628] border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A84C] resize-none"
                  rows="3"
                  placeholder="Your answer..."
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Bug severity</label>
              <div className="space-y-2">
                {['Critical', 'High', 'Medium', 'Low', 'None'].map(severity => (
                  <label key={severity} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="bug_severity"
                      value={severity}
                      checked={formData.bug_severity === severity}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <span className="text-slate-300">{severity}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-12">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="px-6 py-2 border border-slate-600 text-slate-300 rounded-lg hover:border-white hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed">
            ← Back
          </button>

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-6 py-2 bg-[#C9A84C] text-[#0A1628] rounded-lg font-semibold hover:bg-amber-300 transition">
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-[#C9A84C] text-[#0A1628] rounded-lg font-semibold hover:bg-amber-300 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Submitting...' : 'Submit feedback'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
