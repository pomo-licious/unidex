import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { STATUS_META, STATUSES } from '../lib/mockData'

export default function Applications() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [student, setStudent] = useState(null)
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Get current user
  useEffect(() => {
    try {
      supabase.auth.getUser().then(({ data: { user: authUser } }) => {
        setUser(authUser || null)
      })
    } catch (err) {
      console.error('Auth error:', err)
      setError('Authentication failed')
      setLoading(false)
    }
  }, [])

  // Load student and applications
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

        // Get applications
        const { data: appData, error: appErr } = await supabase
          .from('applications')
          .select('*, colleges(id, name, location, type)')
          .eq('student_id', studentData.id)

        if (appErr) throw appErr
        setApplications(appData || [])
        setError(null)
      } catch (err) {
        console.error('Error loading applications:', err)
        setError(err.message || 'Failed to load applications')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user?.id])

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin mx-auto" />
            <p className="text-sm text-gray-400 mt-3">Loading applications…</p>
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

  const statusCounts = {
    'Researching': applications.filter(a => a.status === 'Researching').length,
    'Applied': applications.filter(a => a.status === 'Applied').length,
    'Interview': applications.filter(a => a.status === 'Interview').length,
    'Offer': applications.filter(a => a.status === 'Offer').length,
    'Rejected': applications.filter(a => a.status === 'Rejected').length,
  }

  const nextActions = {
    'Researching': 'Add deadline',
    'Applied': 'Prepare for interview',
    'Interview': 'Await result',
    'Offer': '🎉 Congratulations',
    'Rejected': null
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
            <p className="text-sm text-gray-500 mt-1">{applications.length} application{applications.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => navigate('/tracker')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
          >
            + Add application
          </button>
        </div>

        {/* Progress Summary */}
        {applications.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Applied', count: statusCounts['Applied'], color: 'bg-blue-100 text-blue-700' },
              { label: 'Target', count: applications.length, color: 'bg-indigo-100 text-indigo-700' },
              { label: 'In Progress', count: statusCounts['Interview'], color: 'bg-amber-100 text-amber-700' },
              { label: 'Offers', count: statusCounts['Offer'], color: 'bg-green-100 text-green-700' },
            ].map((stat, idx) => (
              <div key={idx} className={`${stat.color} rounded-lg p-3 text-center border border-current/20`}>
                <p className="text-2xl font-bold">{stat.count}</p>
                <p className="text-xs font-medium mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Applications by Status */}
        {applications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No applications yet</p>
            <button
              onClick={() => navigate('/tracker')}
              className="mt-4 text-sm text-indigo-600 hover:underline font-medium"
            >
              Start tracking applications →
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {['Researching', 'Applied', 'Interview', 'Offer', 'Rejected'].map(status => {
              const statusApps = applications.filter(a => a.status === status)
              if (statusApps.length === 0) return null

              return (
                <div key={status}>
                  <h2 className={`text-sm font-bold mb-3 flex items-center gap-2 ${STATUS_META[status]?.color.split(' ')[0]}`}>
                    <span className={`px-2 py-1 rounded text-white text-xs font-bold ${STATUS_META[status]?.color}`}>
                      {statusCounts[status]}
                    </span>
                    {status}
                  </h2>
                  <div className="space-y-3">
                    {statusApps.map(app => (
                      <div
                        key={app.id}
                        className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition ${status === 'Rejected' ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {app.colleges?.name || 'Unknown College'}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              {app.colleges?.location}
                            </p>
                          </div>
                          <span className={`text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap ${STATUS_META[app.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                            {app.status}
                          </span>
                        </div>
                        {nextActions[status] && (
                          <p className="text-xs text-gray-600 mt-2 italic">💡 {nextActions[status]}</p>
                        )}
                        {app.notes && (
                          <p className="text-xs text-gray-500 mt-2 truncate">{app.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
