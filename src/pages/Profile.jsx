import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, Calendar, FileText, ChevronDown, Pencil, Trash2, BarChart3, Briefcase, GraduationCap, Building2, Clock, File } from 'lucide-react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { COLLEGES, fitLabel } from '../lib/mockData'

export default function Profile() {
  useEffect(() => {
    document.title = 'Profile · Unidex'
  }, [])

  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [student, setStudent] = useState(null)
  const [applications, setApplications] = useState([])
  const [collegeDeadlines, setCollegeDeadlines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Listen to auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => setUser(session?.user ?? null)
    )
    return () => subscription.unsubscribe()
  }, [])

  // Fetch student data
  useEffect(() => {
    if (!user) {
      setStudent(null)
      setLoading(false)
      return
    }

    async function loadStudent() {
      try {
        const { data, error: fetchErr } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (fetchErr || !data) {
          setError(fetchErr?.message || 'Student profile not found')
          setLoading(false)
          return
        }

        setStudent(data)
        setError(null)
        setLoading(false)
      } catch (err) {
        setError(err.message)
        setLoading(false)
      }
    }

    loadStudent()
  }, [user?.id])

  // Fetch applications
  useEffect(() => {
    if (!student?.id) return

    async function loadApplications() {
      try {
        const { data, error: fetchErr } = await supabase
          .from('applications')
          .select('status, college_id')
          .eq('student_id', student.id)

        if (fetchErr) throw fetchErr
        setApplications(data || [])
      } catch (err) {
        console.error('Error fetching applications:', err)
        setApplications([])
      }
    }

    loadApplications()
  }, [student?.id])

  // Fetch upcoming deadlines for target colleges
  useEffect(() => {
    if (!student?.target_colleges?.length) {
      setCollegeDeadlines([])
      return
    }

    async function loadDeadlines() {
      try {
        const { data, error: fetchErr } = await supabase
          .from('colleges')
          .select('name, deadlines')
          .in('name', student.target_colleges)

        if (fetchErr) throw fetchErr

        const upcoming = []
        (data || []).forEach(college => {
          const deadlineArray = college.deadlines || []
          if (Array.isArray(deadlineArray)) {
            deadlineArray.forEach(deadline => {
              const dueDate = new Date(deadline)
              if (dueDate > new Date()) {
                upcoming.push({
                  college: college.name,
                  date: deadline,
                  daysLeft: Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24))
                })
              }
            })
          }
        })

        upcoming.sort((a, b) => new Date(a.date) - new Date(b.date))
        setCollegeDeadlines(upcoming.slice(0, 2))
      } catch (err) {
        console.error('Error fetching deadlines:', err)
      }
    }

    loadDeadlines()
  }, [student?.target_colleges])

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return
    setDeleteLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No active session')

      const response = await fetch('https://siheziegpnrfjgzubjrk.supabase.co/functions/v1/delete-account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Deletion failed')
      }

      await supabase.auth.signOut()
      navigate('/')
    } catch (err) {
      console.error('Error deleting account:', err)
      setToast({ type: 'error', message: 'Deletion failed. Please contact privacy@unidex.co.in' })
      setTimeout(() => setToast(null), 3000)
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin mx-auto" />
            <p className="text-sm text-gray-400 mt-3">Loading dashboard…</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error || !student) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-red-600 font-medium">{error || 'Profile not found'}</p>
          </div>
        </div>
      </Layout>
    )
  }

  const s = student
  const ab = s.academic_background || {}
  const initials = s.name?.split(' ').map(n => n[0]).join('') || 'U'

  // Compute status counts
  const statusCounts = {
    'Applied': applications.filter(a => a.status === 'Applied').length,
    'Target': (s.target_colleges || []).length,
    'In Progress': applications.filter(a => a.status === 'Interview').length,
    'Offers': applications.filter(a => a.status === 'Offer').length,
  }

  // Calculate overall progress
  const overallProgress = statusCounts.Target > 0
    ? Math.round((statusCounts.Applied / statusCounts.Target) * 100)
    : 0

  // Get target colleges with fit
  const targetColleges = COLLEGES.filter(c => s.target_colleges?.includes(c.name))
    .slice(0, 4)
    .map(c => {
      const catPct = parseFloat(ab.cat_percentile) || 0
      const fit = fitLabel(catPct, c.cutoff)
      return { ...c, fit }
    })

  // Get documents info
  const documentsUploaded = s.documents_uploaded || []
  const docStats = [
    { name: '10th Marksheet', status: documentsUploaded.includes('10th') ? 'Verified ✓' : 'Pending ⏳' },
    { name: '12th Marksheet', status: documentsUploaded.includes('12th') ? 'Verified ✓' : 'Pending ⏳' },
    { name: 'Graduation Certificate', status: documentsUploaded.includes('graduation') ? 'Verified ✓' : 'Pending ⏳' },
  ]

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>

        {/* ROW 1: HERO BANNER */}
        <div className="bg-gradient-to-r from-[#1a2744] to-[#2a3f66] rounded-2xl p-4 flex items-center justify-between border border-[#3a5080]">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#c9a84c] to-[#d4b563] flex items-center justify-center text-white text-xl font-bold ring-4 ring-[#c9a84c]/20 shrink-0">
              {initials}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white mb-0.5">{s.name}</h1>
              <div className="flex items-center gap-2 mb-2">
                {ab.grad_year && (
                  <span className="inline-block px-3 py-1 bg-[#c9a84c] text-[#1a2744] text-sm font-semibold rounded-full">
                    Batch {ab.grad_year}
                  </span>
                )}
              </div>
              <p className="text-slate-300 text-sm">
                {ab.role || 'Professional'} · {ab.company || 'Organization'}
              </p>
              <p className="text-slate-400 text-xs mt-2 italic">
                Stay organized. Meet deadlines. Build your future.
              </p>
            </div>
          </div>

          {/* Edit Profile Button */}
          <button
            onClick={() => navigate('/onboarding')}
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-white/10 border border-[#c9a84c] text-[#c9a84c] rounded-xl hover:bg-white/20 transition-colors font-medium text-sm"
          >
            <Pencil className="w-4 h-4" />
            Edit Profile
          </button>
        </div>

        {/* ROW 2: 4 STAT CARDS */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { Icon: BarChart3, label: 'CAT Percentile', value: ab.cat_percentile || '-', unit: '%ile' },
            { Icon: BookOpen, label: 'CGPA', value: ab.cgpa || '-', unit: '/10' },
            { Icon: Briefcase, label: 'Work Experience', value: ab.work_exp_yrs || '-', unit: 'yrs' },
            { Icon: GraduationCap, label: 'Batch', value: ab.grad_year || '-', unit: '' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-lg hover:scale-102 motion-safe:transition-all motion-safe:duration-200">
              <div className="w-12 h-12 rounded-full bg-[#1a2744]/10 flex items-center justify-center mb-3">
                <stat.Icon className="w-6 h-6 text-[#c9a84c]" />
              </div>
              <p className="text-3xl font-bold text-gray-900 leading-tight">
                {stat.value}
                <span className="text-sm font-normal text-gray-500 ml-1">{stat.unit}</span>
              </p>
              <p className="text-xs font-medium text-gray-600 mt-2 uppercase tracking-wide">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ROW 3: TWO-COLUMN GRID */}
        <div className="grid grid-cols-[1.4fr_1fr] gap-4">

          {/* LEFT COLUMN */}
          <div className="space-y-4">

            {/* TARGET COLLEGES CARD */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-lg motion-safe:transition-shadow motion-safe:duration-200">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#c9a84c]" />
                  Target Colleges
                </h2>
                <button
                  onClick={() => navigate('/colleges')}
                  className="flex items-center gap-1 text-xs text-[#c9a84c] font-semibold hover:underline"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>

              {targetColleges.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500 mb-3">No target colleges yet</p>
                  <button
                    onClick={() => navigate('/colleges')}
                    className="px-4 py-2 bg-[#c9a84c]/10 text-[#c9a84c] rounded-lg text-sm font-medium hover:bg-[#c9a84c]/20 transition-colors"
                  >
                    Browse Colleges
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {targetColleges.map(college => {
                      const fitColor = college.fit.label === 'Strong match' ? 'bg-green-100 text-green-700' :
                        college.fit.label === 'Good fit' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'

                      return (
                        <div key={college.id} className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#c9a84c]/50 hover:scale-102 motion-safe:transition-all motion-safe:duration-200">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#c9a84c] to-[#b8942d] rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {college.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{college.name}</p>
                            <p className="text-xs text-gray-500">{college.location}</p>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-lg whitespace-nowrap ${fitColor}`}>
                            {college.fit.label === 'Strong match' ? 'Safe' :
                              college.fit.label === 'Good fit' ? 'Reach' : 'Dream'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  {(s.target_colleges?.length || 0) > 5 && (
                    <button
                      onClick={() => navigate('/colleges')}
                      className="text-xs text-[#c9a84c] font-semibold hover:underline"
                    >
                      View all {s.target_colleges.length} colleges →
                    </button>
                  )}
                </>
              )}
            </div>

            {/* APPLICATION OVERVIEW CARD */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-lg motion-safe:transition-shadow motion-safe:duration-200">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1">
                  <span className="text-lg">📋</span> Application Overview
                </h2>
                <button onClick={() => navigate('/tracker')} className="text-xs text-[#c9a84c] font-semibold hover:underline">
                  View →
                </button>
              </div>

              {/* 4 inline stats */}
              <div className="grid grid-cols-4 gap-1 mb-2">
                {[
                  { label: 'Applied', value: statusCounts.Applied, color: 'text-blue-600' },
                  { label: 'Target', value: statusCounts.Target, color: 'text-indigo-600' },
                  { label: 'In Progress', value: statusCounts['In Progress'], color: 'text-amber-600' },
                  { label: 'Offers', value: statusCounts.Offers, color: 'text-green-600' },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-gray-50 rounded p-1.5 text-center border border-gray-200">
                    <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-xs font-semibold text-gray-600">Progress</p>
                  <p className="text-xs font-bold text-gray-900">{overallProgress}%</p>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#1a2744] to-green-500 transition-all"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">

            {/* UPCOMING DEADLINES CARD */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-lg motion-safe:transition-shadow motion-safe:duration-200">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#c9a84c]" />
                  Upcoming Deadlines
                </h2>
                <button onClick={() => navigate('/reminders')} className="text-xs text-[#c9a84c] font-semibold hover:underline">
                  View all →
                </button>
              </div>

              {collegeDeadlines.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No upcoming deadlines</p>
              ) : (
                <div className="space-y-2">
                  {collegeDeadlines.map((deadline, idx) => {
                    const urgencyColor = deadline.daysLeft <= 14 ? 'text-red-600' : deadline.daysLeft <= 30 ? 'text-amber-600' : 'text-gray-600'
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{deadline.college}</p>
                        </div>
                        <div className={`text-right text-xs font-semibold ${urgencyColor}`}>
                          In {deadline.daysLeft} days
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* DOCUMENTS CARD */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-lg motion-safe:transition-shadow motion-safe:duration-200">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <File className="w-4 h-4 text-[#c9a84c]" />
                  Documents
                </h2>
                <button onClick={() => navigate('/documents')} className="text-xs text-[#c9a84c] font-semibold hover:underline">
                  View all →
                </button>
              </div>

              <div className="space-y-2">
                {docStats.map((doc, idx) => {
                  const isVerified = doc.status.includes('✓')
                  const statusColor = isVerified ? 'text-green-600' : 'text-amber-600'
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm font-semibold text-gray-900">{doc.name}</p>
                      <span className={`text-xs font-semibold ${statusColor}`}>{doc.status}</span>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

        </div>

        {/* ACCOUNT SETTINGS ACCORDION (DANGER ZONE) */}
        <div className="border-t border-gray-200 pt-3">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium text-sm"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
            Account Settings
          </button>

          {settingsOpen && (
            <div className="mt-4 border-2 border-red-200 rounded-2xl p-6 bg-red-50">
              <h3 className="text-sm font-bold text-red-900 mb-2">Danger Zone</h3>
              <p className="text-sm text-red-800 mb-4">Permanently delete your account and all data</p>
              <button
                onClick={() => { setDeleteModalOpen(true); setDeleteInput('') }}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-semibold border-2 border-red-600 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Delete my account
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Are you sure?</h2>
            <p className="text-sm text-gray-600 mb-6">
              Permanently delete profile, applications, documents, all data. Cannot be undone.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type DELETE to confirm
              </label>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                disabled={deleteLoading}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput !== 'DELETE' || deleteLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteLoading ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  )
}
