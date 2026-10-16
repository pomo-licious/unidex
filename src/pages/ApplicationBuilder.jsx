import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, CheckCircle2, Download, FileCheck2, GraduationCap, Info, LoaderCircle, Plus, Save, ShieldCheck } from 'lucide-react'
import Layout from '../components/Layout'
import AdmissionsProfileForm from '../components/AdmissionsProfileForm'
import { useAdmissions } from '../context/AdmissionsContext'
import { recoverAdmissionsSubmission, submitAdmissionsApplication } from '../lib/admissionsApi'
import { getProfileProgress, normalizeAdmissionsProfile, validateAdmissionsProfile } from '../lib/admissionsProfile'
import { DELHI_NCR_COLLEGES } from '../data/delhiNcrColleges'
import { answerKey, deadlineFor, specificFields, validateCollegeAnswers } from '../lib/admissionsApplication'
import { mergeDraftProfile } from '../lib/admissionsDraft'

const INPUT = 'min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-[#10264c] outline-none transition focus:border-[#225feb] focus:ring-4 focus:ring-blue-50'
const STEPS = ['Your common details', 'College-specific details', 'Review & submit']
const safeUrl = value => { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null } catch { return null } }
const programmeName = college => college.selectedProgrammeName || college.selected_programme?.name || college.programme || college.programmeNames?.[0] || 'Programme to confirm'
const fmtDate = value => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(new Date(`${value.slice(0, 10)}T12:00:00+05:30`)) : 'Confirm with the institution'

function snapshotFor(plan) {
  const current = DELHI_NCR_COLLEGES.find(college => college.id === plan.college_id)
  return { ...current, ...plan.college_snapshot, id: plan.college_id }
}
const optionValue = option => typeof option === 'string' ? option : option.value
const optionLabel = option => typeof option === 'string' ? option : option.label

function ProgrammeField({ field, value, onChange, disabled }) {
  const required = Boolean(field.required && field.sourceUrl)
  const label = `${field.label}${required ? ' *' : ' (optional)'}`
  const help = <>{field.help && <span className="mt-1.5 block text-[11px] leading-5 text-slate-500">{field.help}</span>}{safeUrl(field.sourceUrl) && <a className="mt-1.5 inline-block text-[11px] text-[#225feb]" href={field.sourceUrl} target="_blank" rel="noreferrer">Requirement source ↗</a>}</>
  if (field.type === 'multiselect') return <fieldset className="sm:col-span-2"><legend className="mb-3 text-xs font-semibold">{label}</legend><div className="grid gap-2 sm:grid-cols-2">{(field.options || []).map(option => {
    const key = optionValue(option), values = Array.isArray(value) ? value : []
    return <label key={key} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-xs leading-6"><input type="checkbox" checked={values.includes(key)} disabled={disabled} onChange={event => onChange(event.target.checked ? [...values, key] : values.filter(item => item !== key))} className="mt-1 h-4 w-4 accent-[#225feb]"/><span>{optionLabel(option)}</span></label>
  })}</div>{help}</fieldset>
  if (field.type === 'checkbox') return <label className="block"><span className="flex items-start gap-3 text-xs leading-6"><input type="checkbox" checked={value === true} onChange={event => onChange(event.target.checked)} disabled={disabled} required={required} className="mt-1 h-4 w-4 accent-[#225feb]"/>{label}</span>{help}</label>
  return <label className={`block ${field.type === 'textarea' ? 'sm:col-span-2' : ''}`}><span className="mb-2 block text-xs font-semibold">{label}</span>{field.type === 'select' && field.options ? <select value={value ?? ''} onChange={event => onChange(event.target.value)} disabled={disabled} required={required} className={INPUT}><option value="">Choose an option</option>{field.options.map(option => <option key={optionValue(option)} value={optionValue(option)}>{optionLabel(option)}</option>)}</select> : field.type === 'textarea' ? <textarea value={value ?? ''} onChange={event => onChange(event.target.value)} disabled={disabled} required={required} rows={4} maxLength={10000} className={INPUT}/> : <input type={['number', 'date', 'email', 'tel'].includes(field.type) ? field.type : 'text'} value={value ?? ''} onChange={event => onChange(event.target.value)} disabled={disabled} required={required} maxLength={2000} className={INPUT}/>}{help}</label>
}

function CollegeFields({ college, index, answers, onChange, disabled }) {
  const fields = specificFields(college)
  const deadline = deadlineFor(college)
  const [open, setOpen] = useState(true)
  const applicationUrl = safeUrl(college.applicationUrl || college.website)
  return <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
    <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} className="flex w-full items-start gap-4 bg-[#f7f9fd] p-5 text-left sm:p-7"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#10264c] text-sm font-semibold text-white">{index < 26 ? String.fromCharCode(65 + index) : index + 1}</span><span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold uppercase tracking-[.16em] text-[#225feb]">College-specific details</span><span className="mt-1.5 block text-lg font-semibold tracking-tight text-[#10264c]">{college.name}</span><span className="mt-2 block text-xs leading-5 text-slate-500">{programmeName(college)}</span></span><span className="mt-3 text-slate-400">{open ? '−' : '+'}</span></button>
    {open && <div className="space-y-6 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs"><div><p className="font-semibold text-[#10264c]">{deadline.date ? `Published deadline · ${fmtDate(deadline.date)}` : 'Current deadline needs confirmation'}</p><p className="mt-1.5 text-slate-500">{deadline.date ? 'Check the official portal before taking your next step.' : 'A date has not been verified for the current cycle.'}</p></div>{applicationUrl && <a href={applicationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-[#225feb]">Official application page<ArrowUpRight className="h-3.5 w-3.5" /></a>}</div>
      {fields.length > 0 ? <div className="grid gap-5 sm:grid-cols-2">{fields.map(field => <ProgrammeField key={field.key} field={field} value={answers[field.key]} onChange={value => onChange(field.key, value)} disabled={disabled}/>)}</div> : <p className="rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-500">We have not yet verified a separate question set for this programme. Add preparation notes below and confirm the final requirements on the institution’s official portal.</p>}
      <label className="block"><span className="mb-2 block text-xs font-semibold">Your preparation notes / statement draft (optional)</span><textarea value={answers.preparation_notes ?? ''} onChange={event => onChange('preparation_notes', event.target.value)} disabled={disabled} rows={4} maxLength={10000} placeholder="What would you like to bring into this application?" className={INPUT} /><span className="mt-1.5 block text-[11px] text-slate-500">Saved as your draft. This is not presented as an official college question.</span></label>
      <label className="flex items-start gap-3 text-xs leading-6 text-slate-500"><input type="checkbox" checked={Boolean(answers.requirements_checked)} onChange={event => onChange('requirements_checked', event.target.checked)} disabled={disabled} className="mt-1 h-4 w-4 accent-[#225feb]"/><span>I have checked the current programme requirements and deadline on the official website.</span></label>
    </div>}
  </section>
}

function ApplicationBuilderContent({ recoveredReceipt, recoveryError }) {
  const { user, profile, plans, documents, draft, loading, saving, error: workspaceError, saveProfile, saveDraft, refreshPlans } = useAdmissions()
  const [step, setStep] = useState(0)
  const [common, setCommon] = useState(() => normalizeAdmissionsProfile(mergeDraftProfile(profile, draft?.profile, draft?.profileBase), user))
  const [answers, setAnswers] = useState(() => draft?.collegeAnswers || {})
  const [requestId, setRequestId] = useState(() => draft?.requestId || crypto.randomUUID())
  const [receipt, setReceipt] = useState(() => draft?.receipt || recoveredReceipt || null)
  const [busy, setBusy] = useState(false)
  const [saveState, setSaveState] = useState('')
  const [message, setMessage] = useState('')
  const [consents, setConsents] = useState({ accuracy: false, privacy: false, internal_submission: false })
  const [accuracyVersion, setAccuracyVersion] = useState('')
  const autosaveVersion = useRef(0)
  const selected = useMemo(() => (plans || []).filter(plan => plan.is_selected).map(snapshotFor), [plans])
  const reviewVersion = JSON.stringify([common, answers, selected, documents.map(item => [item.id, item.status, item.reviewed_at])])
  const accuracyAccepted = consents.accuracy && accuracyVersion === reviewVersion
  const progress = getProfileProgress(common)
  useEffect(() => { document.title = 'Your common application · Unidex' }, [])
  useEffect(() => {
    if (receipt || busy) return
    const version = ++autosaveVersion.current
    const timer = setTimeout(() => {
      setSaveState('Saving draft…')
      saveDraft({ schema_version: 1, profile: common, profileBase: profile, collegeAnswers: answers, requestId, selectedCollegeIds: selected.map(college => college.id) })
        .then(() => { if (autosaveVersion.current === version) setSaveState('Draft saved to your account') })
        .catch(error => { if (autosaveVersion.current === version) setSaveState(error.message || 'Draft could not be saved. Your changes remain on this page.') })
    }, 1100)
    return () => { clearTimeout(timer); autosaveVersion.current += 1 }
  }, [common, profile, answers, requestId, receipt, busy, saveDraft, selected])

  function changeAnswer(collegeId, key, value) { setAnswers(current => ({ ...current, [collegeId]: { ...current[collegeId], [key]: value } })); setMessage('') }
  async function saveAndContinue() {
    setMessage('')
    const validation = validateAdmissionsProfile(common)
    if (!validation.valid) { setMessage(Object.values(validation.errors)[0]); return }
    setBusy(true)
    try { await saveProfile(common); await saveDraft({ schema_version: 1, profile: common, profileBase: common, collegeAnswers: answers, requestId, selectedCollegeIds: selected.map(college => college.id) }); setStep(1); window.scrollTo({ top: 0, behavior: 'instant' }) }
    catch (error) { setMessage(error.message || 'Your details could not be saved. Please retry.') }
    finally { setBusy(false) }
  }
  function validateSubmission() {
    const validation = validateAdmissionsProfile(common, { submission: true })
    if (!validation.valid) return Object.values(validation.errors)[0]
    if (!selected.length) return 'Select at least one college before submitting.'
    if (selected.length > 50) return 'Select up to 50 colleges for one submission.'
    const collegeValidation = validateCollegeAnswers(selected, answers)
    if (!collegeValidation.valid) return Object.values(collegeValidation.errors)[0]
    if (!accuracyAccepted || !Object.values(consents).every(Boolean)) return 'Please review and confirm all three declarations.'
    return ''
  }
  async function submit(event) {
    event.preventDefault(); setMessage('')
    const problem = validateSubmission()
    if (problem) { setMessage(problem); return }
    setBusy(true)
    const documentReferences = (documents || []).map(document => ({ id: document.id, document_type: document.document_type, file_name: document.file_name, status: document.status, reviewed_at: document.reviewed_at || null }))
    try {
      const payloadProfile = { ...common, document_references: documentReferences }
      await saveProfile(common)
      await saveDraft({ schema_version: 1, profile: common, profileBase: common, collegeAnswers: answers, requestId, selectedCollegeIds: selected.map(college => college.id) })
      const saved = await submitAdmissionsApplication({ profile: payloadProfile, colleges: selected, collegeAnswers: Object.fromEntries(selected.map(college => [answerKey(college), answers[answerKey(college)] || {}])), consents: { ...consents, accuracy: accuracyAccepted }, requestId, expectedUserId: user.id })
      setReceipt(saved)
      try { await saveDraft({ schema_version: 1, profile: common, profileBase: common, collegeAnswers: answers, requestId, receipt: saved }) } catch { /* The durable receipt already exists; do not label a completed submission failed. */ }
      await refreshPlans().catch(() => {})
      window.scrollTo({ top: 0, behavior: 'instant' })
    } catch (error) {
      const recovered = await recoverAdmissionsSubmission(requestId, user.id).catch(() => null)
      if (recovered) setReceipt(recovered)
      else setMessage(error.message || 'Submission was not confirmed. Retry with the same request; it will not create a duplicate.')
    }
    finally { setBusy(false) }
  }
  function downloadReceipt() {
    const file = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' })
    const href = URL.createObjectURL(file), link = document.createElement('a')
    link.href = href; link.download = `${receipt.receipt || 'Unidex_receipt'}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(href), 1000)
  }
  async function newDraft() {
    const nextId = crypto.randomUUID(); setBusy(true); setMessage('')
    try { await saveDraft({ schema_version: 1, profile, profileBase: profile, collegeAnswers: {}, requestId: nextId }); setReceipt(null); setAnswers({}); setCommon(normalizeAdmissionsProfile(profile, user)); setRequestId(nextId); setConsents({ accuracy: false, privacy: false, internal_submission: false }); setStep(0) }
    catch (error) { setMessage(error.message) } finally { setBusy(false) }
  }

  if (loading) return <ApplicationLoading />
  if (receipt) return <Layout><div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 lg:py-20"><div className="rounded-[32px] border border-blue-100 bg-gradient-to-b from-[#f1f5ff] to-white p-7 sm:p-12"><span className="mb-8 grid h-16 w-16 place-items-center rounded-2xl bg-[#225feb] text-white"><CheckCircle2 className="h-8 w-8"/></span><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#225feb]">Saved. Received. In your control.</p><h1 className="mt-4 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">Your application is<br/>with Unidex.</h1><p className="mt-6 text-sm leading-7 text-slate-500">Your profile, selected programmes and answers have been captured as a permanent submission record in your account. Keep the receipt below for reference.</p><div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Your submission reference</p><p className="mt-2 break-all font-mono text-sm font-semibold">{receipt.receipt}</p><p className="mt-3 text-xs text-slate-500">{receipt.college_count || receipt.colleges_snapshot?.length || selected.length} programmes · {new Date(receipt.submitted_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST</p></div><p className="mt-5 flex gap-2 text-xs leading-6 text-slate-500"><Info className="mt-1 h-4 w-4 shrink-0"/>This receipt confirms collection by Unidex. Each institution’s official submission and any application fee still need to be completed separately.</p><div className="mt-8 flex flex-wrap gap-3"><button type="button" onClick={downloadReceipt} className="inline-flex items-center gap-2 rounded-full bg-[#225feb] px-5 py-3 text-xs font-semibold text-white"><Download className="h-4 w-4"/>Download receipt</button><Link to="/tracker" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-xs font-semibold">View application tracker</Link><button type="button" onClick={newDraft} disabled={busy} className="px-4 py-3 text-xs font-semibold text-[#225feb]">Start another draft</button></div>{message && <p role="alert" className="mt-5 text-sm text-red-700">{message}</p>}</div></div></Layout>

  return <Layout><div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
    <header className="mb-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-end"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#225feb]">The Unidex common application</p><h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-.055em] sm:text-5xl lg:text-[58px]">Your details.<br/><span className="text-slate-400">Ready for what’s next.</span></h1><p className="mt-5 max-w-lg text-sm leading-7 text-slate-500">One set of common details. A considered space for each programme. Review everything before you submit to Unidex.</p></div><div className="flex gap-3"><div className="rounded-2xl border border-slate-200 bg-white px-5 py-4"><p className="text-2xl font-semibold tracking-tight">{selected.length}</p><p className="mt-1 text-[10px] text-slate-500">Selected colleges</p></div><div className="rounded-2xl bg-[#edf3ff] px-5 py-4"><p className="text-2xl font-semibold tracking-tight text-[#225feb]">{progress.score}%</p><p className="mt-1 text-[10px] text-slate-500">Profile complete</p></div></div></header>
    <nav aria-label="Application steps" className="mb-6 grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">{STEPS.map((label, index) => <button key={label} type="button" onClick={() => { setStep(index); setMessage('') }} aria-current={step === index ? 'step' : undefined} className={`flex flex-col items-center justify-center gap-2 px-2 py-4 text-center text-[10px] font-medium transition sm:flex-row sm:gap-3 sm:text-xs ${step === index ? 'bg-[#225feb] text-white' : 'text-slate-500 hover:bg-slate-50'}`}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] ${step === index ? 'border-white/40' : 'border-slate-200'}`}>{index + 1}</span>{label}</button>)}</nav>
    <div className="mb-7 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500"><span className="inline-flex items-center gap-2"><Save className="h-3.5 w-3.5"/>{saveState || 'Your draft is linked to your account'}</span><Link to="/documents" className="inline-flex items-center gap-1.5 font-semibold text-[#225feb]">Upload or review documents<ArrowUpRight className="h-3.5 w-3.5"/></Link></div>
    {(message || recoveryError || workspaceError) && <div role="alert" className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-900">{message || recoveryError || workspaceError}</div>}
    {!selected.length && <div className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-5"><p className="text-sm leading-6 text-slate-600">Your common details can be prepared now. Select colleges to build their individual sections.</p><Link to="/colleges" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-[#225feb]"><Plus className="h-4 w-4"/>Explore colleges</Link></div>}
    {step === 0 && <section className="rounded-[24px] border border-slate-200 bg-white p-5 sm:p-8"><div className="mb-8 flex items-start gap-4 border-b border-slate-100 pb-7"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#edf3ff] text-[#225feb]"><FileCheck2 className="h-5 w-5"/></span><div><h2 className="text-xl font-semibold tracking-tight">The common fields.</h2><p className="mt-2 text-xs leading-6 text-slate-500">These details are reused across the programmes you select. Reviewed OCR fields appear here after you approve and save them.</p></div></div><AdmissionsProfileForm value={common} onChange={setCommon} section="all" disabled={busy || saving}/><div className="mt-9 flex justify-end border-t border-slate-100 pt-6"><button type="button" onClick={saveAndContinue} disabled={busy || saving} className="inline-flex items-center gap-3 rounded-full bg-[#225feb] px-6 py-3.5 text-sm font-medium text-white disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin"/> : null}Save & continue<ArrowRight className="h-4 w-4"/></button></div></section>}
    {step === 1 && <div><div className="mb-6 flex items-center justify-between gap-4"><h2 className="text-xl font-semibold tracking-tight">A little more detail.<br/><span className="font-normal text-slate-400">For each programme.</span></h2><Link to="/colleges?tab=selected" className="text-xs font-semibold text-[#225feb]">Change selection ↗</Link></div><div className="space-y-5">{selected.map((college, index) => <CollegeFields key={`${college.id}-${college.selectedProgrammeId || college.programme_key || ''}`} college={college} index={index} answers={answers[answerKey(college)] || {}} onChange={(key, value) => changeAnswer(answerKey(college), key, value)} disabled={busy}/>)}</div><div className="mt-8 flex justify-between"><button type="button" onClick={() => setStep(0)} className="inline-flex items-center gap-2 px-2 py-3 text-sm text-slate-500"><ArrowLeft className="h-4 w-4"/>Common details</button><button type="button" onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'instant' }) }} className="inline-flex items-center gap-3 rounded-full bg-[#225feb] px-6 py-3.5 text-sm font-medium text-white">Review application<ArrowRight className="h-4 w-4"/></button></div></div>}
    {step === 2 && <form onSubmit={submit} className="space-y-6"><section className="rounded-[24px] border border-slate-200 bg-white p-6 sm:p-8"><div className="mb-7 flex items-center justify-between gap-4"><h2 className="text-xl font-semibold tracking-tight">One final look.</h2><button type="button" onClick={() => setStep(0)} className="text-xs font-semibold text-[#225feb]">Edit common details</button></div><dl className="grid gap-x-8 gap-y-5 text-sm sm:grid-cols-2">{[['Applicant', common.full_name || 'Add your name'], ['Contact', common.email || 'Add your email'], ['Phone', common.phone || 'Add your phone'], ['Location', common.current_city || 'Add your city'], ['Graduation', common.academic_graduation?.degree || 'Add your degree'], ['Documents', `${documents.length} uploaded · ${documents.filter(document => document.status === 'reviewed').length} reviewed`]].map(([label, value]) => <div key={label}><dt className="text-[10px] uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-1.5 break-words font-medium">{value}</dd></div>)}</dl><div className="mt-8 border-t border-slate-100 pt-6"><h3 className="mb-4 text-xs font-semibold">Selected programmes</h3><div className="space-y-3">{selected.map(college => <div key={college.id} className="flex items-start gap-3 rounded-xl bg-[#f7f9fd] p-4"><GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-[#225feb]"/><div className="min-w-0"><p className="text-sm font-semibold">{college.name}</p><p className="mt-1.5 text-xs leading-5 text-slate-500">{programmeName(college)}</p><p className="mt-1 text-[11px] text-slate-400">Deadline: {fmtDate(deadlineFor(college).date)}</p></div></div>)}</div></div></section><section className="rounded-[24px] border border-slate-200 bg-white p-6 sm:p-8"><div className="mb-6 flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-[#225feb]"/><h2 className="text-lg font-semibold tracking-tight">Your review comes first.</h2></div>{[['accuracy', 'I have reviewed my common details, college-specific answers and extracted document fields, and confirm that the information is accurate.'], ['privacy', 'I consent to Unidex storing this profile, my document references and application answers as described in the Privacy Policy.'], ['internal_submission', 'I understand this submits my information to Unidex. It does not submit or pay for an application on a college portal.']].map(([key, label]) => <label key={key} className="mb-5 flex items-start gap-3 text-xs leading-6 text-slate-600"><input required type="checkbox" checked={key === 'accuracy' ? accuracyAccepted : consents[key]} onChange={event => { setConsents(current => ({ ...current, [key]: event.target.checked })); if (key === 'accuracy') setAccuracyVersion(reviewVersion) }} disabled={busy} className="mt-1 h-4 w-4 shrink-0 accent-[#225feb]"/><span>{label}{key === 'privacy' && <> <Link to="/privacy" target="_blank" className="font-semibold text-[#225feb]">Read the policy ↗</Link></>}</span></label>)}<div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6"><p className="max-w-sm text-[11px] leading-6 text-slate-500">A successful submission returns a receipt from the database. Your draft stays available if a request fails.</p><button type="submit" disabled={busy || !selected.length} className="inline-flex items-center gap-3 rounded-full bg-[#225feb] px-7 py-3.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4"/>}{busy ? 'Capturing your submission…' : 'Submit to Unidex'}</button></div></section></form>}
  </div></Layout>
}

function ApplicationLoading() {
  return <Layout><div role="status" className="grid min-h-[60vh] place-items-center text-sm text-slate-500"><span className="flex items-center gap-3"><LoaderCircle className="h-5 w-5 animate-spin"/>Opening your common application…</span></div></Layout>
}

export default function ApplicationBuilder() {
  const { loading, user, draft } = useAdmissions()
  const [recovery, setRecovery] = useState({ requestId: null, receipt: null, error: '' })
  const requestId = draft?.receipt ? null : draft?.requestId
  useEffect(() => {
    if (loading || !requestId || !user?.id) return
    let active = true
    recoverAdmissionsSubmission(requestId, user.id)
      .then(receipt => { if (active) setRecovery({ requestId, receipt, error: '' }) })
      .catch(error => { if (active) setRecovery({ requestId, receipt: null, error: `Could not check an earlier submission: ${error.message}. Retry before submitting again.` }) })
    return () => { active = false }
  }, [loading, requestId, user?.id])
  if (loading || (requestId && recovery.requestId !== requestId)) return <ApplicationLoading />
  return <ApplicationBuilderContent key={user?.id} recoveredReceipt={recovery.receipt} recoveryError={recovery.error} />
}
