import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Heart, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getCollegeFit } from '../lib/collegeFit'
import Layout from '../components/Layout'


// Generate deterministic hue (0-360) from college name
function getAccentHueFromName(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash) % 360
}

export default function CollegeDirectory({ user: propUser, loading: propLoading }) {
  useEffect(() => {
    document.title = 'Colleges · Unidex'
  }, [])

  const navigate = useNavigate()
  const location = useLocation()

  const [user, setUser] = useState(propUser || null)
  const [showSignInModal, setShowSignInModal] = useState(false)
  const [student, setStudent] = useState(null)
  const [colleges, setColleges] = useState([])
  const [cutoffs, setCutoffs] = useState({})
  const [applicationCounts, setApplicationCounts] = useState({})
  const [trackedColleges, setTrackedColleges] = useState(new Set())
  const [savedColleges, setSavedColleges] = useState(new Set())
  const [adding, setAdding] = useState(new Set())

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchTimeout, setSearchTimeout] = useState(null)
  const [activeTab, setActiveTab] = useState('relevant')
  const [subFilter, setSubFilter] = useState('All')
  const [rowPages, setRowPages] = useState({})
  const CARDS_PER_PAGE = 5

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

  // Fetch colleges and cutoffs
  useEffect(() => {
    async function loadData() {
      try {
        const { data: collegeData } = await supabase
          .from('colleges')
          .select('*')
          .order('name', { ascending: true })

        setColleges(collegeData || [])

        // Fetch CAT cutoffs
        const { data: cutoffData } = await supabase
          .from('college_cutoffs')
          .select('*')
          .eq('exam_type', 'CAT')

        const cutoffMap = {}
        cutoffData?.forEach(row => {
          cutoffMap[row.college_id] = row
        })
        setCutoffs(cutoffMap)

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

  // Row component with Netflix-style pagination
  function ScrollRow({ title, colleges: rowColleges, seeAllLink }) {
    const rowId = title.replace(/\s+/g, '-')
    const currentPage = rowPages[rowId] || 0
    const totalPages = Math.ceil(rowColleges.length / CARDS_PER_PAGE)
    const startIdx = currentPage * CARDS_PER_PAGE
    const endIdx = startIdx + CARDS_PER_PAGE
    const displayedColleges = rowColleges.slice(startIdx, endIdx)
    const hasNextPage = currentPage < totalPages - 1

    const goToPage = (page) => {
      setRowPages(prev => ({ ...prev, [rowId]: Math.max(0, Math.min(page, totalPages - 1)) }))
    }

    return (
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4 px-6">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        </div>

        <div className="relative group px-6">
          {/* Cards Container */}
          <div className="flex gap-4 scroll-smooth scrollbar-hide overflow-hidden">
            {displayedColleges.map(college => (
              <div key={college.id} className="flex-shrink-0 w-1/5">
                <CollegeCard
                  college={college}
                  student={student}
                  user={user}
                  catPercentile={student?.exam_scores?.percentile ?? student?.academic_background?.cat_percentile}
                  cutoff={cutoffs[college.id]}
                  isTracked={trackedColleges.has(college.id)}
                  isAdding={adding.has(college.id)}
                  isSaved={savedColleges.has(college.id)}
                  onNavigate={() => navigate(`/college/${college.id}`)}
                  onAddClick={(e) => handleAddToTracker(college.id, e)}
                  onSaveClick={(e) => handleSaveCollege(college.id, e)}
                />
              </div>
            ))}

            {/* View All Card at End */}
            {hasNextPage && (
              <div className="flex-shrink-0 w-1/5 flex items-center justify-center bg-slate-100 rounded-lg border border-dashed border-slate-300 min-h-64 cursor-pointer hover:bg-slate-200 transition" onClick={() => navigate(seeAllLink)}>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">View all →</p>
                  <p className="text-xs text-slate-500 mt-1">{rowColleges.length} colleges</p>
                </div>
              </div>
            )}
          </div>

          {/* Chevron Buttons */}
          {currentPage > 0 && (
            <button
              onClick={() => goToPage(currentPage - 1)}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition">
              <ChevronLeft className="w-5 h-5 text-[#c9a84c]" />
            </button>
          )}
          {hasNextPage && (
            <button
              onClick={() => goToPage(currentPage + 1)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition">
              <ChevronRight className="w-5 h-5 text-[#c9a84c]" />
            </button>
          )}
        </div>

        {/* Page Dots */}
        {totalPages > 1 && (
          <div className="flex gap-1.5 justify-center mt-4">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToPage(idx)}
                className={`w-2 h-2 rounded-full transition ${idx === currentPage ? 'bg-[#c9a84c]' : 'bg-slate-300'}`}
              />
            ))}
          </div>
        )}
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
    // Get student CAT percentile from exam_scores.percentile or academic_background.cat_percentile
    const catPercentile = student?.exam_scores?.percentile ?? student?.academic_background?.cat_percentile ?? null
    const filteredColleges = colleges.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()))

    if (activeTab === 'relevant') {
      if (catPercentile === null) {
        return [{
          title: 'Complete your profile to see fit',
          colleges: filteredColleges,
          showAll: true
        }]
      }

      // Categorize colleges by fit tier
      const withinReach = []
      const strongMatch = []
      const safeBet = []
      const outOfReach = []
      const unknown = []

      filteredColleges.forEach(college => {
        const fit = getCollegeFit(catPercentile, college, cutoffs[college.id])
        if (fit.tier === 'within_reach') withinReach.push(college)
        else if (fit.tier === 'strong_match') strongMatch.push(college)
        else if (fit.tier === 'safe_bet') safeBet.push(college)
        else if (fit.tier === 'out_of_reach') outOfReach.push(college)
        else unknown.push(college)
      })

      // Sort by tier (preferred first)
      const sortByTier = (colleges) => colleges.sort((a, b) => (a.tier || 3) - (b.tier || 3))

      return [
        { title: 'Within Reach', colleges: sortByTier(withinReach) },
        { title: 'Strong Match', colleges: sortByTier(strongMatch) },
        { title: 'Safe Bet', colleges: sortByTier(safeBet) },
        { title: 'Out of Reach', colleges: sortByTier(outOfReach) },
        ...(unknown.length > 0 ? [{ title: 'Complete your profile to see fit', colleges: unknown, showAll: true }] : [])
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
          <div className="px-6 py-4 space-y-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search colleges by name or city…"
                value={search}
                onChange={e => {
                  setSearch(e.target.value)
                  if (searchTimeout) clearTimeout(searchTimeout)
                  setSearchTimeout(setTimeout(() => {}, 300))
                }}
                className="w-full px-4 py-2.5 pr-10 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {search && (
              <p className="text-xs text-slate-500 px-1">
                {filteredColleges.length} result{filteredColleges.length !== 1 ? 's' : ''} for "{search}"
              </p>
            )}
            {search && filteredColleges.length === 0 && (
              <p className="text-sm text-slate-600 px-1">No colleges found — try a different name or city</p>
            )}
          </div>

          {/* Tabs */}
          <div className="px-6 pb-4 flex gap-6 border-b border-slate-100">
            {[
              { id: 'relevant', label: 'Most Relevant', icon: '⭐' },
              { id: 'popular', label: 'Most Popular', icon: '🔥' },
              { id: 'all', label: 'All Colleges' },
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
function CollegeCard({ college, student, user, catPercentile, cutoff, isTracked, isAdding, isSaved, onNavigate, onAddClick, onSaveClick }) {
  const fit = catPercentile !== null && catPercentile !== undefined ? getCollegeFit(catPercentile, college, cutoff) : null

  // Fit pill styling
  const getFitStyle = (tier) => {
    switch (tier) {
      case 'out_of_reach':
        return { bg: 'bg-rose-100', text: 'text-rose-700' }
      case 'within_reach':
        return { bg: 'bg-amber-100', text: 'text-amber-700' }
      case 'strong_match':
        return { bg: 'bg-emerald-100', text: 'text-emerald-700' }
      case 'safe_bet':
        return { bg: 'bg-blue-100', text: 'text-blue-700' }
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-700' }
    }
  }

  const initials = college.name.split(' ').map(w => w[0]).join('')
  const accentHue = getAccentHueFromName(college.name)

  return (
    <button
      onClick={onNavigate}
      className="flex-shrink-0 w-56 group text-left">
      <div className="bg-white rounded-xl overflow-hidden border border-slate-200 hover:shadow-lg hover:scale-103 transition-all duration-150 h-72">
        {/* Image or Branded Placeholder */}
        <div className="relative overflow-hidden h-32">
          {college.image_url ? (
            <img
              src={college.image_url}
              alt={college.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
            />
          ) : (
            <>
              {/* Branded placeholder: navy header with geometric pattern */}
              <div className="w-full h-full bg-[#1a2744] relative">
                {/* CSS-only geometric pattern background */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 left-0 w-32 h-32 rounded-full" style={{ backgroundColor: `hsl(${accentHue}, 70%, 50%)` }} />
                  <div className="absolute bottom-2 right-4 w-24 h-24 rounded-full" style={{ backgroundColor: `hsl(${accentHue}, 60%, 60%)` }} />
                  <div className="absolute top-1/3 right-1/4 w-16 h-16 rotate-45" style={{ backgroundColor: `hsl(${accentHue}, 65%, 55%)` }} />
                </div>

                {/* Gold monogram circle */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-[#c9a84c] flex items-center justify-center">
                    <span className="text-xl font-bold text-[#1a2744]">{initials}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Fit pill */}
          <div className="absolute top-2 right-2">
            {fit ? (
              <span
                className={`text-xs px-2 py-1 rounded-full font-semibold ${getFitStyle(fit.tier).bg} ${getFitStyle(fit.tier).text} cursor-help`}
                title={fit.estimated ? `Estimated cutoff (${fit.cutoff}%ile) — verify on college site` : `Based on CAT cutoff ${fit.cutoff}%ile`}
              >
                {fit.label}{fit.estimated ? ' · est.' : ''}
              </span>
            ) : !user ? (
              <span className="text-xs px-2 py-1 rounded-full font-semibold text-white bg-slate-600">
                Sign in
              </span>
            ) : null}
          </div>

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
