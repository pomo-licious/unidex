import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

const MATCH_SCORE_THRESHOLDS = {
  1: { strong: 98, moderate: 95 },
  2: { strong: 90, moderate: 85 },
  3: { strong: 80, moderate: 70 },
}

const GENERIC_UNIVERSITY_IMAGE = 'https://images.unsplash.com/photo-1562774053-701939374585?w=640&q=80'

export default function CollegeDirectory() {
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [student, setStudent] = useState(null)
  const [colleges, setColleges] = useState([])
  const [applicationCounts, setApplicationCounts] = useState({})
  const [trackedColleges, setTrackedColleges] = useState(new Set())
  const [adding, setAdding] = useState(new Set())

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('relevant')
  const [subFilter, setSubFilter] = useState('All')

  // Auth listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setUser(session?.user ?? null)
    )
    return () => subscription.unsubscribe()
  }, [])

  // Fetch student data
  useEffect(() => {
    if (!user?.id) return

    async function loadStudent() {
      try {
        const { data } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', user.id)
          .single()

        setStudent(data)

        // Fetch tracked colleges
        if (data?.id) {
          const { data: appData } = await supabase
            .from('applications')
            .select('college_id')
            .eq('student_id', data.id)

          if (appData) {
            setTrackedColleges(new Set(appData.map(a => a.college_id)))
          }
        }
      } catch (err) {
        console.error('Error loading student:', err)
      }
    }

    loadStudent()
  }, [user?.id])

  // Fetch colleges and application counts
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch all colleges
        const { data: collegeData } = await supabase
          .from('colleges')
          .select('*')
          .order('name', { ascending: true })

        setColleges(collegeData || [])

        // Fetch application counts
        const { data: counts } = await supabase
          .from('applications')
          .select('college_id')

        const countMap = {}
        counts?.forEach(app => {
          countMap[app.college_id] = (countMap[app.college_id] || 0) + 1
        })
        setApplicationCounts(countMap)

        setLoading(false)
      } catch (err) {
        console.error('Error loading colleges:', err)
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Filter colleges based on active tab and sub-filter
  const getFilteredColleges = () => {
    let filtered = colleges

    // Apply sub-filter for "All Colleges" tab
    if (activeTab === 'all') {
      if (subFilter === 'Private') {
        filtered = filtered.filter(c => c.type === 'Private')
      } else if (subFilter === 'Government') {
        filtered = filtered.filter(c => ['IIM', 'IIT', 'Government'].includes(c.type))
      }
    }

    // Filter by active tab
    if (activeTab === 'relevant') {
      if (!student?.academic_background?.cat_percentile) {
        return []
      }

      const cat = student.academic_background.cat_percentile
      filtered = filtered.filter(c => {
        const tier = c.tier || 3
        const thresholds = MATCH_SCORE_THRESHOLDS[tier]
        if (!thresholds) return false
        return cat >= thresholds.moderate
      })

      // Sort by match quality
      filtered.sort((a, b) => {
        const cat = student.academic_background.cat_percentile
        const tierA = a.tier || 3
        const tierB = b.tier || 3
        const threshA = MATCH_SCORE_THRESHOLDS[tierA]
        const threshB = MATCH_SCORE_THRESHOLDS[tierB]

        const scoreA = cat >= threshA.strong ? 2 : cat >= threshA.moderate ? 1 : 0
        const scoreB = cat >= threshB.strong ? 2 : cat >= threshB.moderate ? 1 : 0

        return scoreB - scoreA
      })
    } else if (activeTab === 'popular') {
      // Sort by application count (descending)
      filtered.sort((a, b) => (applicationCounts[b.id] || 0) - (applicationCounts[a.id] || 0))
      filtered = filtered.slice(0, 20)
    }

    // Apply search filter
    if (search) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.location.toLowerCase().includes(search.toLowerCase())
      )
    }

    return filtered
  }

  const filteredColleges = getFilteredColleges()

  const handleAddToTracker = async (collegeId) => {
    if (!student) {
      navigate('/login')
      return
    }
    if (trackedColleges.has(collegeId)) return

    setAdding(prev => new Set([...prev, collegeId]))

    try {
      const { error } = await supabase
        .from('applications')
        .insert({
          student_id: student.id,
          college_id: collegeId,
          status: 'Researching',
        })

      if (error) throw error
      setTrackedColleges(prev => new Set([...prev, collegeId]))
    } catch (err) {
      console.error('Error adding to tracker:', err)
    } finally {
      setAdding(prev => {
        const next = new Set(prev)
        next.delete(collegeId)
        return next
      })
    }
  }

  const showMostRelevantEmpty = activeTab === 'relevant' && !student?.academic_background?.cat_percentile

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50">
        {/* Sticky header */}
        <div className="sticky top-0 z-30 bg-white border-b border-slate-200">
          {/* Search bar */}
          <div className="px-6 py-4">
            <input
              type="text"
              placeholder="Search colleges by name or city…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Tabs */}
          <div className="px-6 pb-4 flex gap-6 border-b border-slate-100">
            {[
              { id: 'relevant', label: 'Most Relevant', icon: '⭐' },
              { id: 'popular', label: 'Most Popular', icon: '🔥' },
              { id: 'all', label: 'All Colleges', icon: '📚' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setSubFilter('All')
                }}
                className={`pb-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Sub-filters for "All Colleges" tab */}
          {activeTab === 'all' && (
            <div className="px-6 pb-3 flex gap-2">
              {['All', 'Private', 'Government'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setSubFilter(filter)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    subFilter === filter
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}>
                  {filter}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          {showMostRelevantEmpty ? (
            <div className="text-center py-16">
              <p className="text-lg font-semibold text-slate-900 mb-2">See Your Best Matches</p>
              <p className="text-slate-600 mb-6">Add your CAT score to your profile to discover colleges that fit your profile</p>
              <button
                onClick={() => navigate('/profile')}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
                Update Profile
              </button>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-64 bg-slate-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredColleges.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500">No colleges found</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-6">{filteredColleges.length} colleges</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredColleges.map(college => (
                  <CollegeCard
                    key={college.id}
                    college={college}
                    student={student}
                    isTracked={trackedColleges.has(college.id)}
                    isAdding={adding.has(college.id)}
                    onNavigate={() => navigate(`/college/${college.id}`)}
                    onAdd={() => handleAddToTracker(college.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}

// College card component
function CollegeCard({ college, student, isTracked, isAdding, onNavigate, onAdd }) {
  const getMatchScore = () => {
    if (!student?.academic_background?.cat_percentile) {
      return null
    }

    const cat = student.academic_background.cat_percentile
    const tier = college.tier || 3
    const thresholds = MATCH_SCORE_THRESHOLDS[tier]

    if (!thresholds) {
      return null
    }

    let label = 'Reach'
    let color = 'bg-orange-500'

    if (cat >= thresholds.strong) {
      label = 'Strong Match'
      color = 'bg-green-500'
    } else if (cat >= thresholds.moderate) {
      label = 'Moderate'
      color = 'bg-amber-500'
    }

    return { label, color }
  }

  const matchScore = getMatchScore()
  const imageUrl = college.image_url || GENERIC_UNIVERSITY_IMAGE
  const initials = college.name.split(' ').map(w => w[0]).join('')

  return (
    <button
      onClick={onNavigate}
      className="text-left bg-white rounded-xl overflow-hidden border border-slate-200 hover:shadow-lg hover:scale-105 transition-all duration-150 group">
      {/* Image with match badge overlay */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 aspect-video">
        <img
          src={imageUrl}
          alt={college.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
          onError={e => {
            e.target.src = GENERIC_UNIVERSITY_IMAGE
          }}
        />

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Match badge */}
        {matchScore && (
          <div className="absolute top-3 right-3">
            <span className={`text-xs px-2 py-1 rounded-full font-semibold text-white ${matchScore.color}`}>
              {matchScore.label}
            </span>
          </div>
        )}

        {/* Image placeholder initials */}
        {!college.image_url && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold text-white opacity-40">{initials}</span>
          </div>
        )}
      </div>

      {/* Card content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div>
          <h3 className="font-semibold text-slate-900 text-sm leading-tight group-hover:text-indigo-600 transition-colors">
            {college.name}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{college.location}</p>
        </div>

        {/* Stats line */}
        <div className="text-xs text-slate-600 space-y-1">
          <div className="flex flex-wrap gap-3">
            {college.avg_fees && (
              <span>₹{(college.avg_fees / 100000).toFixed(0)}L fees</span>
            )}
            {college.placement_avg_lpa && (
              <span>₹{college.placement_avg_lpa}L avg</span>
            )}
            {college.deadlines?.[0]?.date && (
              <span>{formatDate(college.deadlines[0].date)}</span>
            )}
          </div>
          {!college.avg_fees && !college.placement_avg_lpa && (
            <div>—</div>
          )}
        </div>

        {/* Add to Tracker button */}
        <button
          onClick={e => {
            e.stopPropagation()
            onAdd()
          }}
          disabled={isTracked || isAdding}
          className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
            isTracked
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
              : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
          }`}>
          {isTracked ? '✓ In Tracker' : isAdding ? 'Adding…' : '+ Add to Tracker'}
        </button>
      </div>
    </button>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'short', month: 'short' })
}
