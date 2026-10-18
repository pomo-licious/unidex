import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { ArrowDownToLine, ArrowRight, ArrowUpRight, Check, CheckCircle2, ChevronDown, FileText, FolderLock, Image, LoaderCircle, RefreshCw, ScanLine, ShieldCheck, Trash2, Upload, X, CircleAlert, Eye } from 'lucide-react'
import Layout from '../components/Layout'
import { useAdmissions } from '../context/AdmissionsContext'
import { DOCUMENT_TYPES as TYPES, DOCUMENT_TYPE_LABELS as TYPE_LABEL, IMAGE_MIME_TYPES, IDENTITY_DOCUMENT_TYPES } from '../lib/admissionsDocumentTypes'
import { appendAdmissionsAiImports, getSafeAdmissionsDocumentSuggestions, planAdmissionsBatchAutofill, runAdmissionsDocumentBatch } from '../lib/admissionsBatchReview'
import { normalizeAdmissionsProfile } from '../lib/admissionsProfile'
import { applyAdmissionsDocumentReview, buildAdmissionsDocumentReview, retargetAdmissionsDocumentReview, updateAdmissionsDocumentField, DOCUMENT_REVIEW_NUMBERS as NUMBERS, hasDocumentReviewValue as hasValue } from '../lib/admissionsDocumentReview'
import { listAdmissionsDocuments, loadAdmissionsProfileRecord, uploadAdmissionsDocument, extractAdmissionsDocument, saveDocumentReview, removeAdmissionsDocument } from '../lib/admissionsApi'

const inputClass = 'min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-[#10264c] outline-none focus:border-[#225feb] focus:ring-4 focus:ring-blue-50'
function errorMessage(err) { return err?.message || 'The request could not be completed. Please try again.' }
function formatSize(bytes) { return bytes ? bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB` : 'Uploaded document' }
function statusInfo(status) {
  if (status === 'reviewed' || status === 'verified') return ['Reviewed', 'bg-emerald-50 text-emerald-700']
  if (status === 'needs_review' || status === 'extracted') return ['Review details', 'bg-amber-50 text-amber-700']
  if (status === 'extracting' || status === 'processing') return ['Processing', 'bg-blue-50 text-[#225feb]']
  if (status === 'failed' || status === 'error') return ['Extraction failed', 'bg-red-50 text-red-600']
  return ['Uploaded', 'bg-slate-100 text-slate-500']
}
function validate(file, documentType) {
  if (!file) return 'Choose a file to upload.'
  if (file.size === 0) return 'This file is empty. Please choose a different file.'
  if (file.size > 10 * 1024 * 1024) return 'Your file exceeds 10 MB. Please compress it or upload a smaller copy.'
  if (documentType === 'photo' && !IMAGE_MIME_TYPES.includes(file.type)) return 'A profile photo must be a JPG, PNG or WebP image, not a PDF.'
  const validMime = ['application/pdf', ...IMAGE_MIME_TYPES]
  if (!validMime.includes(file.type) || !/\.(pdf|jpg|jpeg|png|webp)$/i.test(file.name)) return 'Use a PDF, JPG, PNG or WebP file. Other formats are not supported.'
  return ''
}
function useDocumentModal(onClose, locked) {
  const modal = useRef(null), closeAction = useRef(onClose), isLocked = useRef(locked)
  useEffect(() => { closeAction.current = onClose }, [onClose])
  useEffect(() => { isLocked.current = locked }, [locked])
  useEffect(() => {
    const node = modal.current
    if (!node) return
    const focusable = () => [...node.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(item => !item.closest('[inert]') && item.getAttribute('aria-disabled') !== 'true')
    const frame = requestAnimationFrame(() => (focusable()[0] || node).focus())
    function keydown(event) {
      if (event.key === 'Escape') { event.preventDefault(); if (!isLocked.current) closeAction.current(); return }
      if (event.key !== 'Tab') return
      const items = focusable(), first = items[0], last = items.at(-1)
      if (!items.length) { event.preventDefault(); node.focus(); return }
      if (event.shiftKey && (document.activeElement === first || !node.contains(document.activeElement))) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !node.contains(document.activeElement))) { event.preventDefault(); first.focus() }
    }
    node.addEventListener('keydown', keydown)
    return () => { cancelAnimationFrame(frame); node.removeEventListener('keydown', keydown) }
  }, [])
  return modal
}
function ModalPortal({ children }) { return typeof document === 'undefined' ? null : createPortal(children, document.body) }
function hasStoredExtraction(document) { return document.extracted_data !== null && typeof document.extracted_data === 'object' && !Array.isArray(document.extracted_data) }
function BatchApproval({ documents, reextract, onReextract, processingApproved, onProcessingApproval, autofillApproved, onAutofillApproval, photoChoice, onPhotoChoice, progress, busy, error, onStart, onClose }) {
  const modal = useDocumentModal(onClose, busy)
  const sending = documents.filter(document => document.document_type !== 'photo' && (reextract || !hasStoredExtraction(document)))
  const photos = documents.filter(document => document.document_type === 'photo' && IMAGE_MIME_TYPES.includes(document.mime_type))
  return <div className="fixed inset-0 z-[75] grid place-items-center bg-[#10264c]/45 p-4 backdrop-blur-sm"><section ref={modal} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="batch-approval-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#225feb]">YOUR SELECTED DOCUMENTS</p><h2 id="batch-approval-title" className="text-2xl font-semibold tracking-tight text-[#10264c]">One batch. Your approval.</h2><p className="mt-3 text-xs leading-6 text-slate-500">Selection does not authorize processing. Review these filenames and choose what happens next.</p></div><button type="button" disabled={busy} onClick={onClose} aria-label="Close batch approval" className="rounded-full p-2 text-slate-400 hover:bg-slate-50 disabled:opacity-30"><X size={18}/></button></div><div className="mt-6 max-h-56 overflow-y-auto rounded-2xl border border-slate-200">{documents.map(document => <div key={document.id} className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0"><span className="min-w-0 break-all text-xs font-medium text-[#10264c]">{document.file_name}</span><span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[9px] font-medium text-[#225feb]">{document.document_type === 'photo' ? 'Photo · no AI' : !reextract && hasStoredExtraction(document) ? 'Reuse extraction' : 'Send to OpenAI'}</span></div>)}</div>{documents.some(document => document.document_type !== 'photo' && hasStoredExtraction(document)) && <label className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500"><input type="checkbox" checked={reextract} disabled={busy} onChange={event => onReextract(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#225feb]"/><span>Extract previously processed files again. This makes additional OpenAI requests; the default reuses saved results.</span></label>}{photos.length > 1 && <label className="mt-5 block text-xs font-semibold text-[#10264c]">Choose your primary profile photo<select value={photoChoice} disabled={busy} onChange={event => onPhotoChoice(event.target.value)} className={`${inputClass} mt-2`}><option value="">Choose a photo or skip</option>{photos.map(document => <option key={document.id} value={document.id}>{document.file_name}</option>)}<option value="skip">Skip photos; keep my current photo</option></select><span className="mt-2 block text-[10px] font-normal leading-5 text-slate-500">Photos are linked directly from your private uploads, without text extraction.</span></label>}{photos.length === 1 && <p className="mt-4 text-[11px] leading-5 text-slate-500">Photo: {photos[0].file_name}. It will fill an empty profile photo; an existing photo stays unchanged.</p>}<div className="mt-6 space-y-4">{sending.length > 0 ? <label className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4"><input type="checkbox" checked={processingApproved} disabled={busy} onChange={event => onProcessingApproval(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#225feb]"/><span className="text-xs leading-6 text-[#10264c]">I approve sending the {sending.length} named file{sending.length === 1 ? '' : 's'} marked “Send to OpenAI” to OpenAI GPT for suggested-field extraction. <span className="text-slate-500">Their complete contents will be processed by OpenAI. ID numbers are not imported into my profile. </span><Link to="/privacy" target="_blank" className="font-semibold text-[#225feb]">Privacy Policy ↗</Link></span></label> : <p className="rounded-xl bg-slate-50 p-4 text-[11px] leading-6 text-slate-500">This batch uses saved extraction results and selected photos. No new file will be sent to OpenAI.</p>}<label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4"><input type="checkbox" checked={autofillApproved} disabled={busy} onChange={event => onAutofillApproval(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#225feb]"/><span className="text-xs leading-6 text-[#10264c]">Autofill currently empty profile fields with agreed extracted values and use the photo selected above. <span className="text-slate-500">Keep my existing values unchanged. Leave disagreements and ambiguous records for review. Imported AI facts will be marked as not yet reviewed.</span></span></label></div>{busy && <div role="status" className="mt-5 rounded-2xl bg-blue-50 p-4 text-xs leading-6 text-[#225feb]"><span className="flex items-center gap-2 font-semibold"><LoaderCircle size={15} className="animate-spin"/>Processing one file at a time…</span><p className="mt-2">{progress.results.length} of {documents.length} files handled{progress.current ? ` · ${progress.current.file_name}` : ''}</p></div>}{error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-xs leading-6 text-red-700">{error}</p>}<div className="mt-6 flex flex-wrap items-center justify-between gap-4"><p className="max-w-sm text-[10px] leading-5 text-slate-400">Provider failures are reported. Quota, rate-limit or account errors stop further requests; there are no automatic retries.</p><button type="button" onClick={onStart} disabled={busy || !autofillApproved || sending.length > 0 && !processingApproved || photos.length > 1 && !photoChoice} className="inline-flex items-center gap-2 rounded-full bg-[#225feb] px-5 py-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{busy ? <LoaderCircle size={15} className="animate-spin"/> : <ScanLine size={15}/>}Extract & autofill selected</button></div></section></div>
}
function BatchCompletion({ summary, busy, onRetrySave, onClose }) {
  const modal = useDocumentModal(onClose, busy)
  const failed = summary.results.filter(item => item.status === 'failed'), skipped = summary.results.filter(item => item.status === 'not_attempted')
  const extracted = summary.results.filter(item => item.status === 'extracted').length, reused = summary.results.filter(item => item.status === 'reused').length
  const plan = summary.plan
  return <div className="fixed inset-0 z-[76] grid place-items-center bg-[#10264c]/45 p-4 backdrop-blur-sm"><section ref={modal} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="batch-complete-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#225feb]">DOCUMENT IMPORT SUMMARY</p><h2 id="batch-complete-title" className="text-2xl font-semibold tracking-tight text-[#10264c]">{summary.profileSaved ? plan?.appliedCount ? 'Your profile has a head start.' : 'Your saved profile is preserved.' : 'Some work needs your attention.'}</h2></div><button type="button" disabled={busy} onClick={onClose} aria-label="Close import summary" className="rounded-full p-2 text-slate-400 hover:bg-slate-50 disabled:opacity-30"><X size={18}/></button></div><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{[[extracted, 'Extracted'], [reused, 'Reused'], [failed.length, 'Failed'], [skipped.length, 'Not attempted']].map(([count, label]) => <div key={label} className="rounded-xl bg-[#f5f8ff] p-3"><p className="text-xl font-semibold text-[#10264c]">{count}</p><p className="mt-1 text-[10px] text-slate-500">{label}</p></div>)}</div>{summary.profileSaved && <p role="status" className="mt-5 text-xs leading-6 text-[#10264c]">{plan.textFieldCount} agreed empty field{plan.textFieldCount === 1 ? '' : 's'} saved. {plan.photoApplied ? 'Your selected private photo was assigned directly, without AI extraction.' : 'Your existing profile photo was preserved.'} {plan.matchedCount} extracted values already matched your profile.</p>}{summary.saveError && <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-xs leading-6 text-red-700"><p>Extracted results remain available, but profile autofill was not confirmed.</p><p className="mt-1">{summary.saveError}</p><button type="button" onClick={onRetrySave} disabled={busy} className="mt-3 inline-flex items-center gap-2 font-semibold underline disabled:opacity-40">{busy && <LoaderCircle size={13} className="animate-spin"/>}Retry saving available results · no new extraction</button></div>}<div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5"><CircleAlert size={20} className="mt-0.5 shrink-0 text-amber-700"/><div><h3 className="text-sm font-semibold text-amber-900">AI can make mistakes. Please check your details.</h3><p className="mt-2 text-xs leading-6 text-amber-800">Compare names, dates, marks and exam scores with your originals before using them in an application. Autofilled AI facts are marked as not yet reviewed. Conflicting or ambiguous facts have not been used to replace saved values.</p></div></div>{plan?.conflicts?.length > 0 && <div className="mt-6"><h3 className="text-sm font-semibold text-[#10264c]">{plan.conflicts.length} item{plan.conflicts.length === 1 ? '' : 's'} need review</h3><div className="mt-3 space-y-3">{plan.conflicts.map((item, index) => <div key={`${JSON.stringify(item.path)}-${index}`} className="rounded-xl border border-slate-200 p-4 text-[11px] leading-5"><p className="font-semibold text-[#10264c]">{item.label}</p><p className="mt-1 text-slate-500">{item.message}</p>{hasValue(item.current) && <p className="mt-2 text-slate-600">Saved: {String(item.current)}</p>}{item.values.map((value, valueIndex) => <p key={`${value.document_id}-${valueIndex}`} className="mt-1 break-words text-slate-500">{value.file_name}: <span className="font-medium text-slate-700">{String(value.value)}</span></p>)}</div>)}</div></div>}{[...failed, ...skipped].length > 0 && <div className="mt-6 space-y-3"><h3 className="text-sm font-semibold text-[#10264c]">Files not completed</h3>{[...failed, ...skipped].map(item => <div key={item.document.id} className="rounded-xl bg-slate-50 p-4 text-[11px] leading-5"><p className="break-all font-semibold text-[#10264c]">{item.document.file_name} · {item.status === 'failed' ? 'Failed' : 'Not attempted'}</p><p className="mt-1 text-slate-500">{item.error}</p></div>)}</div>}<div className="mt-7 flex flex-wrap justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-full border border-slate-200 px-5 py-3 text-xs font-semibold text-slate-600">Review documents</button><Link to="/profile" aria-disabled={busy} tabIndex={busy ? -1 : 0} onClick={event => { if (busy) event.preventDefault(); else onClose() }} className="inline-flex items-center gap-2 rounded-full bg-[#225feb] px-5 py-3 text-xs font-semibold text-white aria-disabled:opacity-40">Check my profile <ArrowRight size={14}/></Link></div></section></div>
}

function PhotoApproval({ document, busy, error, onSave, onClose }) {
  const modal = useDocumentModal(onClose, busy)
  return <div className="fixed inset-0 z-[77] grid place-items-center bg-[#10264c]/45 p-4 backdrop-blur-sm"><section ref={modal} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="photo-approval-title" className="w-full max-w-md rounded-[28px] bg-white p-7 shadow-2xl"><h2 id="photo-approval-title" className="text-2xl font-semibold tracking-tight text-[#10264c]">Use this profile photo?</h2>{document.signed_url && <img src={document.signed_url} alt="Selected private profile photograph" className="mx-auto mt-5 h-28 w-28 rounded-2xl object-cover"/>}<p className="mt-5 break-all text-xs font-semibold text-[#10264c]">{document.file_name}</p><p className="mt-3 text-xs leading-6 text-slate-500">This directly replaces your current profile photo with the selected private upload. Your other details stay unchanged. No file is sent to AI.</p>{error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs leading-6 text-red-700">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-full border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500">Cancel</button><button type="button" disabled={busy} onClick={onSave} className="inline-flex items-center gap-2 rounded-full bg-[#225feb] px-5 py-3 text-xs font-semibold text-white disabled:opacity-40">{busy && <LoaderCircle size={14} className="animate-spin"/>}Use this photo</button></div></section></div>
}

export default function DocumentUpload() {
  const { user, profile, setProfile, saveProfile, refreshDocuments } = useAdmissions()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [file, setFile] = useState(null)
  const [type, setType] = useState('academic_10th')
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState('')
  const [reviewDoc, setReviewDoc] = useState(null)
  const [fields, setFields] = useState([])
  const [reviewRecords, setReviewRecords] = useState([])
  const [skippedDuplicates, setSkippedDuplicates] = useState([])
  const [appliedReview, setAppliedReview] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [profileApplied, setProfileApplied] = useState(false)
  const [removeId, setRemoveId] = useState(null)
  const [openaiConsents, setOpenaiConsents] = useState({})
  const [selectedDocuments, setSelectedDocuments] = useState([])
  const [batchDocuments, setBatchDocuments] = useState([])
  const [batchOpen, setBatchOpen] = useState(false)
  const [batchProcessingApproved, setBatchProcessingApproved] = useState(false)
  const [batchAutofillApproved, setBatchAutofillApproved] = useState(false)
  const [batchReextract, setBatchReextract] = useState(false)
  const [batchPhoto, setBatchPhoto] = useState('')
  const [batchError, setBatchError] = useState('')
  const [batchProgress, setBatchProgress] = useState({ results: [], current: null })
  const [batchSummary, setBatchSummary] = useState(null)
  const [photoToAssign, setPhotoToAssign] = useState(null)
  const [photoError, setPhotoError] = useState('')
  const modalOpen = batchOpen || Boolean(batchSummary) || Boolean(photoToAssign)
  useEffect(() => {
    if (!modalOpen) return
    const root = document.getElementById('root'), priorFocus = document.activeElement, priorOverflow = document.body.style.overflow, wasInert = root?.inert
    if (root) root.inert = true
    document.body.style.overflow = 'hidden'
    return () => {
      if (root) root.inert = Boolean(wasInert)
      document.body.style.overflow = priorOverflow
      requestAnimationFrame(() => { if (priorFocus?.isConnected) priorFocus.focus() })
    }
  }, [modalOpen])
  const input = useRef(null)
  const reviewPanel = useRef(null)
  useEffect(() => {
    document.title = 'Your documents · Unidex'
    let active = true
    listAdmissionsDocuments().then(rows => { if (active) setDocuments(Array.isArray(rows) ? rows : []) }).catch(err => { if (active) setError(errorMessage(err)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  async function reload() {
    setLoading(true)
    setError('')
    try { const rows = await listAdmissionsDocuments(); setDocuments(rows || []); await refreshDocuments?.() } catch (err) { setError(errorMessage(err)) } finally { setLoading(false) }
  }
  function putDocument(document) {
    if (!document?.id) return
    setDocuments(previous => [document, ...previous.filter(item => item.id !== document.id)])
  }
  function chooseFile(next) {
    const invalid = validate(next, type)
    setError(invalid)
    setNotice('')
    if (invalid) { setFile(null); if (input.current) input.current.value = ''; return }
    setFile(next)
  }
  async function upload() {
    const invalid = validate(file, type)
    if (invalid) { setError(invalid); return }
    setBusy('upload')
    setError('')
    setNotice('')
    try {
      const saved = await uploadAdmissionsDocument(file, type, undefined, user?.id)
      if (!saved?.id) throw new Error('The server did not confirm this document was saved. Your selected file is still here; please retry.')
      putDocument(saved)
      setFile(null)
      if (input.current) input.current.value = ''
      setNotice('Your document is uploaded privately. To extract suggested fields, review and approve the OpenAI GPT disclosure beside this document.')
      refreshDocuments?.().catch(() => {})
    } catch (err) { setError(errorMessage(err)) } finally { setBusy('') }
  }
  function openReview(document) {
    setOpenaiConsents(previous => ({ ...previous, [document.id]: false }))
    setReviewDoc(document)
    const model = buildAdmissionsDocumentReview(getSafeAdmissionsDocumentSuggestions(document), profile || {})
    setFields(model.fields)
    setReviewRecords(model.records)
    setSkippedDuplicates(model.skippedDuplicates)
    setAppliedReview(null)
    setConfirmed(false)
    setReviewError('')
    setProfileApplied(false)
    requestAnimationFrame(() => reviewPanel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  async function extract(document) {
    const openaiDocumentProcessing = openaiConsents[document.id] === true
    if (!openaiDocumentProcessing) {
      setError('Before extraction, approve sending this specific document to OpenAI GPT using its checkbox. You can also enter your details directly in Profile.')
      return
    }
    setOpenaiConsents(previous => ({ ...previous, [document.id]: false }))
    setBusy(`extract:${document.id}`)
    setError('')
    setNotice('')
    try {
      const updated = await extractAdmissionsDocument(document, user?.id, openaiDocumentProcessing)
      if (!updated?.id || !updated?.extracted_data) throw new Error('No extracted details were returned. Please retry or enter your information in Profile.')
      putDocument(updated)
      openReview(updated)
      refreshDocuments?.().catch(() => {})
    } catch (err) { setError(errorMessage(err)) } finally { setBusy('') }
  }
  async function remove(document) {
    setBusy(`delete:${document.id}`)
    setError('')
    setNotice('')
    try {
      await removeAdmissionsDocument(document, user?.id)
      setDocuments(previous => previous.filter(item => item.id !== document.id))
      if (reviewDoc?.id === document.id) setReviewDoc(null)
      setSelectedDocuments(previous => previous.filter(id => id !== document.id))
      setRemoveId(null)
      setOpenaiConsents(previous => { const next = { ...previous }; delete next[document.id]; return next })
      setNotice('Document removed. Previously reviewed profile details remain editable in your profile.')
      refreshDocuments?.().catch(() => {})
    } catch (err) { setError(errorMessage(err)) } finally { setBusy('') }
  }
  function changeField(id, patch) {
    setFields(previous => previous.map(field => field.id === id ? updateAdmissionsDocumentField(field, patch) : field))
    setConfirmed(false); setReviewError(''); setProfileApplied(false); setAppliedReview(null)
  }
  function chooseReviewTarget(recordId, choice) {
    try {
      const model = retargetAdmissionsDocumentReview({ fields, records: reviewRecords, skippedDuplicates }, recordId, choice, profile || {})
      setFields(model.fields); setReviewRecords(model.records); setConfirmed(false); setReviewError(''); setProfileApplied(false); setAppliedReview(null)
    } catch (err) { setReviewError(errorMessage(err)) }
  }
  async function saveReview(event) {
    event.preventDefault()
    if (!confirmed) { setReviewError('Confirm that you have checked these details against your original document.'); return }
    setBusy(`review:${reviewDoc.id}`)
    setReviewError('')
    let applied = profileApplied, result = appliedReview
    try {
      if (!applied) {
        const record = await loadAdmissionsProfileRecord(user?.id)
        const latestProfile = normalizeAdmissionsProfile(record.profile, user)
        setProfile(latestProfile)
        result = applyAdmissionsDocumentReview(latestProfile, { fields, records: reviewRecords, skippedDuplicates })
        const originalFields = result.appliedFields.filter(field => field.originalValue !== undefined)
        const sources = new Map(originalFields.map(field => [JSON.stringify(field.path), [{ document_id: reviewDoc.id, file_name: reviewDoc.file_name, value: field.originalValue }]]))
        result.profile.ai_imports = appendAdmissionsAiImports(result.profile, originalFields, sources, new Date().toISOString(), { reviewed: true })
        const pendingReview = (latestProfile.ai_imports || []).some(entry => entry.document_id === reviewDoc.id && entry.reviewed === false)
        result.profile.ai_imports = result.profile.ai_imports.map(entry => entry.document_id === reviewDoc.id ? { ...entry, reviewed: true } : entry)
        if (result.appliedCount > 0 || pendingReview) await saveProfile(result.profile, { expectedRevision: record.revision })
        applied = true
        setProfileApplied(true)
        setAppliedReview(result)
      }
      const updated = await saveDocumentReview(reviewDoc, result.reviewedData, user?.id)
      if (!updated?.id) throw new Error('The server did not confirm that this review was recorded. Please retry recording the review.')
      putDocument(updated)
      setReviewDoc(null)
      setNotice(`Review saved. ${result.appliedCount} detail${result.appliedCount === 1 ? '' : 's'} added or updated; ${result.matchedCount} already matched your profile. Unselected variances were left unchanged.`)
      refreshDocuments?.().catch(() => {})
    } catch (err) {
      if (!applied && err?.code === 'PROFILE_CHANGED') {
        try { const latest = await loadAdmissionsProfileRecord(user?.id); setProfile(normalizeAdmissionsProfile(latest.profile, user)) } catch { /* Preserve the existing review and explain the original conflict. */ }
      }
      setReviewError(`${applied ? result?.appliedCount > 0 ? 'Your approved profile changes are saved, but the document review could not be recorded. Retry to finish. ' : 'No profile changes were needed, but the document review could not be recorded. Retry to finish. ' : ''}${errorMessage(err)}`)
    } finally { setBusy('') }
  }
  async function assignProfilePhoto() {
    if (!photoToAssign) return
    setBusy('photo'); setPhotoError('')
    try {
      const record = await loadAdmissionsProfileRecord(user?.id), latest = normalizeAdmissionsProfile(record.profile, user)
      setProfile(latest)
      await saveProfile({ ...latest, profile_photo_document_id: photoToAssign.id }, { expectedRevision: record.revision })
      setNotice('Your profile photo has been updated from your private upload. No AI extraction was used.')
      setPhotoToAssign(null)
    } catch (err) { setPhotoError(errorMessage(err)) } finally { setBusy('') }
  }
  function openBatch() {
    const chosen = documents.filter(document => selectedDocuments.includes(document.id))
    if (!chosen.length) return
    const photos = chosen.filter(document => document.document_type === 'photo' && IMAGE_MIME_TYPES.includes(document.mime_type))
    setBatchDocuments(chosen); setBatchProcessingApproved(false); setBatchAutofillApproved(false); setBatchReextract(false)
    setBatchPhoto(photos.length === 1 ? photos[0].id : ''); setBatchError(''); setBatchProgress({ results: [], current: null }); setBatchOpen(true)
  }
  async function saveBatchResults(result, primaryPhotoDocumentId) {
    let plan = null
    try {
      const record = await loadAdmissionsProfileRecord(user?.id)
      const latest = normalizeAdmissionsProfile(record.profile, user)
      setProfile(latest)
      plan = planAdmissionsBatchAutofill(latest, result.readyDocuments, { primaryPhotoDocumentId })
      if (plan.appliedCount > 0) await saveProfile(plan.profile, { expectedRevision: record.revision })
      return { ...result, plan, primaryPhotoDocumentId, profileSaved: true, saveError: '' }
    } catch (err) {
      return { ...result, plan, primaryPhotoDocumentId, profileSaved: false, saveError: errorMessage(err) }
    }
  }
  async function startBatch() {
    const sending = batchDocuments.filter(document => document.document_type !== 'photo' && (batchReextract || !hasStoredExtraction(document)))
    const photos = batchDocuments.filter(document => document.document_type === 'photo' && IMAGE_MIME_TYPES.includes(document.mime_type))
    if (!batchAutofillApproved || sending.length > 0 && !batchProcessingApproved) { setBatchError('Approve the named-file processing request and empty-field autofill before continuing.'); return }
    if (photos.length > 1 && !batchPhoto) { setBatchError('Choose a primary photo or explicitly skip the photos.'); return }
    setBusy('batch'); setBatchError(''); setError(''); setNotice(''); setReviewDoc(null)
    const processingApproved = batchProcessingApproved
    setBatchProcessingApproved(false)
    try {
      const result = await runAdmissionsDocumentBatch(batchDocuments, {
        processingApproved, reextract: batchReextract,
        extract: document => extractAdmissionsDocument(document, user?.id, processingApproved),
        onProgress: progress => { setBatchProgress(progress); progress.results.filter(item => item.status === 'extracted').forEach(item => putDocument(item.document)) },
      })
      const summary = await saveBatchResults(result, batchPhoto || null)
      setBatchSummary(summary); setBatchOpen(false)
      refreshDocuments?.().catch(() => {})
    } catch (err) { setBatchError(errorMessage(err)) } finally { setBusy('') }
  }
  async function retryBatchSave() {
    if (!batchSummary) return
    setBusy('batch-save')
    try { setBatchSummary(await saveBatchResults(batchSummary, batchSummary.primaryPhotoDocumentId)) } finally { setBusy('') }
  }
  const selectedCount = fields.filter(field => field.include && hasValue(field.value) && !['same', 'ambiguous', 'invalid'].includes(field.status)).length
  const groups = [...new Set(fields.map(field => field.group))]
  const matchedCount = fields.filter(field => field.status === 'same').length
  const varianceCount = fields.filter(field => field.status === 'variance').length
  const newCount = fields.filter(field => field.status === 'new').length
  const invalidCount = fields.filter(field => field.status === 'invalid').length
  const ambiguousCount = reviewRecords.filter(item => !item.choice).length
  const reviewedCount = documents.filter(doc => ['reviewed', 'verified'].includes(doc.status)).length
  return <Layout><div className="mx-auto max-w-[1220px] px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
    <header className="mb-9 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-[#225feb]">YOUR DOCUMENT WORKSPACE</p><h1 className="text-4xl font-semibold tracking-[-0.045em] text-[#10264c] sm:text-5xl">Less typing.<br /><span className="text-[#225feb]">More of your story.</span></h1><p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">Upload your records. Extract the essentials. Review once, then reuse your details across your applications.</p></div><Link to="/profile" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-xs font-semibold text-[#10264c] hover:border-blue-200 hover:text-[#225feb]">View your profile <ArrowUpRight size={15} /></Link></header>
    <div className="mb-8 grid gap-3 sm:grid-cols-3">{[{ number: '1', title: 'Upload securely', text: 'PDF, JPG, PNG or WebP · up to 10 MB' }, { number: '2', title: 'Extract & check', text: 'Review each detail beside your original' }, { number: '3', title: 'Make it reusable', text: 'Only approved details reach your profile' }].map(({ number, title, text }) => <div key={number} className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-semibold text-[#225feb]">{number}</span><div><h2 className="text-xs font-semibold text-[#10264c]">{title}</h2><p className="mt-1 text-[10px] leading-4 text-slate-500">{text}</p></div></div>)}</div>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0"><section className="rounded-[28px] border border-slate-200/80 bg-white p-5 sm:p-7"><div className="mb-6 flex items-center justify-between"><h2 className="text-lg font-semibold tracking-tight text-[#10264c]">Add a document</h2><FolderLock size={20} className="text-[#225feb]" /></div><label className="mb-2 block text-xs font-semibold text-[#10264c]" htmlFor="document-type">Document type</label><div className="relative mb-5"><select id="document-type" value={type} disabled={busy === 'upload'} onChange={e => setType(e.target.value)} className={`${inputClass} appearance-none pr-10`}>{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-4 top-3.5 text-slate-400" /></div>{IDENTITY_DOCUMENT_TYPES.includes(type) && <p className="mb-4 rounded-xl bg-blue-50 p-3 text-[11px] leading-5 text-slate-600">ID proof is optional. Use a masked or redacted copy; full Aadhaar numbers are not needed. We import only printed common facts, never identification numbers.</p>}<div onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={e => { e.preventDefault(); setDragging(false) }} onDrop={e => { e.preventDefault(); setDragging(false); if (busy !== 'upload') chooseFile(e.dataTransfer.files?.[0]) }} className={`rounded-2xl border-2 border-dashed p-7 text-center transition sm:p-10 ${dragging ? 'border-[#225feb] bg-blue-50' : 'border-slate-200 bg-[#fafbfe]'}`}><span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-white text-[#225feb] shadow-sm"><Upload size={23} /></span><h3 className="text-sm font-semibold text-[#10264c]">Drop your document here</h3><p className="mt-2 text-xs leading-5 text-slate-500">A clear, complete copy works best.<br />PDF, JPG, PNG or WebP · maximum 10 MB</p><input ref={input} id="admissions-file" type="file" accept={type === 'photo' ? 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp' : 'application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp'} className="sr-only" onChange={e => { if (e.target.files?.[0]) chooseFile(e.target.files[0]) }} disabled={busy === 'upload'} /><button type="button" onClick={() => input.current?.click()} disabled={busy === 'upload'} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#10264c] px-5 py-3 text-xs font-semibold text-white hover:bg-[#193b72] disabled:opacity-50">Choose a file <ArrowRight size={14} /></button></div>{file && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><div className="flex min-w-0 items-center gap-3"><FileText size={20} className="shrink-0 text-[#225feb]" /><div className="min-w-0"><p className="max-w-[220px] truncate text-xs font-semibold text-[#10264c]">{file.name}</p><p className="mt-1 text-[10px] text-slate-500">{formatSize(file.size)} · Ready to upload</p></div></div><div className="flex items-center gap-2"><button type="button" disabled={busy === 'upload'} onClick={() => { setFile(null); if (input.current) input.current.value = '' }} aria-label="Clear selected file" className="rounded-lg p-2 text-slate-400 hover:text-slate-600 disabled:opacity-40"><X size={16} /></button><button type="button" disabled={Boolean(busy)} onClick={upload} className="inline-flex items-center gap-2 rounded-full bg-[#225feb] px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busy === 'upload' ? <LoaderCircle size={14} className="animate-spin" /> : <Upload size={14} />}{busy === 'upload' ? 'Uploading…' : 'Upload securely'}</button></div></div>}<p className="mt-4 flex items-start gap-2 text-[10px] leading-5 text-slate-400"><ShieldCheck size={14} className="mt-0.5 shrink-0" /> Files are stored privately. Extraction requires your approval to send the selected document to OpenAI GPT. You review its suggestions before adding any details to your profile.</p></section>
      {error && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs leading-6 text-red-700"><div className="flex items-start gap-2"><CircleAlert size={16} className="mt-1 shrink-0" /><div>{error}<p className="mt-1">Your selected file and unsaved review remain available. Try again when the connection is ready.</p></div></div></div>}
      {notice && <div role="status" className="mt-5 flex items-start gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs leading-6 text-emerald-700"><CheckCircle2 size={17} className="mt-1 shrink-0" />{notice}</div>}
      <section className="mt-6 rounded-[28px] border border-slate-200/80 bg-white p-5 sm:p-7"><div className="mb-6 flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold tracking-tight text-[#10264c]">Your document library</h2><p className="mt-1 text-[11px] text-slate-500">{documents.length} uploaded · {reviewedCount} reviewed</p></div><button type="button" disabled={Boolean(busy) || loading} onClick={reload} aria-label="Refresh document library" className="rounded-full border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button></div>{documents.length > 0 && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4"><label className="flex items-center gap-2 text-xs font-semibold text-[#10264c]"><input type="checkbox" checked={documents.every(document => selectedDocuments.includes(document.id))} disabled={Boolean(busy)} onChange={event => setSelectedDocuments(event.target.checked ? documents.map(document => document.id) : [])} className="h-4 w-4 accent-[#225feb]"/> Select all uploaded documents</label><button type="button" disabled={Boolean(busy) || !selectedDocuments.length} onClick={openBatch} className="inline-flex items-center gap-2 rounded-full bg-[#225feb] px-4 py-2.5 text-[11px] font-semibold text-white disabled:opacity-40"><ScanLine size={14}/>Extract selected & autofill ({selectedDocuments.filter(id => documents.some(document => document.id === id)).length})</button><p className="w-full text-[10px] leading-5 text-slate-500">Selecting files gives no processing permission. Review the named-file approval before a batch begins.</p></div>}{loading ? <div role="status" className="flex items-center justify-center gap-2 py-14 text-xs text-slate-500"><LoaderCircle size={16} className="animate-spin text-[#225feb]" /> Loading your documents…</div> : !documents.length ? <div className="rounded-2xl bg-[#f8faff] px-5 py-12 text-center"><FolderLock size={30} className="mx-auto mb-3 text-blue-300" /><h3 className="text-sm font-medium text-[#10264c]">A place for your next chapter.</h3><p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-slate-500">Your uploads will appear here, ready to review and reuse.</p></div> : <div className="divide-y divide-slate-100">{documents.map(doc => { const [status, color] = statusInfo(doc.status); const isExtracting = busy === `extract:${doc.id}`; const isDeleting = busy === `delete:${doc.id}`; return <div key={doc.id} className="py-5 first:pt-0 last:pb-0"><div className="flex min-w-0 items-start gap-3"><input type="checkbox" aria-label={`Select ${doc.file_name}`} checked={selectedDocuments.includes(doc.id)} disabled={Boolean(busy)} onChange={event => setSelectedDocuments(previous => event.target.checked ? [...new Set([...previous, doc.id])] : previous.filter(id => id !== doc.id))} className="mt-3 h-4 w-4 shrink-0 accent-[#225feb]"/><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f4f7fd] text-[#225feb]">{doc.mime_type?.startsWith('image/') ? <Image size={20} /> : <FileText size={20} />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h3 className="break-all text-xs font-semibold leading-5 text-[#10264c]">{doc.file_name || doc.name || 'Document'}</h3><p className="mt-1 text-[10px] leading-5 text-slate-500">{TYPE_LABEL[doc.document_type] || 'Document'} · {formatSize(doc.size_bytes)}{doc.created_at && ` · ${new Date(doc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-semibold ${color}`}>{status}</span></div><div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">{doc.extracted_data && Object.keys(doc.extracted_data).length > 0 ? <button type="button" disabled={Boolean(busy)} onClick={() => openReview(doc)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#225feb] disabled:opacity-40"><Eye size={14} /> Review extracted details</button> : <button type="button" disabled={Boolean(busy) || doc.document_type === 'photo' || !openaiConsents[doc.id]} onClick={() => extract(doc)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#225feb] disabled:opacity-40">{isExtracting ? <LoaderCircle size={14} className="animate-spin" /> : <ScanLine size={14} />}{isExtracting ? 'Extracting with GPT…' : 'Extract with GPT'}</button>}{doc.document_type === 'photo' && IMAGE_MIME_TYPES.includes(doc.mime_type) && <button type="button" disabled={Boolean(busy)} onClick={() => { setPhotoError(''); setPhotoToAssign(doc) }} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#225feb] disabled:opacity-40"><Image size={14}/>Use as profile photo</button>}{doc.signed_url && <a href={doc.signed_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-[#225feb]"><ArrowDownToLine size={13} /> Open original</a>}<button type="button" disabled={Boolean(busy)} onClick={() => setRemoveId(removeId === doc.id ? null : doc.id)} className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-red-600 disabled:opacity-40"><Trash2 size={13} /> Remove</button>{doc.extracted_data && <button type="button" disabled={Boolean(busy) || !openaiConsents[doc.id]} onClick={() => extract(doc)} className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-[#225feb] disabled:opacity-40">{isExtracting ? <LoaderCircle size={13} className="animate-spin" /> : <RefreshCw size={13} />} Extract again with GPT</button>}</div>{doc.document_type !== 'photo' && <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-[#fafbfe] p-3.5"><input type="checkbox" checked={Boolean(openaiConsents[doc.id])} disabled={Boolean(busy)} onChange={event => setOpenaiConsents(previous => ({ ...previous, [doc.id]: event.target.checked }))} className="mt-0.5 h-4 w-4 shrink-0 accent-[#225feb]" /><span className="text-[10px] leading-5 text-slate-500"><span className="block font-semibold text-[#10264c]">Send this document to OpenAI GPT to extract suggested fields.</span>A copy of this file will be processed by OpenAI. Review the suggested fields before adding them to your profile. <Link to="/privacy" target="_blank" className="font-semibold text-[#225feb] hover:underline">Read the Privacy Policy ↗</Link></span></label>}{doc.document_type === 'photo' && <p className="mt-2 text-[10px] leading-5 text-slate-400">Use this private photo directly with “Use as profile photo”, or select it for batch autofill. Photos are never sent for text extraction.</p>}{(doc.extraction_error || doc.error_message) && <p className="mt-3 text-[11px] leading-5 text-red-600">{doc.extraction_error || doc.error_message}</p>}{removeId === doc.id && <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3"><p className="text-[11px] leading-5 text-red-700">Remove this document and its extraction record? Details already saved to your profile will remain.</p><div className="mt-3 flex gap-3"><button type="button" onClick={() => remove(doc)} disabled={Boolean(busy)} className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-40">{isDeleting && <LoaderCircle size={12} className="animate-spin" />}{isDeleting ? 'Removing…' : 'Remove document'}</button><button type="button" disabled={Boolean(busy)} onClick={() => setRemoveId(null)} className="text-[10px] font-medium text-slate-500">Keep it</button></div></div>}</div></div></div> })}</div>}</section></div>
      <aside className="space-y-5 lg:sticky lg:top-28"><div className="relative overflow-hidden rounded-[28px] bg-[#10264c] p-6 text-white"><div className="absolute -right-7 -top-8 h-36 w-36 rounded-full border border-white/10" /><div className="absolute -right-1 -top-2 h-24 w-24 rounded-full border border-white/10" /><span className="mb-10 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 text-blue-200"><ScanLine size={22} /></span><h2 className="relative text-2xl font-semibold leading-tight tracking-tight">Your details.<br />Connected.</h2><p className="mt-4 text-xs leading-6 text-blue-100/70">Turn mark sheets, exam scores and work records into a profile you can reuse. You stay in control of every field.</p><div className="mt-6 space-y-3 border-t border-white/10 pt-5">{['No automatic profile overwrites', 'Every extraction needs your review', 'Private storage linked to your account'].map(text => <p key={text} className="flex items-center gap-2 text-[10px] text-blue-100/80"><Check size={12} className="text-blue-300" />{text}</p>)}</div></div><div className="rounded-2xl border border-slate-200/80 bg-white p-5"><h3 className="text-xs font-semibold text-[#10264c]">Get the best extraction</h3><ul className="mt-4 space-y-3 text-[11px] leading-5 text-slate-500"><li>Keep the whole page visible, with readable text and no glare.</li><li>Choose the matching document type before uploading.</li><li>Use one record per file. Verify dates, scores, units and names carefully.</li></ul><Link to="/profile" className="mt-5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#225feb]">Prefer to enter details yourself? <ArrowUpRight size={13} /></Link></div></aside>
    </div>
    {reviewDoc && <section ref={reviewPanel} className="mt-8 scroll-mt-24 rounded-[28px] border border-blue-200 bg-white p-5 shadow-[0_20px_80px_-50px_rgba(34,95,235,0.3)] sm:p-8"><div className="mb-6 flex items-start justify-between gap-4"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#225feb]">REVIEW BEFORE REUSE</p><h2 className="text-2xl font-semibold tracking-tight text-[#10264c]">A quick check. A confident next step.</h2><p className="mt-2 break-all text-xs text-slate-500">{reviewDoc.file_name || 'Your document'}{reviewDoc.signed_url && <a href={reviewDoc.signed_url} target="_blank" rel="noreferrer" className="ml-3 inline-flex items-center gap-1 font-semibold text-[#225feb]">Open original <ArrowUpRight size={12} /></a>}</p></div><button type="button" disabled={Boolean(busy)} onClick={() => setReviewDoc(null)} aria-label="Close document review" className="rounded-full border border-slate-200 p-2.5 text-slate-500 disabled:opacity-40"><X size={16} /></button></div><div className="mb-6 flex items-start gap-3 rounded-2xl bg-amber-50 p-4"><CircleAlert size={18} className="mt-0.5 shrink-0 text-amber-600" /><p className="text-xs leading-6 text-amber-800">Extraction can make mistakes. Compare every selected detail with your original. Empty fields are selected for autofill. Matching values are already recorded. Different values are flagged below and stay unchanged unless you explicitly select a replacement.</p></div>{fields.length ? <form noValidate onSubmit={saveReview}><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">{fields.length} details · {newCount} empty fields · {matchedCount} matching · {varianceCount} variances · {selectedCount} selected{invalidCount > 0 ? ` · ${invalidCount} need correction` : ''}{ambiguousCount > 0 ? ` · ${ambiguousCount} records need a target` : ''}</p><div className="flex gap-4"><button type="button" disabled={profileApplied || Boolean(busy)} onClick={() => { setFields(previous => previous.map(field => updateAdmissionsDocumentField(field, { include: field.status === 'new' }))); setConfirmed(false) }} className="text-[11px] font-semibold text-[#225feb] disabled:opacity-40">Select empty profile fields</button><button type="button" disabled={profileApplied || Boolean(busy)} onClick={() => { setFields(previous => previous.map(field => updateAdmissionsDocumentField(field, { include: false }))); setConfirmed(false) }} className="text-[11px] text-slate-500 disabled:opacity-40">Clear selection</button></div></div>{skippedDuplicates.length > 0 && <p className="mb-5 rounded-xl bg-blue-50 p-3 text-[11px] leading-5 text-[#225feb]">{skippedDuplicates.length} repeated extracted record{skippedDuplicates.length === 1 ? ' was' : 's were'} combined. No duplicate record will be added automatically.</p>}{ambiguousCount > 0 && <p className="mb-5 rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">Choose a target to autofill an ambiguous record. Records without a target will remain outside your profile; you can save this review without applying them.</p>}<fieldset disabled={Boolean(busy) || profileApplied} className="space-y-6 disabled:opacity-70">{groups.map(group => <div key={group} className="overflow-hidden rounded-2xl border border-slate-200"><div className="border-b border-slate-100 bg-[#f8faff] px-5 py-3"><h3 className="text-xs font-semibold text-[#10264c]">{group}</h3>{reviewRecords.filter(item => item.group === group).map(item => <div key={item.id} className="mt-3"><label className="block text-[10px] font-medium text-slate-500">Add these details to<select aria-label={`Target for ${group}`} value={item.choice} onChange={event => chooseReviewTarget(item.id, event.target.value)} className={`${inputClass} mt-1.5`}><option value="">Choose the correct record</option>{item.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>{item.reason && <p className="mt-2 text-[10px] leading-5 text-amber-700">{item.reason}</p>}</div>)}</div><div className="divide-y divide-slate-100">{fields.filter(field => field.group === group).map(field => <div key={field.id} className={`grid gap-3 px-4 py-4 sm:grid-cols-[minmax(140px,1fr)_minmax(180px,1.4fr)] sm:gap-5 ${field.include ? 'bg-blue-50/20' : ''}`}><label className="flex items-start gap-3"><input type="checkbox" disabled={['same', 'ambiguous', 'invalid'].includes(field.status)} checked={field.include} onChange={e => changeField(field.id, { include: e.target.checked })} className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[#225feb]" /><span><span className="block text-xs font-medium text-[#10264c]">{field.label}</span><span className={`mt-1.5 block text-[10px] leading-5 ${field.status === 'variance' || field.status === 'ambiguous' ? 'text-amber-700' : field.status === 'same' ? 'text-emerald-700' : field.status === 'invalid' ? 'text-red-600' : 'text-slate-400'}`}>{field.status === 'variance' ? `Variance · ${field.reason}` : field.status === 'same' ? 'Already recorded' : field.status === 'new' ? 'Empty profile field · ready to autofill' : field.reason}</span></span></label><div>{hasValue(field.current) && <div className="mb-2 rounded-lg bg-slate-50 px-3 py-2 text-[10px] leading-5 text-slate-600"><span className="mr-1 font-semibold">Saved:</span>{String(field.current)}</div>}<label className="mb-1 block text-[9px] uppercase tracking-wider text-slate-400">Extracted suggestion</label>{field.key === 'current' ? <select disabled={field.status === 'ambiguous'} aria-label={`Review ${field.group} ${field.label}`} value={field.value === true || field.value === 'true' ? 'true' : 'false'} onChange={e => changeField(field.id, { value: e.target.value === 'true' })} className={inputClass}><option value="true">Yes</option><option value="false">No</option></select> : <input disabled={field.status === 'ambiguous'} aria-label={`Review ${field.group} ${field.label}`} type={NUMBERS.has(field.key) || field.path.includes('section_scores') ? 'number' : field.key.includes('date') ? ['start_date', 'end_date'].includes(field.key) && /^\d{4}-\d{2}$/.test(field.value) ? 'month' : 'date' : field.key === 'email' ? 'email' : 'text'} min={NUMBERS.has(field.key) || field.path.includes('section_scores') ? 0 : undefined} max={field.key.includes('date') ? new Date().toISOString().slice(0, ['start_date', 'end_date'].includes(field.key) && /^\d{4}-\d{2}$/.test(field.value) ? 7 : 10) : field.key === 'percentage' || field.key === 'percentile' ? 100 : field.key === 'cgpa' ? 20 : field.key === 'cgpa_scale' ? 100 : field.key === 'months' || field.key === 'total_work_experience_months' ? 720 : undefined} step="any" value={field.value} onChange={e => changeField(field.id, { value: e.target.value })} className={inputClass} />}</div></div>)}</div></div>)}</fieldset><label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-5"><input type="checkbox" checked={confirmed} disabled={Boolean(busy) || profileApplied} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#225feb]" /><span className="text-xs leading-6 text-[#10264c]">I have checked these details against my original document. I approve autofilling the selected fields and any replacements I have explicitly chosen.</span></label>{reviewError && <div role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-xs leading-6 text-red-700"><p>{reviewError}</p>{!profileApplied && <button type="button" disabled={Boolean(busy)} onClick={() => openReview(reviewDoc)} className="mt-2 text-[11px] font-semibold underline">Recheck against the latest profile (resets review edits)</button>}</div>}<div className="mt-6 flex flex-wrap items-center justify-between gap-4"><p className="max-w-lg text-[11px] leading-5 text-slate-500">Checked fields autofill your profile after approval. Matching fields are recorded as reviewed. Unselected variances remain unchanged.</p><button type="submit" disabled={Boolean(busy) || !confirmed} className="inline-flex items-center gap-2 rounded-full bg-[#225feb] px-6 py-3.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">{busy === `review:${reviewDoc.id}` ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}{busy === `review:${reviewDoc.id}` ? 'Saving reviewed details…' : profileApplied ? 'Retry recording review' : selectedCount ? 'Approve & autofill profile' : 'Save reviewed details'}</button></div></form> : <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6"><h3 className="text-sm font-semibold text-[#10264c]">No supported profile fields were detected.</h3><p className="mt-2 max-w-2xl text-xs leading-6 text-slate-500">Try a clearer copy and check the document type, or enter the details directly in your profile. Your original file remains in your document library.</p><Link to="/profile" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#225feb]">Enter profile details <ArrowRight size={14} /></Link></div>}</section>}
  </div>{batchOpen && <ModalPortal><BatchApproval documents={batchDocuments} reextract={batchReextract} onReextract={value => { setBatchReextract(value); setBatchProcessingApproved(false) }} processingApproved={batchProcessingApproved} onProcessingApproval={setBatchProcessingApproved} autofillApproved={batchAutofillApproved} onAutofillApproval={setBatchAutofillApproved} photoChoice={batchPhoto} onPhotoChoice={setBatchPhoto} progress={batchProgress} busy={Boolean(busy)} error={batchError} onStart={startBatch} onClose={() => { setBatchOpen(false); setBatchProcessingApproved(false); setBatchAutofillApproved(false) }}/></ModalPortal>} {batchSummary && <ModalPortal><BatchCompletion summary={batchSummary} busy={Boolean(busy)} onRetrySave={retryBatchSave} onClose={() => setBatchSummary(null)}/></ModalPortal>}{photoToAssign && <ModalPortal><PhotoApproval document={photoToAssign} busy={Boolean(busy)} error={photoError} onSave={assignProfilePhoto} onClose={() => setPhotoToAssign(null)}/></ModalPortal>}</Layout>
}
