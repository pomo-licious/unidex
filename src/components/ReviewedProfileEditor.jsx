import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, FileCheck2 } from 'lucide-react'
import AdmissionsProfileForm from './AdmissionsProfileForm'
import AiProfileReviewDialog from './AiProfileReviewDialog'
import DocumentsFirstPrompt from './DocumentsFirstPrompt'
import { getAiImportedFields, prepareProfileSaveReview, withProfileReviewRowIds } from '../lib/admissionsAiReview'
import { normalizeAdmissionsProfile } from '../lib/admissionsProfile'
import { loadAdmissionsProfileRecord } from '../lib/admissionsApi'

export default function ReviewedProfileEditor({ initialProfile, initialBaseProfile, user, saving, error, saveProfile, onSaved, onboarding = false, submitLabel, section = 'all', guided = false, documentsFirstEnabled = true, prepareCandidate, onInvalidSection, onBack }) {
  const [editorBase, setEditorBase] = useState(() => structuredClone(normalizeAdmissionsProfile(initialBaseProfile ?? initialProfile, user)))
  const [trackedBase, setTrackedBase] = useState(() => withProfileReviewRowIds(editorBase))
  const [draft, setDraft] = useState(() => ({ ...structuredClone(normalizeAdmissionsProfile(initialProfile, user)), exam_scores: structuredClone(trackedBase.exam_scores), work_experience: structuredClone(trackedBase.work_experience), professional_qualifications: structuredClone(trackedBase.professional_qualifications) }))
  const [busy, setBusy] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [pending, setPending] = useState(null)
  const active = useRef(false), busyLock = useRef(false), decision = useRef(null)
  useEffect(() => {
    active.current = true
    return () => { active.current = false; if (decision.current) { decision.current.resolve(false); decision.current = null } }
  }, [])
  const importedFields = getAiImportedFields(editorBase)
  const sources = [...new Set(importedFields.map(field => field.fileName))]
  function decide(confirmed) {
    const current = decision.current
    if (!current || current.settled) return
    current.settled = true
    if (!confirmed) setPending(null)
    else setCommitting(true)
    current.resolve(confirmed)
  }
  async function handleSave(candidate, options = {}) {
    if (busyLock.current || !active.current) return { cancelled: true }
    busyLock.current = true; setBusy(true)
    // Capture before the first await: a later keystroke cannot alter this save attempt.
    try {
      const capturedCandidate = structuredClone(prepareCandidate ? prepareCandidate(candidate, options) : candidate)
      const latest = await loadAdmissionsProfileRecord(user.id)
      if (!active.current) return { cancelled: true }
      const prepared = prepareProfileSaveReview(capturedCandidate, editorBase, { ...latest, profile: normalizeAdmissionsProfile(latest.profile, user) }, user.id, trackedBase)
      if (prepared.changes.length) {
        const confirmed = await new Promise(resolve => {
          decision.current = { resolve, settled: false }
          setPending(prepared)
        })
        if (!confirmed || !active.current) return { cancelled: true }
      }
      if (!active.current) return { cancelled: true }
      setCommitting(true)
      const saved = await saveProfile(prepared.snapshot.profile, { expectedRevision: prepared.snapshot.expectedRevision })
      if (!saved || typeof saved !== 'object') throw new Error('The server did not confirm your profile save. Please try again.')
      if (!active.current) return { cancelled: true }
      const normalized = normalizeAdmissionsProfile(saved, user)
      const tracked = withProfileReviewRowIds(normalized)
      setEditorBase(structuredClone(normalized)); setTrackedBase(tracked); setDraft(structuredClone(tracked))
      onSaved?.(new Date(), normalized, options)
      return saved
    } finally {
      decision.current = null; busyLock.current = false
      if (active.current) { setPending(null); setBusy(false); setCommitting(false) }
    }
  }
  return <DocumentsFirstPrompt enabled={documentsFirstEnabled}>{importedFields.length > 0 && <section aria-label="AI-assisted profile review" className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-5"><div className="flex items-start gap-3"><FileCheck2 size={19} className="mt-0.5 shrink-0 text-amber-700"/><div className="min-w-0"><h2 className="text-xs font-semibold text-[#10264c]">AI has helped fill your details. Please cross-check them.</h2><p className="mt-2 text-xs leading-6 text-slate-600">{importedFields.length} document-sourced field{importedFields.length === 1 ? '' : 's'} {importedFields.length === 1 ? 'is' : 'are'} in this profile. Check names, dates, marks and scores against the originals before applying. You can correct anything; AI extraction is not a verification of accuracy.</p><details className="mt-3"><summary className="w-fit cursor-pointer text-[10px] font-semibold text-amber-800">Source documents ({sources.length})</summary><ul className="mt-2 space-y-1">{sources.map(name => <li key={name} className="break-words text-[10px] leading-5 text-slate-500">{name}</li>)}</ul></details><Link to={guided ? '/documents?setup=1' : '/documents'} state={guided ? { returnTo: '/onboarding' } : undefined} className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#225feb]">Review your documents <ArrowUpRight size={12}/></Link></div></div></section>}<div inert={pending ? true : undefined}><AdmissionsProfileForm initialProfile={initialProfile} value={draft} onChange={setDraft} onSave={handleSave} disabled={busy} saving={saving || committing} error={error} onboarding={onboarding} submitLabel={submitLabel} section={section} guided={guided} onInvalidSection={onInvalidSection} onBack={onBack}/></div>{pending && <AiProfileReviewDialog changes={pending.changes} saving={committing} onKeepEditing={() => decide(false)} onConfirm={() => decide(true)}/>}</DocumentsFirstPrompt>
}
