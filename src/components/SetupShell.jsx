import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Check, ShieldCheck } from 'lucide-react'
import Brand from './Brand'

const stages = ['Documents', 'Your details', 'Review', 'Ready']

export default function SetupShell({ step = 'welcome', title, description, eyebrow = 'YOUR UNIDEX SETUP', children, footer }) {
  const heading = useRef(null)
  const stage = step === 'complete' ? 3 : step === 'review' ? 2 : ['personal', 'academics', 'exams', 'work', 'preferences'].includes(step) ? 1 : 0
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    if (typeof window !== 'undefined') window.scrollTo?.({ top: 0, behavior: 'instant' })
  }, [step])
  return <div className="min-h-screen bg-[#f7f9fd] text-[#10264c]">
    <header className="border-b border-slate-200/70 bg-white"><div className="mx-auto flex min-h-20 max-w-[1180px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8"><Brand compact/><span className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-500"><ShieldCheck size={15} className="text-[#225feb]"/>Your progress is saved as you go</span></div></header>
    <main className="mx-auto max-w-[1050px] px-5 pb-10 pt-7 sm:px-8 sm:pt-10">
      <ol aria-label="Profile setup progress" className="mb-10 grid grid-cols-4 gap-2 rounded-2xl border border-slate-200/70 bg-white p-3 sm:gap-5 sm:p-5">{stages.map((label, index) => <li key={label} aria-current={index === stage ? 'step' : undefined} className="min-w-0"><div className={`mb-2 h-1 rounded-full ${index <= stage ? 'bg-[#225feb]' : 'bg-slate-100'}`}/><div className={`flex flex-col gap-1.5 text-[10px] font-medium sm:flex-row sm:items-center sm:gap-2 sm:text-xs ${index === stage ? 'text-[#10264c]' : index < stage ? 'text-[#225feb]' : 'text-slate-400'}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] ${index < stage ? 'bg-blue-50 text-[#225feb]' : index === stage ? 'bg-[#10264c] text-white' : 'bg-slate-100'}`}>{index < stage ? <Check size={12}/> : index + 1}</span><span>{label}</span></div></li>)}</ol>
      <header className="mb-8"><p className="mb-3 text-[10px] font-bold tracking-[.2em] text-[#225feb]">{eyebrow}</p><h1 ref={heading} tabIndex={-1} className="max-w-3xl text-3xl font-semibold leading-[1.12] tracking-[-.04em] outline-none sm:text-5xl">{title}</h1>{description && <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">{description}</p>}</header>
      {children}
      {footer && <div className="mt-7">{footer}</div>}
      <p className="mt-9 flex items-start justify-center gap-2 text-center text-[11px] leading-5 text-slate-400"><ShieldCheck size={14} className="mt-0.5 shrink-0"/>Your details stay in your account. Setup does not submit an application to a college.</p>
    </main>
    <footer className="mx-auto flex max-w-[1050px] flex-wrap items-center justify-between gap-4 px-5 pb-8 text-[11px] text-slate-500 sm:px-8"><Link to="/" className="hover:text-[#225feb]">Back to Unidex</Link><div className="flex flex-wrap gap-5"><Link to="/account" className="hover:text-[#225feb]">Account settings</Link><Link to="/privacy" className="hover:text-[#225feb]">Privacy</Link><a href="mailto:hello@unidex.co.in" className="hover:text-[#225feb]">Need help?</a></div></footer>
  </div>
}
