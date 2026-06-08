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

        {/* Applications list */}
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
          <div className="space-y-3">
            {applications.map(app => (
              <div
                key={app.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {app.colleges?.name || 'Unknown College'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {app.colleges?.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_META[app.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                      {app.status}
                    </span>
                    {app.notes && (
                      <p className="text-xs text-gray-500 max-w-xs truncate">{app.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
