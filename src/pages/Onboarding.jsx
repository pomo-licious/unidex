import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, FileCheck2, Files, GraduationCap, LoaderCircle, Pencil, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import SetupShell from '../components/SetupShell'
import ReviewedProfileEditor from '../components/ReviewedProfileEditor'
import { useAdmissions } from '../context/AdmissionsContext'
import { loadAdmissionsProfileRecord } from '../lib/admissionsApi'
import { getAiImportedFields, profileFingerprint } from '../lib/admissionsAiReview'
import { SETUP_STEPS, getProfileSetupStep, withProfileSetup } from '../lib/admissionsOnboarding'
import { formatInr, hasProfileValue, normalizeAdmissionsProfile, validateAdmissionsProfile } from '../lib/admissionsProfile'
import { getProfileSectionForPath } from '../lib/admissionsProfileSections'

const details = ['personal', 'academics', 'exams', 'work', 'preferences']
const primary = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#225feb] px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60'
const secondary = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60'
const card = 'rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_8px_45px_-30px_rgba(16,38,76,0.2)] sm:p-9'

function marks(record) {
  if (hasProfileValue(record?.percentage)) return `${record.percentage}%`
  if (hasProfileValue(record?.cgpa)) return `${record.cgpa}${hasProfileValue(record.cgpa_scale) ? ` / ${record.cgpa_scale}` : ''} CGPA`
  return 'Add when available'
}

function SummaryCard({ title, step, busy, onEdit, children }) {
  return <section className="rounded-2xl border border-slate-200 p-5"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-[#10264c]">{title}</h2><button type="button" disabled={busy} onClick={() => onEdit(step)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-[#225feb] hover:bg-blue-50 disabled:opacity-60" aria-label={`Edit ${title.toLowerCase()}`}><Pencil size={12}/>Edit</button></div><div className="space-y-2 text-xs leading-6 text-slate-600">{children}</div></section>
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { user, profile, loading, saving, error, saveProfile, profileLoaded, profileUserId, profileError, retryProfile, documents, documentsLoaded, documentsUserId } = useAdmissions()
  const [viewStep, setViewStep] = useState(null)
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const active = useRef(false), lock = useRef(false)
  const step = viewStep || getProfileSetupStep(profile)
  const detailIndex = details.indexOf(step)
  const pending = busy || saving
  const ownDocuments = documentsLoaded && documentsUserId === user?.id ? documents : null
  useEffect(() => {
    document.title = 'Let’s get you started · Unidex'
    active.current = true
    return () => { active.current = false }
  }, [])

  async function saveStep(nextStep, { documentsChoice, complete = false, afterSave } = {}) {
    if (lock.current || !active.current) return
    lock.current = true; setBusy(true); setActionError('')
    try {
      const latest = await loadAdmissionsProfileRecord(user.id)
      if (!active.current) return
      const latestProfile = normalizeAdmissionsProfile(latest.profile, user)
      if (profileFingerprint(latestProfile) !== profileFingerprint(normalizeAdmissionsProfile(profile, user))) {
        await retryProfile()
        if (active.current) { setReviewed(false); setViewStep(null) }
        throw new Error('Your profile was updated in another window. We’ve loaded your latest saved step. Review it before continuing.')
      }
      const validation = validateAdmissionsProfile(latestProfile)
      if (!validation.valid) {
        const [path, message] = Object.entries(validation.errors)[0]
        setViewStep(getProfileSectionForPath(path)); setReviewed(false)
        throw new Error(`Please check this saved detail before continuing: ${message}`)
      }
      if (complete) {
        if (!reviewed) throw new Error('Please confirm that you have checked your details before finishing setup.')
        if (!latestProfile.full_name?.trim() || !latestProfile.email?.trim()) throw new Error('Add your full name and email in Personal details before finishing setup.')
      }
      const next = withProfileSetup(latestProfile, nextStep, { documentsChoice, ...(complete ? { completedAt: new Date().toISOString() } : {}) })
      const saved = await saveProfile(next, { expectedRevision: latest.revision })
      if (!saved || typeof saved !== 'object') throw new Error('Your progress was not confirmed. Please try again.')
      if (!active.current) return
      setViewStep(null); setReviewed(false)
      afterSave?.()
    } catch (err) { if (active.current) setActionError(err?.message || 'Your progress could not be saved. Please try again.') }
    finally { lock.current = false; if (active.current) setBusy(false) }
  }

  async function retry() {
    if (lock.current) return
    lock.current = true; setBusy(true); setActionError('')
    try { await retryProfile() }
    catch (err) { if (active.current) setActionError(err?.message || 'Your profile could not be loaded. Please try again.') }
    finally { lock.current = false; if (active.current) setBusy(false) }
  }

  if (loading || !profileLoaded || profileUserId !== user?.id) return <SetupShell step="welcome" title="Let’s get you started." description="We’re bringing your saved details together."><div className={`${card} flex min-h-48 flex-col items-center justify-center gap-4 text-sm text-slate-500`}>{profileError ? <><p role="alert" className="max-w-md text-center leading-6 text-red-700">{profileError}</p><button className={secondary} disabled={busy} onClick={retry}>{busy ? <LoaderCircle size={15} className="animate-spin"/> : null}Try loading again</button></> : <p role="status" className="flex items-center gap-3"><LoaderCircle size={18} className="animate-spin"/>Preparing your profile…</p>}{actionError && <p role="alert" className="text-red-700">{actionError}</p>}</div></SetupShell>

  const titles = {
    welcome: ['Let’s get you started.', 'A few clear steps, and you’re ready to explore. Start with your documents so you have less to type.'],
    documents: ['Your documents. A head start.', 'Upload your records first. We’ll help extract the details, then guide you through checking and completing your profile.'],
    personal: ['Make it yours.', 'Check the essentials, then continue through one small section at a time. Fields filled from documents remain editable.'],
    academics: ['Your education, together.', 'Review what your mark sheets filled in. Add anything that is missing, or leave it for later if you do not have it yet.'],
    exams: ['Add the results you have.', 'Scores help make college comparisons more useful. You can continue without a result and add it when it arrives.'],
    work: ['Every journey counts.', 'Working professional or fresh graduate, tell us what applies to you. Experience and salary can be left blank.'],
    preferences: ['What are you looking for?', 'A few preferences help shape your college shortlist. You can change your plans whenever you need to.'],
    review: ['A quick check. Then you’re ready.', 'Here’s the profile you’ve brought together. Check the details against your records before opening your overview.'],
    complete: ['You’re all set to begin.', 'Your profile setup is saved. Your overview brings your next steps, documents and college shortlist into one place.'],
  }
  const [title, description] = titles[step]
  const validation = validateAdmissionsProfile(profile)
  const missingEssentials = !profile.full_name?.trim() || !profile.email?.trim()
  const imported = getAiImportedFields(profile)
  const summaryMissing = [!hasProfileValue(profile.academic_10th?.percentage) && !hasProfileValue(profile.academic_10th?.cgpa) && 'Class 10 marks', !hasProfileValue(profile.academic_12th?.percentage) && !hasProfileValue(profile.academic_12th?.cgpa) && 'Class 12 marks', (!profile.academic_graduation?.degree || !hasProfileValue(profile.academic_graduation?.percentage) && !hasProfileValue(profile.academic_graduation?.cgpa)) && 'Graduation details'].filter(Boolean)

  return <SetupShell step={step} title={title} description={description} eyebrow={detailIndex >= 0 ? `YOUR DETAILS · ${detailIndex + 1} OF ${details.length}` : 'YOUR UNIDEX SETUP'}>
    {actionError && <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">{actionError}<p className="mt-1 text-xs">Your saved information is safe. Please try again before moving on.</p></div>}
    {step === 'welcome' && <div className={card}><div className="grid gap-7 sm:grid-cols-3">{[{ icon: Files, label: '1. Bring your documents', text: 'Mark sheets, exam results and a résumé, if you have them.' }, { icon: UserRound, label: '2. Check your details', text: 'Review extracted information and fill in the gaps, one section at a time.' }, { icon: GraduationCap, label: '3. Find your next step', text: 'Open your overview and start comparing Delhi NCR MBA colleges.' }].map(({ icon: Icon, label, text }) => <div key={label}><span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#225feb]"><Icon size={22}/></span><h2 className="text-sm font-semibold">{label}</h2><p className="mt-2 text-xs leading-6 text-slate-500">{text}</p></div>)}</div><div className="mt-8 flex flex-wrap items-center justify-between gap-5 border-t border-slate-100 pt-6"><p className="max-w-lg text-xs leading-6 text-slate-500">No documents handy? You can enter details yourself. Your progress is saved after each step, so you can return at any time.</p><button className={primary} disabled={pending} onClick={() => saveStep('documents')}>{pending ? <LoaderCircle size={16} className="animate-spin"/> : <ArrowRight size={16}/>}Let’s get started</button></div></div>}
    {step === 'documents' && <div className={card}><div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#225feb]"><Files size={23}/></span><div><h2 className="text-xl font-semibold tracking-tight">Upload once. Type less.</h2><p className="mt-3 max-w-xl text-sm leading-7 text-slate-500">Start with your Class 10, Class 12 and graduation mark sheets. Add exam results, a résumé or a profile photo if available. PAN, Aadhaar, passport and other ID proofs are optional.</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-3">{['Mark sheets', 'Exam results & résumé', 'Profile photo'].map(label => <div key={label} className="flex items-center gap-2 rounded-xl bg-[#f7f9fd] px-4 py-3 text-xs text-slate-600"><Check size={14} className="text-[#225feb]"/>{label}</div>)}</div><div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4"><Sparkles size={18} className="mt-0.5 shrink-0 text-amber-600"/><p className="text-xs leading-6 text-slate-600">Choose your documents, then use <strong>Extract selected</strong> to fill supported fields. Extraction can make mistakes. You’ll check the results and enter anything it could not read.</p></div>{ownDocuments?.length > 0 && <p className="mt-5 text-xs leading-6 text-[#225feb]">You already have {ownDocuments.length} document{ownDocuments.length === 1 ? '' : 's'} in your account. Open Documents to review or extract them.</p>}<div className="mt-7 flex flex-wrap gap-3"><button className={primary} disabled={pending} onClick={() => saveStep('documents', { documentsChoice: 'upload', afterSave: () => navigate('/documents?setup=1', { state: { returnTo: '/onboarding' } }) })}>{pending ? <LoaderCircle size={16} className="animate-spin"/> : <Files size={16}/>}Upload documents first</button><button className={secondary} disabled={pending} onClick={() => saveStep('personal', { documentsChoice: 'manual' })}>I’ll enter details myself <ArrowRight size={15}/></button></div><p className="mt-4 text-[11px] leading-5 text-slate-400">Documents are optional during setup. You can add more from your overview later.</p></div>}
    {detailIndex >= 0 && <ReviewedProfileEditor key={user.id} initialBaseProfile={profile} initialProfile={{ ...profile, email: profile?.email || user?.email || '', full_name: profile?.full_name || user?.user_metadata?.full_name || '' }} user={user} saveProfile={saveProfile} saving={saving} error={error} section={step} guided onboarding documentsFirstEnabled={false} onBack prepareCandidate={(candidate, { intent }) => withProfileSetup(candidate, intent === 'back' ? SETUP_STEPS[SETUP_STEPS.indexOf(step) - 1] : SETUP_STEPS[SETUP_STEPS.indexOf(step) + 1])} onInvalidSection={setViewStep} onSaved={(_, saved) => { setActionError(''); setReviewed(false); setViewStep(getProfileSetupStep(saved)) }} submitLabel={step === 'preferences' ? 'Save & review profile' : 'Save & continue'}/>}
    {step === 'review' && <div className={card}>{imported.length > 0 && <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4"><FileCheck2 size={19} className="mt-0.5 shrink-0 text-amber-700"/><p className="text-xs leading-6 text-slate-600">{imported.length} field{imported.length === 1 ? '' : 's'} came from your documents. Please cross-check names, dates, marks and scores against the originals. Extraction does not verify accuracy.</p></div>}<div className="grid gap-4 sm:grid-cols-2"><SummaryCard title="Personal details" step="personal" busy={pending} onEdit={saveStep}><p className="font-medium text-[#10264c]">{profile.full_name || 'Full name needed'}</p><p className="break-all">{profile.email || 'Email needed'}</p><p>{[profile.phone, profile.current_city].filter(Boolean).join(' · ') || 'Phone and city can be added later'}</p></SummaryCard><SummaryCard title="Your education" step="academics" busy={pending} onEdit={saveStep}><p>Class 10: {marks(profile.academic_10th)}</p><p>Class 12: {marks(profile.academic_12th)}</p><p>Graduation: {[profile.academic_graduation?.degree, marks(profile.academic_graduation)].filter(Boolean).join(' · ')}</p></SummaryCard><SummaryCard title="Entrance exams" step="exams" busy={pending} onEdit={saveStep}>{profile.exam_scores?.length ? profile.exam_scores.map((exam, index) => <p key={index}>{exam.exam}{exam.year ? ` (${exam.year})` : ''}: {hasProfileValue(exam.percentile) ? `${exam.percentile} percentile` : hasProfileValue(exam.total_score) ? `Score ${exam.total_score}` : 'Score to be added'}</p>) : <p>No results added yet. You can add them later.</p>}</SummaryCard><SummaryCard title="Your experience" step="work" busy={pending} onEdit={saveStep}><p>{hasProfileValue(profile.total_work_experience_months) ? `${profile.total_work_experience_months} months of full-time experience` : 'Total experience not added'}</p><p>{profile.work_experience?.length ? `${profile.work_experience.length} role${profile.work_experience.length === 1 ? '' : 's'} added` : 'No roles added'}</p><p>Last annual CTC: {hasProfileValue(profile.last_drawn_ctc) ? formatInr(profile.last_drawn_ctc) : 'Not shared (optional)'}</p></SummaryCard><div className="sm:col-span-2"><SummaryCard title="Your preferences" step="preferences" busy={pending} onEdit={saveStep}><p>{[profile.preferences?.programme, profile.preferences?.study_mode].filter(Boolean).join(' · ')}</p><p>{profile.preferences?.preferred_cities?.join(', ') || 'Delhi NCR'}</p>{hasProfileValue(profile.preferences?.max_fees_inr) && <p>Budget: {formatInr(profile.preferences.max_fees_inr)}</p>}{profile.preferences?.specialization && <p>{profile.preferences.specialization}</p>}</SummaryCard></div></div>{summaryMissing.length > 0 && <p className="mt-6 rounded-xl bg-blue-50 p-4 text-xs leading-6 text-slate-600">You can add {summaryMissing.join(', ')} later. College comparisons become more useful as you complete your profile.</p>}{(missingEssentials || !validation.valid) && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-xs leading-6 text-red-700">{missingEssentials ? 'Add your full name and email in Personal details to finish setup.' : Object.values(validation.errors)[0]}</p>}<label className="mt-7 flex items-start gap-3 rounded-2xl border border-slate-200 p-5 text-xs leading-6 text-slate-600"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[#225feb]" checked={reviewed} disabled={pending} onChange={event => setReviewed(event.target.checked)}/><span>I have checked these details, including any information extracted from documents. I can update my profile later and will review the details again before submitting an application.</span></label><div className="mt-7 flex flex-wrap items-center justify-between gap-4"><button className={secondary} disabled={pending} onClick={() => saveStep('preferences')}><ArrowLeft size={15}/>Back to preferences</button><button className={primary} disabled={pending || !reviewed || missingEssentials || !validation.valid} onClick={() => saveStep('complete', { complete: true })}>{pending ? <LoaderCircle size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>}Finish setup</button></div></div>}
    {step === 'complete' && <div className={`${card} text-center`}><span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-[#225feb]"><CheckCircle2 size={38}/></span><h2 className="mt-6 text-2xl font-semibold tracking-tight">A clearer path starts here.</h2><p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-slate-500">You can keep refining your profile, add documents and explore colleges at your own pace. Your information stays editable.</p><Link to="/profile" className={`${primary} mt-7`}>Open my overview <ArrowRight size={16}/></Link><p className="mt-5 inline-flex items-center justify-center gap-2 text-[11px] text-slate-400"><ShieldCheck size={14}/>Your profile setup has been saved.</p></div>}
  </SetupShell>
}
