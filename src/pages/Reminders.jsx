import { useState, useEffect } from 'react'
import { Bell, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

function DeadlineCard({ deadline }) {
  const isUrgent = deadline.daysRemaining <= 7
  const isVeryUrgent = deadline.daysRemaining <= 2

  return (
    <div
      className={`rounded-lg border p-4 ${
        isVeryUrgent
          ? 'bg-red-50 border-red-200'
          : isUrgent
          ? 'bg-amber-50 border-amber-200'
          : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isVeryUrgent ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : isUrgent ? (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : null}
            <h3 className={`font-semibold text-sm ${
              isVeryUrgent ? 'text-red-900' : isUrgent ? 'text-amber-900' : 'text-gray-900'
            }`}>
              {deadline.collegeName}
            </h3>
          </div>
          <p className={`text-xs ${
            isVeryUrgent ? 'text-red-700' : isUrgent ? 'text-amber-700' : 'text-gray-600'
          }`}>
            {deadline.type} deadline
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className={`font-bold text-sm ${
            isVeryUrgent ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-gray-900'
          }`}>
            {deadline.daysRemaining} day{deadline.daysRemaining !== 1 ? 's' : ''}
          </p>
          <p className={`text-xs ${
            isVeryUrgent ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-gray-500'
          }`}>
            {new Date(deadline.date).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Reminders() {
  const [user, setUser] = useState(null)
  const [student, setStudent] = useState(null)
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showLater, setShowLater] = useState(false)

  // Get current user via auth listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null)
    })
    return () => subscription?.unsubscribe()
  }, [])

  // Load student and applications with deadlines
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    async function loadData() {
      try {
        // Get student record
        const { data: studentData, error: studentErr } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (studentErr) throw studentErr
        if (!studentData) {
          setError('Student profile not found')
          setLoading(false)
          return
        }

        setStudent(studentData)

        // Get applications with college deadlines
        const { data: appData, error: appErr } = await supabase
          .from('applications')
          .select('*, colleges(id, name, deadlines)')
          .eq('student_id', studentData.id)

        if (appErr) throw appErr
        setApplications(appData || [])
        setError(null)
      } catch (err) {
        console.error('Error loading reminders:', err)
        setError(err.message || 'Failed to load reminders')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user?.id])

  // Extract upcoming deadlines from applications
  const getUpcomingDeadlines = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadlines = []

    applications.forEach(app => {
      if (!app.colleges?.deadlines || !Array.isArray(app.colleges.deadlines)) return

      app.colleges.deadlines.forEach(deadline => {
        const deadlineDate = new Date(deadline.date)
        if (deadlineDate >= today) {
          deadlines.push({
            id: `${app.id}-${deadline.date}`,
            collegeName: app.colleges.name,
            applicationId: app.id,
            date: deadline.date,
            type: deadline.type || 'Regular',
            daysRemaining: Math.floor((deadlineDate - today) / (1000 * 60 * 60 * 24))
          })
        }
      })
    })

    // Sort by days remaining (closest first)
    return deadlines.sort((a, b) => a.daysRemaining - b.daysRemaining)
  }

  const upcomingDeadlines = getUpcomingDeadlines()

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin mx-auto" />
            <p className="text-sm text-gray-400 mt-3">Loading reminders…</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-sm text-red-600 hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reminders</h1>
            <p className="text-sm text-gray-500 mt-1">{upcomingDeadlines.length} upcoming deadline{upcomingDeadlines.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Deadlines grouped by urgency */}
        {upcomingDeadlines.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4 opacity-50" />
            <p className="text-gray-500 text-lg">No upcoming deadlines</p>
            <p className="text-sm text-gray-400 mt-2">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* This Week */}
            {upcomingDeadlines.filter(d => d.daysRemaining <= 7).length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-red-600 mb-3 flex items-center gap-2">
                  <span className="text-lg">🔴</span> This week
                </h2>
                <div className="space-y-3">
                  {upcomingDeadlines.filter(d => d.daysRemaining <= 7).map(deadline => (
                    <DeadlineCard key={deadline.id} deadline={deadline} />
                  ))}
                </div>
              </div>
            )}

            {/* This Month */}
            {upcomingDeadlines.filter(d => d.daysRemaining > 7 && d.daysRemaining <= 30).length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-amber-600 mb-3 flex items-center gap-2">
                  <span className="text-lg">🟡</span> This month
                </h2>
                <div className="space-y-3">
                  {upcomingDeadlines.filter(d => d.daysRemaining > 7 && d.daysRemaining <= 30).map(deadline => (
                    <DeadlineCard key={deadline.id} deadline={deadline} />
                  ))}
                </div>
              </div>
            )}

            {/* Later */}
            {upcomingDeadlines.filter(d => d.daysRemaining > 30).length > 0 && (
              <div>
                <button
                  onClick={() => setShowLater(!showLater)}
                  className="w-full flex items-center justify-between text-sm font-bold text-gray-600 hover:text-gray-900 transition mb-3"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">⚪</span> Later ({upcomingDeadlines.filter(d => d.daysRemaining > 30).length})
                  </span>
                  <ChevronDown className={`w-4 h-4 transition ${showLater ? 'rotate-180' : ''}`} />
                </button>
                {showLater && (
                  <div className="space-y-3">
                    {upcomingDeadlines.filter(d => d.daysRemaining > 30).map(deadline => (
                      <DeadlineCard key={deadline.id} deadline={deadline} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
