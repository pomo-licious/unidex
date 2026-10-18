import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  loadAdmissionsProfile, saveAdmissionsProfile, listAdmissionsDocuments,
  getAdmissionsDraft, saveAdmissionsDraft, listCollegePlans, saveCollegePlan, removeCollegePlan,
} from '../lib/admissionsApi'
import { createEmptyProfile, normalizeAdmissionsProfile } from '../lib/admissionsProfile'
import { createWriteQueue } from '../lib/admissionsDraft'

const AdmissionsContext = createContext(null)

export function AdmissionsProvider({ user, children }) {
  const [profile, setProfile] = useState(() => createEmptyProfile(user))
  const [profileLoad, setProfileLoad] = useState({ userId: null, loaded: false, error: '' })
  const [documents, setDocuments] = useState([])
  const [documentLoad, setDocumentLoad] = useState({ userId: null, loaded: false, error: '' })
  const [plans, setPlans] = useState([])
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(Boolean(user))
  const [pendingProfileWrites, setPendingProfileWrites] = useState(0)
  const saving = pendingProfileWrites > 0
  const [writeQueue] = useState(createWriteQueue)
  const [error, setError] = useState('')
  const [connectionStatus, setConnectionStatus] = useState(user ? 'loading' : 'guest')
  const authId = useRef(user?.id)
  const loadVersion = useRef(0)
  const profileLoadVersion = useRef(0)

  useEffect(() => {
    authId.current = user?.id
    const version = ++loadVersion.current
    const profileVersion = ++profileLoadVersion.current
    if (!user) return
    Promise.allSettled([loadAdmissionsProfile(user.id), listAdmissionsDocuments(), listCollegePlans(), getAdmissionsDraft()])
      .then(results => {
        if (version !== loadVersion.current || authId.current !== user.id) return
        if (profileVersion === profileLoadVersion.current) {
          if (results[0].status === 'fulfilled') {
            setProfile(normalizeAdmissionsProfile(results[0].value, user))
            setProfileLoad({ userId: user.id, loaded: true, error: '' })
          } else setProfileLoad({ userId: user.id, loaded: false, error: results[0].reason?.message || 'Your profile could not be loaded.' })
        }
        if (results[1].status === 'fulfilled') {
          setDocuments(results[1].value || [])
          setDocumentLoad({ userId: user.id, loaded: true, error: '' })
        } else setDocumentLoad({ userId: user.id, loaded: false, error: results[1].reason?.message || 'Your documents could not be loaded.' })
        if (results[2].status === 'fulfilled') setPlans(results[2].value || [])
        if (results[3].status === 'fulfilled') setDraft(results[3].value)
        const failed = results.filter((result, index) => result.status === 'rejected' && (index !== 0 || profileVersion === profileLoadVersion.current))
        setError(failed.length ? failed[0].reason?.message || 'Your workspace could not be loaded. Please retry.' : '')
        setConnectionStatus(failed.length ? 'error' : 'ready'); setLoading(false)
      })
    return () => { loadVersion.current += 1; profileLoadVersion.current += 1; authId.current = null }
  }, [user])

  const userId = user?.id
  const requireUser = useCallback(() => { if (!userId) throw new Error('Sign in to save your workspace.'); return userId }, [userId])
  const write = useCallback((id, operation) => writeQueue(() => {
    if (authId.current !== id) throw new Error('Your account changed. Reload before saving your changes.')
    return operation()
  }), [writeQueue])
  const saveProfile = useCallback(async (next, { expectedRevision } = {}) => {
    const id = requireUser(); setPendingProfileWrites(count => count + 1)
    try {
      const saved = await write(id, () => saveAdmissionsProfile(normalizeAdmissionsProfile(next, user), id, expectedRevision))
      if (authId.current === id) {
        profileLoadVersion.current += 1
        setProfile(normalizeAdmissionsProfile(saved, user))
        setProfileLoad({ userId: id, loaded: true, error: '' })
        setError(''); setConnectionStatus('ready')
      }
      return saved
    } finally { if (authId.current === id) setPendingProfileWrites(count => count - 1) }
  }, [requireUser, user, write])
  const retryProfile = useCallback(async () => {
    const id = requireUser()
    if (authId.current !== id) throw new Error('Your account changed. Reload before loading your profile.')
    const version = ++profileLoadVersion.current
    setProfileLoad({ userId: id, loaded: false, error: '' })
    try {
      const result = await loadAdmissionsProfile(id)
      if (authId.current === id && version === profileLoadVersion.current) {
        setProfile(normalizeAdmissionsProfile(result, user))
        setProfileLoad({ userId: id, loaded: true, error: '' })
        setError(''); setConnectionStatus('ready')
      }
      return result
    } catch (error) {
      if (authId.current === id && version === profileLoadVersion.current) {
        setProfileLoad({ userId: id, loaded: false, error: error?.message || 'Your profile could not be loaded.' })
        setConnectionStatus('error')
      }
      throw error
    }
  }, [requireUser, user])
  const refreshDocuments = useCallback(async () => {
    const id = requireUser()
    try {
      const result = await listAdmissionsDocuments()
      if (authId.current === id) { setDocuments(result || []); setDocumentLoad({ userId: id, loaded: true, error: '' }) }
      return result
    } catch (error) {
      if (authId.current === id) setDocumentLoad({ userId: id, loaded: false, error: error?.message || 'Your documents could not be loaded.' })
      throw error
    }
  }, [requireUser])
  const refreshPlans = useCallback(async () => {
    const id = requireUser(), result = await listCollegePlans()
    if (authId.current === id) setPlans(result || [])
    return result
  }, [requireUser])
  const saveDraft = useCallback(async next => {
    const id = requireUser(), saved = await write(id, () => saveAdmissionsDraft(next, id))
    if (authId.current === id) setDraft(saved)
    return saved
  }, [requireUser, write])
  const updatePlan = useCallback(async next => {
    const id = requireUser(), saved = await write(id, () => saveCollegePlan(next, id))
    if (authId.current === id) setPlans(current => [...current.filter(plan => plan.college_id !== saved.college_id), saved])
    return saved
  }, [requireUser, write])
  const addCollege = useCallback(college => {
    const existing = plans.find(plan => plan.college_id === college.id)
    return updatePlan({ status: 'Researching', notes: '', checklist: {}, is_bookmarked: false, ...existing, college_id: college.id, college_snapshot: college, is_selected: true })
  }, [plans, updatePlan])
  const toggleBookmark = useCallback(college => {
    const existing = plans.find(plan => plan.college_id === college.id)
    return updatePlan({ status: 'Researching', notes: '', checklist: {}, is_selected: false, ...existing, college_id: college.id, college_snapshot: college, is_bookmarked: !existing?.is_bookmarked })
  }, [plans, updatePlan])
  const toggleSelection = useCallback(college => {
    const existing = plans.find(plan => plan.college_id === college.id)
    return updatePlan({ status: 'Researching', notes: '', checklist: {}, is_bookmarked: false, ...existing, college_id: college.id, college_snapshot: college, is_selected: !existing?.is_selected })
  }, [plans, updatePlan])
  const removePlan = useCallback(async id => {
    const userId = requireUser(); await write(userId, () => removeCollegePlan(id, userId))
    if (authId.current === userId) setPlans(current => current.filter(plan => plan.id !== id))
  }, [requireUser, write])
  const documentsLoaded = Boolean(userId && documentLoad.userId === userId && documentLoad.loaded)
  const documentsUserId = documentsLoaded ? documentLoad.userId : null
  const documentsError = documentLoad.userId === userId ? documentLoad.error : ''
  const profileLoaded = Boolean(userId && profileLoad.userId === userId && profileLoad.loaded)
  const profileUserId = profileLoaded ? profileLoad.userId : null
  const profileError = profileLoad.userId === userId ? profileLoad.error : ''
  const value = { user, profile, profileLoaded, profileUserId, profileError, setProfile, documents, documentsLoaded, documentsUserId, documentsError, plans, draft, loading, saving, error, connectionStatus,
    saveProfile, retryProfile, refreshDocuments, refreshPlans, saveDraft, updatePlan, addCollege, toggleBookmark, toggleSelection, removePlan }
  return <AdmissionsContext.Provider value={value}>{children}</AdmissionsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Keep the context's public hook with its provider.
export function useAdmissions() {
  const context = useContext(AdmissionsContext)
  if (!context) throw new Error('The admissions workspace must be inside AdmissionsProvider.')
  return context
}
