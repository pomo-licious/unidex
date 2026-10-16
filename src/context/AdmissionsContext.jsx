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
  const [documents, setDocuments] = useState([])
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

  useEffect(() => {
    authId.current = user?.id
    const version = ++loadVersion.current
    if (!user) return
    Promise.allSettled([loadAdmissionsProfile(), listAdmissionsDocuments(), listCollegePlans(), getAdmissionsDraft()])
      .then(results => {
        if (version !== loadVersion.current || authId.current !== user.id) return
        if (results[0].status === 'fulfilled') setProfile(normalizeAdmissionsProfile(results[0].value, user))
        if (results[1].status === 'fulfilled') setDocuments(results[1].value || [])
        if (results[2].status === 'fulfilled') setPlans(results[2].value || [])
        if (results[3].status === 'fulfilled') setDraft(results[3].value)
        const failed = results.filter(result => result.status === 'rejected')
        setError(failed.length ? failed[0].reason?.message || 'Your workspace could not be loaded. Please retry.' : '')
        setConnectionStatus(failed.length ? 'error' : 'ready'); setLoading(false)
      })
    return () => { loadVersion.current += 1; authId.current = null }
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
      if (authId.current === id) { setProfile(normalizeAdmissionsProfile(saved, user)); setError(''); setConnectionStatus('ready') }
      return saved
    } finally { if (authId.current === id) setPendingProfileWrites(count => count - 1) }
  }, [requireUser, user, write])
  const refreshDocuments = useCallback(async () => {
    const id = requireUser(), result = await listAdmissionsDocuments()
    if (authId.current === id) setDocuments(result || [])
    return result
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
  const value = { user, profile, setProfile, documents, plans, draft, loading, saving, error, connectionStatus,
    saveProfile, refreshDocuments, refreshPlans, saveDraft, updatePlan, addCollege, toggleBookmark, toggleSelection, removePlan }
  return <AdmissionsContext.Provider value={value}>{children}</AdmissionsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Keep the context's public hook with its provider.
export function useAdmissions() {
  const context = useContext(AdmissionsContext)
  if (!context) throw new Error('The admissions workspace must be inside AdmissionsProvider.')
  return context
}
