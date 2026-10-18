import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, FileUp, LoaderCircle, PenLine, ShieldCheck } from 'lucide-react'
import { useAdmissions } from '../context/AdmissionsContext'
import { answerDocumentsFirst, formReturnPath, hasAnsweredDocumentsFirst, shouldOfferDocumentsFirst } from '../lib/admissionsDocumentsFirst'

function DocumentsFirstDialog({ busy, error, onUpload, onContinue }) {
  const panel = useRef(null), continueButton = useRef(null)
  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    continueButton.current?.focus()
    const containFocus = event => {
      if (panel.current && !panel.current.contains(event.target)) (panel.current.querySelector('button:not([disabled])') || panel.current).focus()
    }
    document.addEventListener('focusin', containFocus)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('focusin', containFocus)
      requestAnimationFrame(() => { if (previous?.isConnected) previous.focus() })
    }
  }, [])
  useEffect(() => { if (busy) panel.current?.focus() }, [busy])
  function handleKeys(event) {
    if (event.key === 'Escape' && !busy) { event.preventDefault(); onContinue(); return }
    if (event.key !== 'Tab') return
    const buttons = [...panel.current.querySelectorAll('button:not([disabled])')]
    const first = buttons[0], last = buttons.at(-1)
    if (!first) { event.preventDefault(); return }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
  return <div className="fixed inset-0 z-[85] grid place-items-center bg-[#10264c]/45 p-4 backdrop-blur-sm"><section ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="documents-first-title" aria-describedby="documents-first-description" aria-busy={busy} onKeyDown={handleKeys} className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl sm:p-9"><span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#225feb]"><FileUp size={23}/></span><p className="mt-6 text-[10px] font-bold uppercase tracking-[.2em] text-[#225feb]">A simpler place to start</p><h2 id="documents-first-title" className="mt-3 max-w-sm text-3xl font-semibold leading-tight tracking-[-.04em] text-[#10264c]">Have your documents handy?</h2><p id="documents-first-description" className="mt-4 text-sm leading-7 text-slate-500">Upload your mark sheets, exam scorecards or résumé first to give your profile a head start. Review extracted details before reusing them in an application.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4"><FileUp size={18} className="text-[#225feb]"/><p className="mt-3 text-xs font-semibold text-[#10264c]">Start with your documents</p><p className="mt-2 text-[11px] leading-5 text-slate-500">Choose what to upload, then choose when to extract and review.</p></div><div className="rounded-2xl border border-slate-200 p-4"><PenLine size={18} className="text-slate-400"/><p className="mt-3 text-xs font-semibold text-[#10264c]">Fill in your details here</p><p className="mt-2 text-[11px] leading-5 text-slate-500">You can enter everything yourself and add documents later.</p></div></div><p className="mt-5 flex items-start gap-2 text-[10px] leading-5 text-slate-400"><ShieldCheck size={14} className="mt-0.5 shrink-0"/>Documents are optional at this step. This choice does not upload a file or start extraction.</p>{error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs leading-6 text-red-700">{error}</p>}<div className="mt-7 flex flex-wrap justify-end gap-3"><button ref={continueButton} type="button" disabled={busy} onClick={onContinue} className="rounded-full border border-slate-200 px-5 py-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40">Continue here</button><button type="button" disabled={busy} onClick={onUpload} className="inline-flex items-center gap-2 rounded-full bg-[#225feb] px-5 py-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">{busy ? <LoaderCircle size={14} className="animate-spin"/> : <ArrowRight size={14}/>} {busy ? 'Keeping your draft…' : 'Upload documents first'}</button></div></section></div>
}

export default function DocumentsFirstPrompt({ children, onBeforeUpload, enabled = true }) {
  const { user, documents, documentsLoaded, documentsUserId } = useAdmissions()
  const navigate = useNavigate(), location = useLocation()
  const [answeredFor, setAnsweredFor] = useState(() => hasAnsweredDocumentsFirst(user?.id) ? user.id : null)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const active = useRef(false), locked = useRef(false), currentUserId = useRef(user?.id)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  useEffect(() => { currentUserId.current = user?.id }, [user?.id])
  const open = shouldOfferDocumentsFirst({ userId: user?.id, documents, documentsLoaded, documentsUserId, dismissed: answeredFor === user?.id || hasAnsweredDocumentsFirst(user?.id), enabled })
  function continueHere() {
    if (locked.current) return
    answerDocumentsFirst(user?.id); setAnsweredFor(user?.id)
  }
  async function uploadFirst() {
    if (locked.current || !open) return
    const accountId = user.id
    locked.current = true; setBusy(true); setError('')
    try {
      await onBeforeUpload?.()
      if (!active.current || currentUserId.current !== accountId) return
      answerDocumentsFirst(accountId); setAnsweredFor(accountId)
      navigate('/documents', { state: { returnTo: formReturnPath(location.pathname) } })
    } catch (error) {
      if (active.current && currentUserId.current === accountId) setError(error?.message || 'Your draft could not be saved. Continue here or try again before leaving.')
    } finally {
      locked.current = false
      if (active.current) setBusy(false)
    }
  }
  return <><div inert={open ? true : undefined}>{children}</div>{open && <DocumentsFirstDialog busy={busy} error={error} onContinue={continueHere} onUpload={uploadFirst}/>}</>
}
