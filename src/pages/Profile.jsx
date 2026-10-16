import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, FileText, GraduationCap, LoaderCircle, ShieldCheck, CheckCircle2, ChevronDown, X, Trash2 } from 'lucide-react'
import Layout from '../components/Layout'
import AdmissionsProfileForm from '../components/AdmissionsProfileForm'
import { useAdmissions } from '../context/AdmissionsContext'
import { supabase } from '../lib/supabase'

export default function Profile() {
  const { user, profile, loading, saving, error, saveProfile, documents = [] } = useAdmissions()
  const [savedAt, setSavedAt] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const navigate = useNavigate()
  useEffect(() => { document.title = 'Your profile · Unidex' }, [])
  const reviewedCount = documents.filter(doc => doc.status === 'reviewed' || doc.status === 'verified').length
  async function handleSave(next) {
    await saveProfile(next)
    setSavedAt(new Date())
  }
  async function deleteAccount(event) {
    event.preventDefault()
    if (deleteConfirmation !== 'DELETE' || deleting) return
    setDeleting(true)
    setDeleteError('')
    try {
      const { data, error: requestError } = await supabase.functions.invoke('admissions-delete-account', { body: { confirmation: 'DELETE' } })
      if (requestError) {
        let message = requestError.message
        try { const response = await requestError.context?.json(); message = response?.error || response?.message || message } catch { /* Keep the original request error. */ }
        throw new Error(message || 'Your account could not be deleted.')
      }
      if (!data?.ok) throw new Error(data?.error || 'The service did not confirm account deletion. Please try again or contact privacy@unidex.co.in.')
      await supabase.auth.signOut()
      navigate('/', { replace: true })
    } catch (err) { setDeleteError(err?.message || 'Your account could not be deleted. Contact privacy@unidex.co.in.'); setDeleting(false) }
  }
  return <Layout><div className="mx-auto max-w-[1220px] px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
    <header className="mb-9 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-[#225feb]">YOUR UNIDEX PROFILE</p><h1 className="text-4xl font-semibold tracking-[-0.045em] text-[#10264c] sm:text-5xl">One profile.<br className="sm:hidden" /> More possibilities.</h1><p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">Build it once. Keep it yours. Bring your education, scores and experience into every application.</p></div><Link to="/documents" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-xs font-semibold text-[#10264c] transition hover:border-blue-200 hover:text-[#225feb]"><FileText size={15} /> Add from documents <ArrowUpRight size={15} /></Link></header>
    <div className="mb-8 grid gap-3 sm:grid-cols-3">{[{ icon: ShieldCheck, title: 'Your information, protected', subtitle: 'Private account and secure storage' }, { icon: FileText, title: `${reviewedCount} reviewed document${reviewedCount === 1 ? '' : 's'}`, subtitle: 'Extract, review and reuse your details' }, { icon: GraduationCap, title: 'Delhi NCR, to begin', subtitle: 'A focused college discovery experience' }].map(({ icon: Icon, title, subtitle }) => <div key={title} className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#225feb]"><Icon size={17} /></span><div><p className="text-xs font-semibold text-[#10264c]">{title}</p><p className="mt-1 text-[10px] text-slate-500">{subtitle}</p></div></div>)}</div>
    {savedAt && <p role="status" className="mb-5 flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 size={15} /> Saved at {savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Your latest details are ready for matching and applications.</p>}
    {loading ? <div role="status" className="flex min-h-80 items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white text-sm text-slate-500"><LoaderCircle size={19} className="animate-spin text-[#225feb]" /> Loading your profile…</div> : <AdmissionsProfileForm key={user?.id || 'profile'} initialProfile={{ ...profile, email: profile?.email || user?.email || '' }} onSave={handleSave} saving={saving} error={error} />}
    <details className="mt-10 border-t border-slate-200 pt-5"><summary className="flex w-fit cursor-pointer list-none items-center gap-2 text-xs font-medium text-slate-500 hover:text-[#10264c]"><ChevronDown size={14} /> Account settings</summary><div className="mt-5 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-5"><div><h2 className="text-xs font-semibold text-[#10264c]">Manage your account</h2><p className="mt-2 text-[11px] leading-5 text-slate-500">Your <Link to="/privacy" className="text-[#225feb] hover:underline">privacy</Link> and <Link to="/terms" className="text-[#225feb] hover:underline">terms</Link>, or contact <a href="mailto:privacy@unidex.co.in" className="text-[#225feb] hover:underline">privacy@unidex.co.in</a>.</p></div><button type="button" onClick={() => { setDeleteConfirmation(''); setDeleteError(''); setDeleteOpen(true) }} className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2.5 text-[11px] font-semibold text-red-600 hover:bg-red-50"><Trash2 size={13} /> Delete my account</button></div></details>
  </div>{deleteOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#10264c]/45 p-5 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="relative w-full max-w-md rounded-[28px] bg-white p-7 shadow-2xl"><button type="button" aria-label="Close account deletion" disabled={deleting} onClick={() => setDeleteOpen(false)} className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-50 disabled:opacity-30"><X size={17} /></button><span className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-500"><Trash2 size={20} /></span><h2 id="delete-account-title" className="text-2xl font-semibold tracking-tight text-[#10264c]">Delete your account?</h2><p className="mt-4 text-xs leading-6 text-slate-500">This permanently removes your Unidex account and its stored application information. Your private documents are removed during account deletion. This cannot be undone. Any unsaved profile changes will be lost.</p><form onSubmit={deleteAccount}><label className="mt-6 block text-xs font-semibold text-[#10264c]" htmlFor="delete-confirmation">Type DELETE to confirm</label><input id="delete-confirmation" autoComplete="off" autoFocus value={deleteConfirmation} onChange={e => setDeleteConfirmation(e.target.value)} disabled={deleting} placeholder="DELETE" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 disabled:opacity-50" />{deleteError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs leading-6 text-red-700">{deleteError}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" disabled={deleting} onClick={() => setDeleteOpen(false)} className="rounded-full border border-slate-200 px-5 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-30">Keep my account</button><button type="submit" disabled={deleteConfirmation !== 'DELETE' || deleting} className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-30">{deleting && <LoaderCircle size={14} className="animate-spin" />}{deleting ? 'Deleting…' : 'Permanently delete'}</button></div></form></section></div>}</Layout>
}
