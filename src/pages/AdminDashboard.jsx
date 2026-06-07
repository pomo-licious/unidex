import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [filterType, setFilterType] = useState('all')
  const [filterSeverity, setFilterSeverity] = useState('all')

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        navigate('/login', { replace: true })
        return
      }

      const isAdmin = user?.app_metadata?.role === 'admin'
      if (!isAdmin) {
        navigate('/profile', { replace: true })
        return
      }

      setUser(user)
      loadFeedback()
    }

    checkAuth()
  }, [navigate])

  const loadFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('uat_feedback')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setFeedback(data || [])
      calculateMetrics(data || [])
    } catch (err) {
      console.error('Error loading feedback:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateMetrics = (data) => {
    if (data.length === 0) {
      setMetrics({
        totalResponses: 0,
        avgNPS: 0,
        avgRating: 0,
        taskCompletionRate: 0,
      })
      return
    }

    const avgNPS = data.reduce((sum, f) => sum + (f.nps_score || 0), 0) / data.length
    const avgRating = data.reduce((sum, f) => sum + (f.rating_overall || 0), 0) / data.length
    const avgTasks = data.reduce((sum, f) => sum + (f.tasks_completed?.length || 0), 0) / data.length
    const taskCompletionRate = (avgTasks / 8) * 100

    setMetrics({
      totalResponses: data.length,
      avgNPS: avgNPS.toFixed(1),
      avgRating: avgRating.toFixed(1),
      taskCompletionRate: taskCompletionRate.toFixed(0),
    })
  }

  const getFilteredFeedback = () => {
    let filtered = feedback

    if (filterType !== 'all') {
      filtered = filtered.filter(f => f.user_type === filterType)
    }

    if (filterSeverity !== 'all') {
      filtered = filtered.filter(f => f.bug_severity === filterSeverity)
    }

    return filtered
  }

  const getBugsOnly = () => {
    return feedback
      .filter(f => f.bugs_found && f.bugs_found.trim())
      .sort((a, b) => {
        const severityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3, 'None': 4 }
        return (severityOrder[a.bug_severity] || 4) - (severityOrder[b.bug_severity] || 4)
      })
  }

  const toggleResolved = async (id, resolved) => {
    try {
      const { error } = await supabase
        .from('uat_feedback')
        .update({ bug_resolved: !resolved })
        .eq('id', id)

      if (error) throw error
      loadFeedback()
    } catch (err) {
      console.error('Error updating bug status:', err)
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

  const filteredFeedback = getFilteredFeedback()

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-8 py-6">
          <h1 className="text-3xl font-bold text-slate-900">UAT Dashboard</h1>
          <p className="text-slate-600 mt-1">Feedback responses and metrics</p>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-slate-200">
          <div className="px-8 flex gap-8">
            {['overview', 'responses', 'bugs'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-indigo-600 border-indigo-600'
                    : 'text-slate-600 border-transparent hover:text-slate-900'
                }`}>
                {tab === 'overview' && 'Overview'}
                {tab === 'responses' && 'Responses'}
                {tab === 'bugs' && 'Bugs'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && metrics && (
            <div className="space-y-8">
              {/* Key metrics */}
              <div className="grid md:grid-cols-4 gap-6">
                {[
                  { label: 'Total responses', value: metrics.totalResponses, unit: '' },
                  { label: 'Average NPS', value: metrics.avgNPS, unit: '/10' },
                  { label: 'Average rating', value: metrics.avgRating, unit: '/5' },
                  { label: 'Task completion', value: metrics.taskCompletionRate, unit: '%' },
                ].map(metric => (
                  <div key={metric.label} className="bg-white rounded-xl border border-slate-200 p-6">
                    <p className="text-sm text-slate-600 mb-2">{metric.label}</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {metric.value}{metric.unit}
                    </p>
                  </div>
                ))}
              </div>

              {/* Charts placeholder */}
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { title: 'Average Rating by Category', desc: 'Overall, Ease, Design, etc.' },
                  { title: 'Tester Type Distribution', desc: 'CAT, MBA, Professional, Other' },
                  { title: 'NPS Distribution', desc: 'Promoters, Passives, Detractors' },
                ].map(chart => (
                  <div key={chart.title} className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="font-semibold text-slate-900 mb-2">{chart.title}</h3>
                    <div className="h-40 bg-slate-50 rounded-lg flex items-center justify-center text-slate-500 text-sm">
                      {chart.desc}
                    </div>
                  </div>
                ))}
              </div>

              {/* Top insights */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-6">Top Insights</h3>
                <div className="space-y-4">
                  <p className="text-slate-700"><strong>Total bugs reported:</strong> {getBugsOnly().length}</p>
                  <p className="text-slate-700"><strong>Critical bugs:</strong> {getBugsOnly().filter(b => b.bug_severity === 'Critical').length}</p>
                  <p className="text-slate-700"><strong>Resolved bugs:</strong> {getBugsOnly().filter(b => b.bug_resolved).length}</p>
                </div>
              </div>
            </div>
          )}

          {/* RESPONSES TAB */}
          {activeTab === 'responses' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex gap-4 bg-white p-4 rounded-lg border border-slate-200">
                <div>
                  <label className="text-sm text-slate-600 block mb-2">Tester type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="all">All types</option>
                    <option value="CAT aspirant">CAT aspirant</option>
                    <option value="MBA student">MBA student</option>
                    <option value="Working professional">Working professional</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Device</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">NPS</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Rating</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Tasks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFeedback.map(response => (
                      <tr
                        key={response.id}
                        onClick={() => setExpandedId(expandedId === response.id ? null : response.id)}
                        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer">
                        <td className="py-3 px-4 text-slate-900 font-medium">{response.full_name}</td>
                        <td className="py-3 px-4 text-slate-600">{new Date(response.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-slate-600">{response.device}</td>
                        <td className="py-3 px-4 text-slate-600 text-xs">{response.user_type}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{response.nps_score}/10</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{response.rating_overall}/5</td>
                        <td className="py-3 px-4 text-slate-600">{response.tasks_completed?.length || 0}/8</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredFeedback.length === 0 && (
                  <div className="text-center py-12 text-slate-500">No responses found</div>
                )}
              </div>

              {/* Expanded details */}
              {expandedId && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  {(() => {
                    const resp = filteredFeedback.find(f => f.id === expandedId)
                    if (!resp) return null
                    return (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-slate-900">{resp.full_name}'s feedback</h3>
                        {resp.best_feature && <p><strong>Liked most:</strong> {resp.best_feature}</p>}
                        {resp.biggest_problem && <p><strong>Most frustrating:</strong> {resp.biggest_problem}</p>}
                        {resp.missing_feature && <p><strong>Missing feature:</strong> {resp.missing_feature}</p>}
                        {resp.bugs_found && <p><strong>Bugs:</strong> {resp.bugs_found}</p>}
                        {resp.comments && <p><strong>Comments:</strong> {resp.comments}</p>}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )}

          {/* BUGS TAB */}
          {activeTab === 'bugs' && (
            <div className="space-y-4">
              {getBugsOnly().length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
                  No bugs reported
                </div>
              ) : (
                getBugsOnly().map(bug => (
                  <div key={bug.id} className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-slate-900">{bug.full_name}</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(bug.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-3 items-center">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                          bug.bug_severity === 'Critical' ? 'bg-red-100 text-red-700' :
                          bug.bug_severity === 'High' ? 'bg-orange-100 text-orange-700' :
                          bug.bug_severity === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {bug.bug_severity}
                        </span>
                        <button
                          onClick={() => toggleResolved(bug.id, bug.bug_resolved)}
                          className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
                            bug.bug_resolved
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}>
                          {bug.bug_resolved ? '✓ Resolved' : 'Mark resolved'}
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-700">{bug.bugs_found}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
