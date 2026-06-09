import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

const MATCH_SCORE_THRESHOLDS = {
  1: { strong: 97, moderate: 93 },
  2: { strong: 88, moderate: 82 },
  3: { strong: 78, moderate: 70 },
}

const GENERIC_UNIVERSITY_IMAGE = 'https://images.unsplash.com/photo-1562774053-701939374585?w=640&q=80'

export default function CollegeDirectory({ user: propUser, loading: propLoading }) {
  const navigate = useNavigate()
  const location = useLocation()

  const [user, setUser] = useState(propUser || null)
  const [showSignInModal, setShowSignInModal] = useState(false)
  const [student, setStudent] = useState(null)
  const [colleges, setColleges] = useState([])
  const [applicationCounts, setApplicationCounts] = useState({})
  const [trackedColleges, setTrackedColleges] = useState(new Set())
  const [savedColleges, setSavedColleges] = useState(new Set())
  const [adding, setAdding] = useState(new Set())

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('relevant')
  const [subFilter, setSubFilter] = useState('All')

  // Read URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const defaultTab = params.get('tab') || 'relevant'
    setActiveTab(defaultTab)
  }, [location.search])

  // Auth listener - use propUser if provided, otherwise rely on auth listener
  useEffect(() => {
    if (propUser !== undefined && propUser !== null) {
      setUser(propUser)
      return
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setUser(session?.user ?? null)
    )
    return () => subscription.unsubscribe()
  }, [propUser])

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

        if (data?.id) {
          const { data: appData } = await supabase
            .from('applications')
            .select('college_id')
            .eq('student_id', data.id)

          if (appData) {
            setTrackedColleges(new Set(appData.map(a => a.college_id)))
          }

          // Load saved colleges
          const { data: savedData } = await supabase
            .from('saved_colleges')
            .select('college_id')
            .eq('student_id', data.id)

          if (savedData) {
            setSavedColleges(new Set(savedData.map(s => s.college_id)))
          }
        }
      } catch (err) {
        console.error('Error loading student:', err)
      }
    }

    loadStudent()
  }, [user?.id])

  // Fetch colleges
  useEffect(() => {
    async function loadData() {
      try {
        const { data: collegeData } = await supabase
          .from('colleges')
          .select('*')
          .order('name', { ascending: true })

        setColleges(collegeData || [])

        const { data: counts } = await supabase
          .from('applications')
          .select('college_id')

        const countMap = {}
        counts?.forEach(({ college_id }) => {
          countMap[college_id] = (countMap[college_id] || 0) + 1
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

  // Helper functions
  const getMatchScore = (college, percentile) => {
    const tier = college.tier || 3
    const thresholds = MATCH_SCORE_THRESHOLDS[tier]
    if (!thresholds) return 'Reach'

    if (percentile >= thresholds.strong) {
      return 'Strong Match'
    } else if (percentile >= thresholds.moderate) {
      return 'Moderate'
    }
    return 'Reach'
  }

  const getMatchPriority = (college, percentile) => {
    const score = getMatchScore(college, percentile)
    const tier = college.tier || 3
    const scoreWeight = score === 'Strong Match' ? 0 : score === 'Moderate' ? 1 : 2
    return (tier * 10) + scoreWeight
  }

  const handleAddToTracker = async (collegeId, e) => {
    e.stopPropagation()

    if (!user) {
      setShowSignInModal(true)
      return
    }
    if (!student) return

    if (trackedColleges.has(collegeId)) return

    setAdding(prev => new Set([...prev, collegeId]))
    try {
      const { error } = await supabase
        .from('applications')
        .insert({
          student_id: student.id,
          college_id: collegeId,
          status: 'Researching'
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

  const handleSaveCollege = async (collegeId, e) => {
    e.stopPropagation()

    if (!user) {
      setShowSignInModal(true)
      return
    }
    if (!student) return

    const isSaved = savedColleges.has(collegeId)

    try {
      if (isSaved) {
        // Remove from saved
        const { error } = await supabase
          .from('saved_colleges')
          .delete()
          .eq('student_id', student.id)
          .eq('college_id', collegeId)

        if (error) throw error
        setSavedColleges(prev => {
          const next = new Set(prev)
          next.delete(collegeId)
          return next
        })
      } else {
        // Add to saved
        const { error } = await supabase
          .from('saved_colleges')
          .insert({
            student_id: student.id,
            college_id: collegeId
          })

        if (error && error.code !== '23505') throw error // 23505 = unique constraint
        setSavedColleges(prev => new Set([...prev, collegeId]))
      }
    } catch (err) {
      console.error('Error toggling saved college:', err)
    }
  }

  // Row component
  function ScrollRow({ title, colleges: rowColleges, seeAllLink }) {
    const scrollRef = useRef(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(true)

    const checkScroll = useCallback(() => {
      if (!scrollRef.current) return
      setCanScrollLeft(scrollRef.current.scrollLeft > 0)
      setCanScrollRight(
        scrollRef.current.scrollLeft < scrollRef.current.scrollWidth - scrollRef.current.clientWidth - 10
      )
    }, [])

    useEffect(() => {
      checkScroll()
      window.addEventListener('resize', checkScroll)
      return () => window.removeEventListener('resize', checkScroll)
    }, [checkScroll])

    const scroll = (direction) => {
      if (!scrollRef.current) return
      const distance = 240
      scrollRef.current.scrollBy({ left: direction === 'left' ? -distance : distance, behavior: 'smooth' })
      setTimeout(checkScroll, 300)
    }

    return (
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4 px-6">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          {seeAllLink && (
            <button
              onClick={() => navigate(seeAllLink)}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
              See all →
            </button>
          )}
        </div>

        <div className="relative group">
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto px-6 pb-2 scroll-smooth scrollbar-hide"
            onScroll={checkScroll}>
            {rowColleges.map(college => (
              <CollegeCard
                key={college.id}
                college={college}
                student={student}
                user={user}
                isTracked={trackedColleges.has(college.id)}
                isAdding={adding.has(college.id)}
                isSaved={savedColleges.has(college.id)}
                onNavigate={() => navigate(`/college/${college.id}`)}
                onAddClick={(e) => handleAddToTracker(college.id, e)}
                onSaveClick={(e) => handleSaveCollege(college.id, e)}
              />
            ))}
          </div>

          {/* Arrow buttons */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="hidden group-hover:flex absolute left-0 top-1/3 z-10 items-center justify-center w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 transition">
              ←
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="hidden group-hover:flex absolute right-0 top-1/3 z-10 items-center justify-center w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 transition">
              →
            </button>
          )}
        </div>
      </div>
    )
  }

  // Helper: filter colleges by type
  const filterByType = (colleges, type) => {
    if (type === 'All') return colleges
    if (type === 'Private') return colleges.filter(c => c.type === 'Private')
    return colleges.filter(c => ['IIM', 'IIT', 'Government'].includes(c.type))
  }

  // Helper: sort colleges by property
  const sortByProperty = (colleges, prop, reverse = false) => {
    return [...colleges].sort((a, b) => {
      const aVal = a[prop] || (prop === 'name' ? '' : 999)
      const bVal = b[prop] || (prop === 'name' ? '' : 999)
      if (typeof aVal === 'string') return reverse ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal)
      return reverse ? bVal - aVal : aVal - bVal
    })
  }

  // Build rows based on active tab
  const buildRows = () => {
    const cat = student?.academic_background?.cat_percentile
    const filteredColleges = colleges.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()))

    if (activeTab === 'relevant') {
      if (!cat) {
        return [{
          title: 'See Your Best Matches',
          colleges: [],
          subtitle: 'Add your CAT score to your profile'
        }]
      }

      const strong = filteredColleges.filter(c => getMatchScore(c, cat) === 'Strong Match').sort((a, b) => (a.tier || 3) - (b.tier || 3))
      const moderate = filteredColleges.filter(c => getMatchScore(c, cat) === 'Moderate').sort((a, b) => (a.tier || 3) - (b.tier || 3))
      const reachT1 = filteredColleges.filter(c => getMatchScore(c, cat) === 'Reach' && (c.tier || 3) === 1)
      const safeT23 = filteredColleges.filter(c => getMatchScore(c, cat) === 'Strong Match' && (c.tier || 3) >= 2)

      return [
        { title: 'Your Best Matches', colleges: strong },
        { title: 'Worth Considering', colleges: moderate },
        { title: 'Aspirational Picks', colleges: reachT1 },
        { title: 'Safe Targets', colleges: safeT23 }
      ]
    }

    if (activeTab === 'popular') {
      const trending = filteredColleges
        .slice()
        .sort((a, b) => (applicationCounts[b.id] || 0) - (applicationCounts[a.id] || 0))
        .slice(0, 20)

      const govColleges = filteredColleges
        .filter(c => ['IIM', 'IIT', 'Government'].includes(c.type))
        .sort((a, b) => (a.nirf_rank || 999) - (b.nirf_rank || 999))

      const privateColleges = filteredColleges
        .filter(c => c.type === 'Private')
        .sort((a, b) => (b.placement_avg_lpa || 0) - (a.placement_avg_lpa || 0))

      return [
        { title: 'Trending This Season', colleges: trending },
        { title: 'Government Colleges', colleges: govColleges },
        { title: 'Private Colleges', colleges: privateColleges }
      ]
    }

    if (activeTab === 'all') {
      const filtered = filterByType(filteredColleges, subFilter)

      const iims = sortByProperty(filtered.filter(c => c.type === 'IIM'), 'name')
      const iits = sortByProperty(filtered.filter(c => c.type === 'IIT'), 'name')
      const privates = sortByProperty(filtered.filter(c => c.type === 'Private'), 'name')
      const govOther = sortByProperty(filtered.filter(c => c.type === 'Government' && !['IIM', 'IIT'].includes(c.type)), 'name')

      return [
        { title: 'IIMs', colleges: iims },
        { title: 'IITs', colleges: iits },
        { title: 'Private B-Schools', colleges: privates },
        { title: 'Government B-Schools', colleges: govOther }
      ]
    }

    return []
  }

  const rows = buildRows()

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
        <div className="py-8">
          {loading ? (
            <div className="px-6">
              <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
            </div>
          ) : rows[0]?.colleges?.length === 0 && !rows.some(r => r.colleges.length > 0) ? (
            <div className="text-center py-16 px-6">
              <p className="text-lg font-semibold text-slate-900 mb-2">See Your Best Matches</p>
              <p className="text-slate-600 mb-6">Add your CAT score to your profile to discover colleges that fit your profile</p>
              {user && (
                <button
                  onClick={() => navigate('/profile')}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
                  Update Profile
                </button>
              )}
            </div>
          ) : (
            <>
              {rows.map((row, i) => (
                row.colleges.length > 0 && (
                  <ScrollRow
                    key={i}
                    title={row.title}
                    colleges={row.colleges}
                    seeAllLink={null}
                  />
                )
              ))}
            </>
          )}
        </div>

        {/* Sign-in modal */}
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
      </div>
    </Layout>
  )
}

// Compact card component
function CollegeCard({ college, student, user, isTracked, isAdding, isSaved, onNavigate, onAddClick, onSaveClick }) {
  const getMatchScore = (college, percentile) => {
    const tier = college.tier || 3
    const thresholds = MATCH_SCORE_THRESHOLDS[tier]
    if (!thresholds) return { label: 'Reach', color: 'bg-orange-500', tooltip: 'Your score is below typical cutoff — worth applying' }

    if (percentile >= thresholds.strong) {
      return { label: 'Strong Match', color: 'bg-green-500', tooltip: 'Your CAT score is above this college\'s cutoff' }
    } else if (percentile >= thresholds.moderate) {
      return { label: 'Moderate', color: 'bg-amber-500', tooltip: 'Your score is near this college\'s cutoff range' }
    }
    return { label: 'Reach', color: 'bg-orange-500', tooltip: 'Your score is below typical cutoff — worth applying' }
  }

  const matchScore = student && user ? getMatchScore(college, student.academic_background?.cat_percentile) : null
  const imageUrl = college.image_url || GENERIC_UNIVERSITY_IMAGE
  const initials = college.name.split(' ').map(w => w[0]).join('')

  return (
    <button
      onClick={onNavigate}
      className="flex-shrink-0 w-56 group text-left">
      <div className="bg-white rounded-xl overflow-hidden border border-slate-200 hover:shadow-lg hover:scale-103 transition-all duration-150 h-72">
        {/* Image */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 h-32">
          <img
            src={imageUrl}
            alt={college.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
            onError={e => {
              e.target.src = GENERIC_UNIVERSITY_IMAGE
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

          {/* Match badge */}
          <div className="absolute top-2 right-2">
            {user && matchScore ? (
              <span className={`text-xs px-2 py-1 rounded-full font-semibold text-white ${matchScore.color} cursor-help`} title={matchScore.tooltip}>
                {matchScore.label}
              </span>
            ) : !user ? (
              <span className="text-xs px-2 py-1 rounded-full font-semibold text-white bg-slate-600">
                Sign in
              </span>
            ) : null}
          </div>

          {/* Initials */}
          {!college.image_url && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-white opacity-40">{initials}</span>
            </div>
          )}

          {/* Save heart button */}
          {user && (
            <button
              onClick={onSaveClick}
              className="absolute top-2 left-2 z-20 transition hover:scale-110"
              title={isSaved ? 'Remove from saved' : 'Save for later'}
            >
              <Heart
                className={`w-6 h-6 transition ${
                  isSaved
                    ? 'fill-red-400 stroke-red-400'
                    : 'stroke-white opacity-70 hover:opacity-100'
                }`}
              />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-3 space-y-2 flex flex-col flex-1">
          <div>
            <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:underline">
              {college.name}
            </h3>
            <p className="text-xs text-slate-500">{college.location}</p>
          </div>

          {/* Stats */}
          <div className="text-xs text-slate-600 space-y-0.5">
            <div className="flex flex-wrap gap-1">
              {college.avg_fees && <span>₹{(college.avg_fees / 100000).toFixed(0)}L</span>}
              {user && college.placement_avg_lpa && <span>·</span>}
              {user && college.placement_avg_lpa && <span>₹{college.placement_avg_lpa}L avg</span>}
              {college.nirf_rank && user && <span>·</span>}
              {college.nirf_rank && user && <span>#{college.nirf_rank}</span>}
            </div>
          </div>

          {/* Button */}
          <button
            onClick={(e) => onAddClick(e)}
            disabled={isTracked || isAdding}
            className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors mt-auto ${
              isTracked
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                : user
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
            }`}>
            {isTracked ? '✓ In Tracker' : isAdding ? 'Adding…' : '+ Add'}
          </button>
        </div>
      </div>
    </button>
  )
}
