import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

const TIER_STYLES = {
  1: 'bg-blue-50 text-blue-700 border border-blue-200',
  2: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  3: 'bg-slate-100 text-slate-600 border border-slate-200',
}

export default function CollegeProfile({ user: propUser, loading: propLoading }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [college, setCollege] = useState(null)
  const [cutoffs, setCutoffs] = useState([])
  const [user, setUser] = useState(propUser || null)
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isTracked, setIsTracked] = useState(false)
  const [adding, setAdding] = useState(false)
  const [showSignInModal, setShowSignInModal] = useState(false)

  // Auth listener — only use if not passed via props
  useEffect(() => {
    if (propUser !== undefined) {
      setUser(propUser)
      return
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setUser(session?.user ?? null)
    )
    return () => subscription.unsubscribe()
  }, [propUser])

  // Fetch student data and check if tracked
  useEffect(() => {
    if (!user?.id) return

    async function loadStudent() {
      try {
        const { data } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (data) {
          setStudent(data)

          // Check if college is in tracker
          const { data: app } = await supabase
            .from('applications')
            .select('id')
            .eq('student_id', data.id)
            .eq('college_id', id)
            .maybeSingle()

          setIsTracked(!!app)
        }
      } catch (err) {
        console.error('Error loading student:', err)
      }
    }

    loadStudent()
  }, [user?.id, id])

  // Fetch college and cutoff data
  useEffect(() => {
    async function loadCollege() {
      try {
        const [{ data: collegeData, error: collegeErr }, { data: cutoffData, error: cutoffErr }] = await Promise.all([
          supabase
            .from('colleges')
            .select('*')
            .eq('id', id)
            .single(),
          supabase
            .from('college_cutoffs')
            .select('*')
            .eq('college_id', id)
        ])

        if (collegeErr) throw collegeErr

        setCollege(collegeData)
        setCutoffs(cutoffData || [])
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadCollege()
  }, [id])

  const handleAddToTracker = async () => {
    if (!user) {
      setShowSignInModal(true)
      return
    }
    if (!student) {
      navigate('/login')
      return
    }

    setAdding(true)
    try {
      const { error } = await supabase
        .from('applications')
        .insert({
          student_id: student.id,
          college_id: id,
          status: 'Researching'
        })

      if (error) throw error
      setIsTracked(true)
    } catch (err) {
      console.error('Error adding to tracker:', err)
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
        </div>
      </Layout>
    )
  }

  if (error || !college) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-red-600 font-medium">{error || 'College not found'}</p>
            <button
              onClick={() => navigate('/colleges')}
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
              Back to colleges
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  const c = college

  return (
    <Layout>
      {/* Hero image banner */}
      {c.image_url && (
        <div className="relative w-full h-80 overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600">
          <img
            src={c.image_url}
            alt={c.name}
            className="w-full h-full object-cover"
            onError={e => {
              e.target.style.display = 'none'
            }}
          />
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          {/* College name overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-6 py-8">
            <h1 className="text-4xl font-bold text-white drop-shadow-lg">{c.name}</h1>
            <p className="text-white/90 text-lg mt-2">📍 {c.location}</p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* HERO SECTION */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {!c.image_url && (
                  <h1 className="text-3xl font-bold text-slate-900">{c.name}</h1>
                )}
                {c.tier && (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${TIER_STYLES[c.tier] || TIER_STYLES[3]}`}>
                    Tier {c.tier}
                  </span>
                )}
              </div>
              <p className="text-slate-600 flex items-center gap-2">
                📍 {c.location}
              </p>
            </div>
            <button
              onClick={handleAddToTracker}
              disabled={isTracked || adding}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isTracked
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}>
              {isTracked ? '✓ In Tracker' : adding ? 'Adding…' : 'Add to Tracker'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            {c.nirf_rank && (
              <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full font-medium">
                #{c.nirf_rank} NIRF
              </span>
            )}
            {c.accreditation && c.accreditation.length > 0 && c.accreditation.map(acc => (
              <span key={acc} className="text-xs bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-full font-medium">
                {acc}
              </span>
            ))}
          </div>

          {c.website_url && (
            <a
              href={c.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 text-sm text-indigo-600 hover:underline font-medium">
              Visit website →
            </a>
          )}
        </div>

        {/* QUICK STATS */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Avg LPA', value: c.placement_avg_lpa ? `₹${c.placement_avg_lpa}L` : '–' },
            { label: 'Highest LPA', value: c.placement_highest_lpa ? `₹${c.placement_highest_lpa}L` : '–' },
            { label: 'Total Fees', value: c.avg_fees ? `₹${(c.avg_fees / 100000).toFixed(0)}L` : '–' },
            { label: 'Batch Size', value: c.batch_size || '–' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-600 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Guest access banner */}
        {!user && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
            <p className="text-sm text-amber-900">
              <strong>Sign in</strong> to see full placement data, detailed cutoffs, and scholarship information.
            </p>
          </div>
        )}

        {/* PLACEMENT STATS */}
        {user && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Placement Statistics</h2>
            {c.placement_avg_lpa ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Average Package', value: `₹${c.placement_avg_lpa}L` },
                    { label: 'Median Package', value: c.placement_median_lpa ? `₹${c.placement_median_lpa}L` : 'N/A' },
                    { label: 'Highest Package', value: `₹${c.placement_highest_lpa}L` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-lg p-4">
                      <p className="text-xs text-slate-600 font-medium">{label}</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
                    </div>
                  ))}
                </div>

                {c.placement_pct && (
                  <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                    <p className="text-sm font-medium text-emerald-900">
                      Placement Rate: <span className="text-xl font-bold">{c.placement_pct}%</span>
                    </p>
                  </div>
                )}

                {c.top_recruiters && c.top_recruiters.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Top Recruiters</h3>
                    <div className="flex flex-wrap gap-2">
                      {c.top_recruiters.map(recruiter => (
                        <span key={recruiter} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-full font-medium">
                          {recruiter}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Placement data coming soon</p>
            )}
          </div>
        )}

        {/* Guest: Show top 5 recruiters only */}
        {!user && c.top_recruiters && c.top_recruiters.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Top Recruiters</h3>
            <div className="flex flex-wrap gap-2">
              {c.top_recruiters.slice(0, 5).map(recruiter => (
                <span key={recruiter} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-full font-medium">
                  {recruiter}
                </span>
              ))}
              {c.top_recruiters.length > 5 && (
                <span className="text-xs text-slate-500 px-3 py-1.5">+ {c.top_recruiters.length - 5} more</span>
              )}
            </div>
          </div>
        )}

        {/* COURSES */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Courses Offered</h2>
          {c.courses && c.courses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">Programme</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">Duration</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">Fees</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">Seats</th>
                  </tr>
                </thead>
                <tbody>
                  {c.courses.map((course, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 px-4 text-slate-900">{course.name}</td>
                      <td className="py-3 px-4 text-slate-600">{course.duration}</td>
                      <td className="py-3 px-4 text-slate-600">₹{course.fees}</td>
                      <td className="py-3 px-4 text-slate-600">{course.seats}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Course details coming soon</p>
          )}
        </div>

        {/* CAT/XAT CUTOFFS — Logged-in users only */}
        {user && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">CAT/XAT Cutoffs</h2>
            {cutoffs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Exam</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Category</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Overall</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">VARC</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">DILR</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">QA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cutoffs.map((cutoff, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        <td className="py-3 px-4 text-slate-900 font-medium">{cutoff.exam_type}</td>
                        <td className="py-3 px-4 text-slate-600">{cutoff.category || 'General'}</td>
                        <td className="py-3 px-4 text-slate-600">{cutoff.overall_percentile}%ile</td>
                        <td className="py-3 px-4 text-slate-600">{cutoff.varc_percentile}%ile</td>
                        <td className="py-3 px-4 text-slate-600">{cutoff.dilr_percentile}%ile</td>
                        <td className="py-3 px-4 text-slate-600">{cutoff.qa_percentile}%ile</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Cutoff data coming soon</p>
            )}
          </div>
        )}

        {/* SCHOLARSHIPS — Logged-in users only */}
        {user && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Scholarships</h2>
            {c.scholarships && c.scholarships.length > 0 ? (
              <div className="space-y-3">
                {c.scholarships.map((scholarship, i) => (
                  <div key={i} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <p className="font-semibold text-slate-900">{scholarship.name}</p>
                    <p className="text-sm text-slate-600 mt-1">{scholarship.criteria}</p>
                    <p className="text-sm font-semibold text-indigo-600 mt-2">₹{scholarship.amount}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Scholarship info coming soon</p>
            )}
          </div>
        )}

        {/* ABOUT + FACILITIES */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">About & Facilities</h2>
          {c.about && (
            <p className="text-slate-700 text-sm leading-relaxed mb-4">{c.about}</p>
          )}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Hostel', value: c.hostel_available ? 'Available' : 'Not available' },
              { label: 'International Exchange', value: c.international_exchange ? 'Yes' : 'No' },
              { label: 'Campus Size', value: c.campus_size ? `${c.campus_size} acres` : 'N/A' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs text-slate-600 font-medium">{label}</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{value}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Sign-in modal for guests */}
      {showSignInModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-sm w-full mx-4 space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Sign in to track this college</h2>
            <p className="text-slate-600">Create an account or sign in to start tracking your MBA applications.</p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowSignInModal(false)
                  navigate('/login')
                }}
                className="w-full px-4 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition">
                Sign in
              </button>
              <button
                onClick={() => {
                  setShowSignInModal(false)
                  navigate('/signup')
                }}
                className="w-full px-4 py-3 rounded-lg border-2 border-indigo-600 text-indigo-600 font-semibold hover:bg-indigo-50 transition">
                Sign up
              </button>
            </div>
            <button
              onClick={() => setShowSignInModal(false)}
              className="w-full text-center text-slate-500 hover:text-slate-700">
              Continue browsing
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}
