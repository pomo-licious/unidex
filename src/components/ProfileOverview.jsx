import { Link } from 'react-router-dom'
import { ArrowRight, BriefcaseBusiness, FileCheck2, GraduationCap, SlidersHorizontal, UserRound } from 'lucide-react'
import { formatInr, getProfileProgress, hasProfileValue } from '../lib/admissionsProfile'

function grade(record) {
  if (hasProfileValue(record?.percentage)) return `${record.percentage}%`
  if (hasProfileValue(record?.cgpa)) return `${record.cgpa} CGPA${hasProfileValue(record.cgpa_scale) ? ` / ${record.cgpa_scale}` : ''}`
  return 'Add when ready'
}

function SummaryCard({ icon: Icon, title, children }) {
  return <section className="min-w-0 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7">
    <div className="mb-5 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#225feb]"><Icon size={19}/></span><h2 className="text-base font-semibold tracking-tight text-[#10264c]">{title}</h2></div><Link to="/profile/edit" className="rounded-full px-3 py-2 text-xs font-semibold text-[#225feb] hover:bg-blue-50">Edit<span className="sr-only"> {title}</span></Link></div>
    {children}
  </section>
}

function Fact({ label, children }) {
  return <div className="flex min-w-0 flex-wrap justify-between gap-x-4 gap-y-1 border-b border-slate-100 py-3 text-xs last:border-0"><dt className="text-slate-500">{label}</dt><dd className="max-w-full break-words font-medium text-[#10264c]">{children || 'Add when ready'}</dd></div>
}

export default function ProfileOverview({ profile, plans = [] }) {
  const progress = getProfileProgress(profile)
  const firstName = profile.full_name?.trim().split(/\s+/)[0] || 'there'
  const selected = plans.filter(plan => plan.is_selected).length
  return <>
    <section className="mb-7 overflow-hidden rounded-[28px] bg-[#10264c] p-6 text-white sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-6"><div><p className="mb-3 text-[10px] font-semibold uppercase tracking-[.2em] text-blue-200">YOUR NEXT CHAPTER</p><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">You’re in, {firstName}.</h2><p className="mt-3 max-w-lg text-sm leading-6 text-blue-100/80">Your saved profile is ready to build on. Explore Delhi NCR colleges, make a shortlist and bring these details into your applications.</p></div><Link to="/colleges" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-semibold text-[#10264c] hover:bg-blue-50">Explore your college matches <ArrowRight size={15}/></Link></div>
      <div className="mt-7 grid gap-3 border-t border-white/15 pt-6 sm:grid-cols-3"><p className="text-xs text-blue-100"><strong className="mr-2 text-lg font-semibold text-white">{progress.completed}/{progress.total}</strong> profile areas filled</p><p className="text-xs text-blue-100"><strong className="mr-2 text-lg font-semibold text-white">{selected}</strong> colleges selected</p><Link to="/application-builder" className="inline-flex items-center gap-2 text-xs font-semibold text-white">Prepare your application <ArrowRight size={14}/></Link></div>
    </section>
    <div className="mb-7 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold tracking-tight text-[#10264c]">Your profile at a glance</h2><p className="mt-2 text-xs leading-5 text-slate-500">Everything stays editable. Add missing records or new results whenever you have them.</p></div><Link to="/profile/edit" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-xs font-semibold text-[#10264c] hover:border-blue-200 hover:text-[#225feb]">Edit your profile <ArrowRight size={14}/></Link></div>
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <SummaryCard icon={UserRound} title="The essentials"><dl><Fact label="Full name">{profile.full_name}</Fact><Fact label="Email">{profile.email}</Fact><Fact label="Mobile">{profile.phone}</Fact><Fact label="Current city">{profile.current_city}</Fact></dl></SummaryCard>
      <SummaryCard icon={GraduationCap} title="Your education"><dl><Fact label="Class 10">{grade(profile.academic_10th)}</Fact><Fact label="Class 12">{grade(profile.academic_12th)}</Fact><Fact label="Graduation">{profile.academic_graduation?.degree}</Fact><Fact label="Graduation result">{grade(profile.academic_graduation)}</Fact></dl></SummaryCard>
      <SummaryCard icon={FileCheck2} title="Entrance exams">{profile.exam_scores?.length ? <dl>{profile.exam_scores.map((exam, index) => <Fact key={`${exam.exam}-${index}`} label={`${exam.exam || 'Exam'}${exam.year ? ` · ${exam.year}` : ''}`}>{hasProfileValue(exam.percentile) ? `${exam.percentile} percentile` : hasProfileValue(exam.total_score) ? `${exam.total_score} score` : 'Result pending'}</Fact>)}</dl> : <p className="text-xs leading-6 text-slate-500">No results added yet. You can explore colleges now and add your scores later for more useful matches.</p>}</SummaryCard>
      <SummaryCard icon={BriefcaseBusiness} title="Your experience"><dl><Fact label="Full-time experience">{hasProfileValue(profile.total_work_experience_months) ? `${profile.total_work_experience_months} months` : null}</Fact><Fact label="Roles added">{String(profile.work_experience?.length || 0)}</Fact><Fact label="Last drawn annual CTC">{hasProfileValue(profile.last_drawn_ctc) ? formatInr(profile.last_drawn_ctc) : null}</Fact></dl><p className="mt-3 text-[11px] leading-5 text-slate-400">Experience and CTC are optional. Fresh graduates are welcome.</p></SummaryCard>
      <div className="xl:col-span-2"><SummaryCard icon={SlidersHorizontal} title="Your MBA preferences"><dl className="grid gap-x-8 sm:grid-cols-2"><Fact label="Programme">{profile.preferences?.programme}</Fact><Fact label="Study mode">{profile.preferences?.study_mode}</Fact><Fact label="Preferred cities">{profile.preferences?.preferred_cities?.join(', ')}</Fact><Fact label="Programme budget">{hasProfileValue(profile.preferences?.max_fees_inr) ? formatInr(profile.preferences.max_fees_inr) : null}</Fact></dl></SummaryCard></div>
    </div>
  </>
}
