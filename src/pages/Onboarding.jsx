import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, LoaderCircle, ShieldCheck } from 'lucide-react'
import Layout from '../components/Layout'
import AdmissionsProfileForm from '../components/AdmissionsProfileForm'
import { useAdmissions } from '../context/AdmissionsContext'

export default function Onboarding() {
  const navigate = useNavigate()
  const { user, profile, loading, saving, error, saveProfile } = useAdmissions()
  useEffect(() => { document.title = 'Make it yours · Unidex' }, [])
  async function handleSave(next) {
    await saveProfile(next)
    navigate('/colleges')
  }
  return <Layout><div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 lg:px-10 lg:py-12"><header className="mb-9"><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-semibold text-[#225feb]"><span className="h-1.5 w-1.5 rounded-full bg-[#225feb]" /> YOUR NEXT CHAPTER STARTS HERE</div><h1 className="max-w-2xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-[#10264c] sm:text-5xl lg:text-[58px]">A big ambition.<br /><span className="text-[#225feb]">A profile that’s yours.</span></h1><div className="mt-5 flex flex-wrap items-center justify-between gap-4"><p className="max-w-xl text-sm leading-6 text-slate-500">A few details connect your story to the right colleges. You can save a partial profile and add more whenever you’re ready.</p><Link to="/documents" className="inline-flex items-center gap-2 text-xs font-semibold text-[#225feb]">Have your mark sheets ready? <ArrowUpRight size={15} /></Link></div></header>{loading ? <div role="status" className="flex min-h-80 items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin" /> Preparing your profile…</div> : <AdmissionsProfileForm key={user?.id || 'onboarding'} initialProfile={{ ...profile, email: profile?.email || user?.email || '', full_name: profile?.full_name || user?.user_metadata?.full_name || '' }} onSave={handleSave} saving={saving} error={error} submitLabel="Save & explore colleges" onboarding />}<p className="mt-7 flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-slate-400"><ShieldCheck size={14} /> Your profile is saved to your account. No application is sent to a college during setup.</p></div></Layout>
}
