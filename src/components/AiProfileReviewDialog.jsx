import { useEffect, useRef } from 'react'
import { ArrowRight, FileCheck2, LoaderCircle } from 'lucide-react'
import { displayAiReviewValue } from '../lib/admissionsAiReview'

export default function AiProfileReviewDialog({ changes, saving, onKeepEditing, onConfirm }) {
  const panel = useRef(null)
  const cancel = useRef(null)
  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cancel.current?.focus()
    return () => { document.body.style.overflow = overflow; requestAnimationFrame(() => { if (previous?.isConnected) previous.focus() }) }
  }, [])
  useEffect(() => { if (saving) panel.current?.focus() }, [saving])
  useEffect(() => {
    const containFocus = event => {
      if (panel.current && !panel.current.contains(event.target)) {
        const first = panel.current.querySelector('button:not([disabled])')
        ;(first || panel.current).focus()
      }
    }
    document.addEventListener('focusin', containFocus)
    return () => document.removeEventListener('focusin', containFocus)
  }, [])
  function handleKeys(event) {
    if (event.key === 'Escape' && !saving) { event.preventDefault(); onKeepEditing(); return }
    if (event.key !== 'Tab') return
    const controls = [...panel.current.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),[tabindex="0"]')]
    if (!controls.length) { event.preventDefault(); return }
    const first = controls[0], last = controls.at(-1)
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#10264c]/45 p-4 backdrop-blur-sm"><section ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="ai-correction-title" aria-describedby="ai-correction-description" aria-busy={saving} onKeyDown={handleKeys} className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl"><div className="border-b border-slate-100 p-6 pb-5 sm:px-8 sm:pt-8"><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><FileCheck2 size={20}/></span><p className="mt-5 text-[10px] font-bold uppercase tracking-[.18em] text-[#225feb]">Your details. Your decision.</p><h2 id="ai-correction-title" className="mt-3 text-2xl font-semibold tracking-[-.035em] text-[#10264c]">Keep your corrections?</h2><p id="ai-correction-description" className="mt-3 text-xs leading-6 text-slate-500">You changed {changes.length === 1 ? 'a field' : `${changes.length} fields`} originally filled by AI from your documents. AI can read a document incorrectly. Check the original and save the details you know are correct.</p></div><div className="min-h-0 space-y-4 overflow-y-auto p-6 sm:px-8">{changes.map(change => <div key={JSON.stringify(change.path)} className="rounded-2xl border border-slate-200 p-4"><h3 className="text-xs font-semibold text-[#10264c]">{change.label}</h3><p className="mt-1.5 break-words text-[10px] leading-5 text-slate-400">Source: {change.fileName}</p><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_20px_1fr]"><div className="min-w-0 rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-semibold uppercase tracking-[.1em] text-slate-400">AI originally read</p><p className="mt-2 break-words text-xs leading-6 text-slate-600">{displayAiReviewValue(change.aiValue)}</p></div><ArrowRight size={15} className="hidden self-center justify-self-center text-slate-300 sm:block"/><div className="min-w-0 rounded-xl border border-blue-100 bg-blue-50 p-3"><p className="text-[9px] font-semibold uppercase tracking-[.1em] text-[#225feb]">Your correction</p><p className="mt-2 break-words text-xs font-medium leading-6 text-[#10264c]">{displayAiReviewValue(change.value)}</p></div></div></div>)}</div><div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-white p-5 sm:px-8 sm:py-6"><button ref={cancel} type="button" onClick={onKeepEditing} disabled={saving} className="rounded-full border border-slate-200 px-5 py-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">Keep editing</button><button type="button" onClick={onConfirm} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-[#225feb] px-5 py-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">{saving && <LoaderCircle size={15} className="animate-spin"/>}{saving ? 'Saving your corrections…' : 'Save my corrections'}</button></div></section></div>
}
