import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowRight, ArrowUpRight, Bookmark, Check, ChevronDown, FileCheck2, FileText, GraduationCap, Search, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { BrandMark, PublicFooter, PublicHeader, primaryClass } from '../components/Brand'

const STEPS = [
  { name: 'Discover', kicker: 'Find your direction', title: 'Start with what\nmatters to you.', description: 'Explore colleges. Understand your options.\nBuild a shortlist that feels like you.', link: '/colleges', action: 'Find your next campus' },
  { name: 'Create', kicker: 'Your story, brought together', title: 'One profile.\nMore possibilities.', description: 'Your academics, experience and exam scores.\nAdd them once. Keep them ready.', link: '/onboarding', action: 'Create your profile' },
  { name: 'Organise', kicker: 'The important things, together', title: 'Less searching.\nMore knowing.', description: 'Keep your documents close. Review extracted\ndetails and see what needs attention.', link: '/documents', action: 'Organise your documents' },
  { name: 'Prepare', kicker: 'A little more prepared', title: 'Your next application.\nA clearer first step.', description: 'Bring your details into a reusable application\nform. Review everything before sharing.', link: '/application-builder', action: 'Prepare your application' },
  { name: 'Track', kicker: 'See what comes next', title: 'Every next step.\nIn view.', description: 'From your first shortlist to your next interview.\nKeep applications and deadlines together.', link: '/tracker', action: 'Meet your workspace' },
]

function Eyebrow({ children, light = false }) { return <p className={`text-[9px] font-semibold uppercase tracking-[.2em] sm:text-[10px] ${light ? 'text-[#b7cae7]' : 'text-[#7f91ac]'}`}>{children}</p> }
function SectionTitle({ children }) { return <h2 className="text-[clamp(36px,4.6vw,65px)] font-medium leading-[1.08] tracking-[-.06em] text-[#10264c]">{children}</h2> }

function Reveal({ children, className = '' }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!ref.current || !window.IntersectionObserver) return
    const observer = new IntersectionObserver(entries => { if (entries[0].isIntersecting) { setVisible(true); observer.disconnect() } }, { threshold: 0.08 })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className={`motion-safe:transition-[opacity,transform] motion-safe:duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'motion-safe:opacity-0 motion-safe:translate-y-7'} ${className}`}>{children}</div>
}

function HeroSculpture() {
  return <div className="relative mx-auto mt-9 h-[210px] max-w-[1120px] sm:h-[330px] lg:h-[410px]" aria-label="Illustration of a reusable profile connected to application steps" role="img"><div className="absolute left-1/2 top-0 h-[410px] w-[1020px] origin-top -translate-x-1/2 scale-[.46] sm:scale-[.75] lg:scale-100">
    <div className="absolute inset-x-20 top-8 h-80 rounded-[50%] bg-[radial-gradient(ellipse_at_center,#e7efff_0%,#f8faff_55%,transparent_72%)]"/>
    <div className="absolute left-[235px] top-4 h-[350px] w-[510px] rounded-[50%] border border-[#e1e9f6] -rotate-12"/><div className="absolute left-[160px] top-14 h-[285px] w-[660px] rounded-[50%] border border-[#edf1f8] rotate-12"/>
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1020 410" fill="none" aria-hidden="true"><path d="M250 205H400M600 145H685Q720 145 720 90H770M600 200H800M600 255H685Q720 255 720 320H770" stroke="#cbdaf2" strokeWidth="1.5" strokeDasharray="4 6"/></svg>
    <div className="absolute left-[135px] top-[102px] h-[230px] w-[185px] -rotate-12 rounded-2xl border border-[#d8e3f4] bg-[#f1f5fc]"/><div className="absolute left-[150px] top-[85px] h-[230px] w-[185px] -rotate-6 rounded-2xl border border-white bg-white p-6 shadow-lg shadow-[#10264c]/[.04]"><p className="text-[9px] font-semibold tracking-[.12em] text-[#96a6bf]">YOUR ACADEMICS</p><FileText className="my-8 h-9 w-9 text-[#a2badb]" strokeWidth={1}/><div className="space-y-2"><div className="h-1 w-28 rounded-full bg-[#e8edf5]"/><div className="h-1 w-24 rounded-full bg-[#e8edf5]"/><div className="h-1 w-20 rounded-full bg-[#e8edf5]"/></div><p className="mt-6 flex items-center gap-1.5 text-[8px] text-[#9aabc2]"><span className="h-1 w-1 rounded-full bg-[#ff762e]"/>All in one place</p></div>
    <div className="absolute left-[365px] top-7 z-10 h-[310px] w-[270px] -rotate-3 rounded-[25px] border border-white bg-gradient-to-br from-white to-[#f3f7ff] p-6 shadow-[0_30px_65px_-25px_#34569466]"><div className="flex justify-between text-[#8097b8]"><span className="text-sm font-semibold tracking-[-.04em] text-[#10264c]">unidex<span className="text-[#ff762e]">.</span></span><ShieldCheck className="h-4 w-4" strokeWidth={1.2}/></div><BrandMark className="my-6 h-16 w-14 text-[#10264c]"/><p className="mb-3 text-[8px] font-semibold tracking-[.14em] text-[#9aabc2]">ONE REUSABLE PROFILE</p><strong className="block text-[35px] font-medium leading-[1.05] tracking-[-.06em] text-[#10264c]">Your story.<br/>Ready to go.</strong><div className="mt-5 flex items-center justify-between border-t border-[#e0e8f5] pt-4 text-[8px] text-[#8b9fbf]"><span>Made for your next step.</span><ArrowRight className="h-3 w-3"/></div></div>
    {[{ Icon: GraduationCap, kicker: 'A NEW DIRECTION', title: 'Your next campus.', top: 54, angle: 'rotate-3' }, { Icon: FileText, kicker: 'A FRESH POSSIBILITY', title: 'Your next application.', top: 167, angle: '-rotate-2' }, { Icon: Sparkles, kicker: 'A BIGGER PICTURE', title: 'Your next beginning.', top: 280, angle: 'rotate-2' }].map(({ Icon, kicker, title, top, angle }) => <div key={title} style={{ top }} className={`absolute left-[746px] flex w-[250px] items-center gap-3 rounded-2xl border border-[#dfe7f5] bg-white/95 p-4 shadow-[0_15px_35px_-20px_#34569455] ${angle}`}><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#f0f5ff] text-[#86a4d0]"><Icon className="h-5 w-5" strokeWidth={1.3}/></div><div><p className="mb-1 text-[7px] tracking-[.12em] text-[#9aabc2]">{kicker}</p><strong className="text-[13px] font-medium tracking-[-.025em]">{title}</strong></div><ArrowUpRight className="ml-auto h-3 w-3 text-[#a2b5d1]"/></div>)}
    <p className="absolute bottom-0 left-0 right-0 text-center text-[9px] text-[#a0afc5]">Your details, connected to what comes next.</p>
  </div></div>
}

function JourneyArt({ index }) {
  if (index === 0) return <div className="w-full max-w-[370px]"><div className="mb-4 flex items-center gap-3 rounded-full border border-[#dce5f4] bg-white px-5 py-3.5 text-xs text-[#97a8c3]"><Search className="h-4 w-4"/>Your MBA, your priorities</div><div className="mb-5 flex gap-2 text-[10px] text-[#8b9db9]">{['Delhi NCR', 'MBA & PGDM', 'Your shortlist'].map(t => <span key={t} className="rounded-full border border-[#dfe7f3] px-3 py-1.5">{t}</span>)}</div>{['Your kind of campus.', 'Another possibility.'].map((title, i) => <div key={title} className={`mb-3 flex items-center gap-4 rounded-2xl border border-[#dce5f4] bg-white p-5 shadow-[0_12px_28px_-22px_#34569455] ${i ? 'translate-x-3' : '-translate-x-2'}`}><div className="grid h-12 w-12 place-items-center rounded-xl bg-[#edf3ff] text-[#8eadd7]"><GraduationCap strokeWidth={1.2}/></div><div><p className="text-[13px] font-medium tracking-[-.02em]">{title}</p><p className="mt-1 text-[10px] text-[#94a5bf]">A place to think bigger.</p></div><Bookmark className="ml-auto h-4 w-4 text-[#9bb1d1]" strokeWidth={1.4}/></div>)}</div>
  if (index === 1) return <div className="w-full max-w-[330px] -rotate-2 rounded-[24px] border border-[#dce5f4] bg-white p-7 shadow-[0_20px_45px_-27px_#34569455]"><div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[#eef4ff] text-[#7c9dcb]"><UserRound className="h-5 w-5" strokeWidth={1.5}/></div><Eyebrow>Your reusable profile</Eyebrow><p className="my-4 text-[30px] font-medium leading-[1.05] tracking-[-.055em]">Everything that<br/>makes you, you.</p>{['Your academics', 'Your experience', 'Your ambitions'].map(t => <div key={t} className="flex justify-between border-t border-[#edf1f7] py-3 text-[11px] text-[#8c9fbb]">{t}<Check className="h-3.5 w-3.5 text-[#7a9bcb]"/></div>)}</div>
  if (index === 2) return <div className="w-full max-w-[355px]">{[{ title: 'Academic documents', note: 'Your qualifications, together.', Icon: GraduationCap }, { title: 'Test scores', note: 'Review every extracted detail.', Icon: FileCheck2 }, { title: 'Your CV & photograph', note: 'Ready for the next step.', Icon: UserRound }].map(({ title, note, Icon }, i) => <div key={title} style={{ transform: `translateX(${i % 2 ? 9 : -5}px)` }} className="mb-3 flex items-center gap-4 rounded-2xl border border-[#dce5f4] bg-white p-5 shadow-[0_12px_28px_-22px_#34569455]"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#eef4ff] text-[#8aa5cf]"><Icon className="h-5 w-5" strokeWidth={1.4}/></div><div><p className="text-[13px] font-medium tracking-[-.02em]">{title}</p><p className="mt-1.5 text-[10px] text-[#94a5bf]">{note}</p></div><Check className="ml-auto h-3.5 w-3.5 text-[#8ba7d0]"/></div>)}</div>
  if (index === 3) return <div className="w-full max-w-[340px] rotate-2 rounded-[24px] border border-[#dce5f4] bg-white p-7 shadow-[0_20px_45px_-27px_#34569455]"><div className="mb-5 flex items-center gap-2 text-[#8fa5c5]"><FileCheck2 className="h-4 w-4"/><span className="text-[8px] font-semibold tracking-[.13em]">PREPARE. REVIEW. MAKE IT YOURS.</span></div><p className="mb-6 text-[30px] font-medium leading-[1.05] tracking-[-.055em]">Your application.<br/>Your say.</p>{['Personal details', 'Academic background', 'Experience & scores'].map(t => <div key={t} className="flex justify-between border-t border-[#edf1f7] py-3.5 text-[11px] text-[#8c9fbb]">{t}<span className="rounded-full bg-[#eff5ff] px-2 py-0.5 text-[8px] text-[#7f9ec9]">Review</span></div>)}<div className="mt-4 flex justify-between text-[10px] text-[#7898c6]">A reusable starting point.<ArrowRight className="h-3.5 w-3.5"/></div></div>
  return <div className="w-full max-w-[340px] rounded-[24px] border border-[#dce5f4] bg-white p-7 shadow-[0_20px_45px_-27px_#34569455]"><Eyebrow>Your next steps</Eyebrow><div className="mt-7">{[{ title: 'Build your shortlist', note: 'Find your direction.' }, { title: 'Prepare your application', note: 'Bring your details together.' }, { title: 'Keep your dates in view', note: 'Know what comes next.' }].map(({ title, note }, i) => <div key={title} className="relative flex gap-5 pb-8"><div className="relative mt-0.5 h-3 w-3 shrink-0 rounded-full border border-[#a8bee0] bg-[#edf4ff]">{i < 2 && <div className="absolute left-[4px] top-4 h-[50px] w-px bg-[#dce6f5]"/>}</div><div><p className="text-[13px] font-medium tracking-[-.02em]">{title}</p><p className="mt-2 text-[10px] text-[#94a5bf]">{note}</p></div></div>)}</div></div>
}

function ScrollJourney() {
  const track = useRef(null)
  const card = useRef(null)
  const tabs = useRef([])
  const geometry = useRef({ enabled: false, start: 0, distance: 1 })
  const manual = useRef(null)
  const manualTimer = useRef(null)
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)
  const [driven, setDriven] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let needsMeasure = true
    const update = () => {
      frame = 0
      if (!track.current || !card.current) return
      if (needsMeasure) {
        needsMeasure = false
        const height = card.current.getBoundingClientRect().height
        const enabled = !media.matches && height + 110 < window.innerHeight
        const top = 82 + Math.max(14, (window.innerHeight - 82 - height) / 2)
        const distance = Math.max(300, window.innerHeight * .55) * STEPS.length
        track.current.style.height = enabled ? `${height + distance}px` : ''
        card.current.style.position = enabled ? 'sticky' : 'relative'
        card.current.style.top = enabled ? `${top}px` : ''
        geometry.current = { enabled, start: track.current.getBoundingClientRect().top + window.scrollY - top, distance }
        setDriven(enabled)
      }
      const { enabled, start, distance } = geometry.current
      if (!enabled) return
      const next = Math.max(0, Math.min(1, (window.scrollY - start) / distance))
      setProgress(next)
      if (manual.current && Math.abs(window.scrollY - manual.current.target) > 3) return
      manual.current = null
      setActive(Math.min(STEPS.length - 1, Math.floor(next * STEPS.length)))
    }
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update) }
    const refresh = () => { needsMeasure = true; schedule() }
    const interrupt = () => { manual.current = null }
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', refresh, { passive: true })
    window.addEventListener('wheel', interrupt, { passive: true })
    window.addEventListener('touchstart', interrupt, { passive: true })
    media.addEventListener('change', refresh)
    const observer = window.ResizeObserver ? new ResizeObserver(refresh) : null
    observer?.observe(card.current)
    document.fonts?.ready.then(refresh)
    refresh()
    return () => { window.cancelAnimationFrame(frame); window.clearTimeout(manualTimer.current); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', refresh); window.removeEventListener('wheel', interrupt); window.removeEventListener('touchstart', interrupt); media.removeEventListener('change', refresh); observer?.disconnect() }
  }, [])

  function select(index, focus = false) {
    const next = (index + STEPS.length) % STEPS.length
    setActive(next)
    if (focus) tabs.current[next]?.focus()
    const { enabled, start, distance } = geometry.current
    if (enabled) {
      const target = start + distance * (next + .5) / STEPS.length
      manual.current = { target }
      window.clearTimeout(manualTimer.current)
      manualTimer.current = window.setTimeout(() => { manual.current = null }, 1600)
      window.scrollTo({ top: target, behavior: 'smooth' })
    } else setProgress((next + 1) / STEPS.length)
  }

  return <div ref={track} className="relative mt-12 sm:mt-16"><div ref={card} className="overflow-hidden rounded-[24px] border border-[#e7edf6] bg-[#f5f7fb] shadow-[0_25px_70px_-50px_#34569455] sm:rounded-[30px]">
    <div className="relative grid grid-cols-5 p-2 sm:p-3" role="tablist" aria-label="Your application journey"><div aria-hidden="true" className="absolute bottom-2 left-2 top-2 w-[calc((100%-16px)/5)] rounded-2xl border border-[#e5ebf5] bg-white shadow-sm transition-transform duration-700 motion-reduce:transition-none sm:bottom-3 sm:left-3 sm:top-3 sm:w-[calc((100%-24px)/5)]" style={{ transform: `translateX(${active * 100}%)` }}/>{STEPS.map((step, i) => <button key={step.name} ref={node => { tabs.current[i] = node }} id={`journey-tab-${i}`} type="button" role="tab" aria-selected={active === i} aria-controls={`journey-panel-${i}`} tabIndex={active === i ? 0 : -1} onClick={() => select(i)} onKeyDown={e => { if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) { e.preventDefault(); select(e.key === 'Home' ? 0 : e.key === 'End' ? 4 : active + (e.key === 'ArrowRight' ? 1 : -1), true) } }} className={`relative z-10 flex min-h-[65px] flex-col items-center justify-center gap-2 rounded-xl text-[9px] font-medium transition-colors sm:min-h-[70px] sm:flex-row sm:gap-3 sm:text-xs ${active === i ? 'text-[#10264c]' : 'text-[#94a2b9]'}`}><span className={`grid h-5 w-5 place-items-center rounded-full border text-[9px] transition-colors sm:h-7 sm:w-7 sm:text-[11px] ${active === i ? 'border-[#225feb] bg-[#225feb] text-white shadow-[0_0_0_4px_#225feb0a]' : i < active ? 'border-[#d3e1fa] bg-[#eaf1ff] text-[#225feb]' : 'border-[#d8e1ef]'}`}>{i + 1}</span>{step.name}</button>)}</div>
    <div className="h-[2px] overflow-hidden bg-[#e3e9f3]" aria-hidden="true"><div className="h-full origin-left bg-gradient-to-r from-[#79a5ff] to-[#225feb]" style={{ transform: `scaleX(${progress})` }}/></div>
    <div className="grid">{STEPS.map((step, i) => <div id={`journey-panel-${i}`} key={step.name} role="tabpanel" aria-labelledby={`journey-tab-${i}`} aria-hidden={active !== i} inert={active !== i ? true : undefined} className={`col-start-1 row-start-1 grid min-h-[485px] items-center gap-7 px-6 pb-5 pt-8 transition-[opacity,visibility] duration-500 motion-reduce:transition-none sm:min-h-[450px] sm:grid-cols-2 sm:gap-10 sm:px-10 sm:py-10 lg:px-16 ${active === i ? 'visible z-10 opacity-100' : 'invisible pointer-events-none opacity-0'}`}><div className={`transition-[transform,opacity] duration-700 motion-reduce:transition-none ${active === i ? 'translate-y-0 opacity-100' : i < active ? '-translate-y-6 opacity-0' : 'translate-y-6 opacity-0'}`}><Eyebrow>{step.kicker}</Eyebrow><h3 className="mt-5 whitespace-pre-line text-[31px] font-medium leading-[1.08] tracking-[-.055em] sm:mt-6 sm:text-[clamp(30px,3.4vw,49px)]">{step.title}</h3><p className="mt-5 whitespace-pre-line text-xs leading-6 text-[#7d8fa8] sm:text-sm sm:leading-7">{step.description}</p><Link to={step.link} tabIndex={active === i ? 0 : -1} className="mt-5 inline-flex items-center gap-3 text-xs font-semibold text-[#225feb] sm:mt-7 sm:text-sm">{step.action}<ArrowRight className="h-3.5 w-3.5"/></Link></div><div className={`flex min-h-[210px] items-center justify-center transition-[transform,opacity] delay-75 duration-700 motion-reduce:transition-none sm:min-h-[300px] ${active === i ? 'translate-y-0 opacity-100' : i < active ? '-translate-y-8 scale-[.975] opacity-0' : 'translate-y-8 scale-[.975] opacity-0'}`} aria-hidden="true"><div className="flex w-full max-w-[370px] origin-center scale-[.87] justify-center sm:scale-100"><JourneyArt index={i}/></div></div></div>)}</div>
    <div className="flex items-center justify-between px-6 pb-4 text-[9px] text-[#94a2b9] sm:px-10 sm:pb-5 sm:text-[10px]"><span className="inline-flex items-center gap-2"><ArrowDown className="h-3 w-3 text-[#225feb]"/>{driven ? 'Scroll to explore' : 'Choose a step to explore'}</span><span className="flex items-center gap-3 tabular-nums"><strong className="font-semibold text-[#10264c]">{active + 1}</strong><span className="text-[#c3cddb]">/</span>5</span></div>
  </div></div>
}

function FeaturedColleges() {
  const [colleges, setColleges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true); setError(false)
      try {
        const { data, error: fetchError } = await supabase.from('colleges').select('id, name, location, type, avg_fees, placement_avg_lpa').order('tier', { ascending: true, nullsFirst: false }).order('name').limit(3)
        if (fetchError) throw fetchError
        if (active) setColleges(data || [])
      } catch { if (active) setError(true) }
      finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [attempt])
  if (loading) return <div className="mt-12 grid gap-5 md:grid-cols-3" aria-label="Loading college listings">{[1, 2, 3].map(i => <div key={i} className="h-72 rounded-[22px] bg-[#f2f5fa] motion-safe:animate-pulse"/>)}</div>
  if (error) return <div className="mt-10 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-[#e4ebf5] p-8 text-sm text-[#718098]" role="status"><p>College listings could not be loaded right now.</p><button onClick={() => setAttempt(v => v + 1)} className="font-semibold text-[#225feb]">Try again →</button></div>
  if (!colleges.length) return <div className="mt-10 rounded-2xl border border-[#e4ebf5] p-8 text-sm text-[#718098]">The college directory is being updated. <Link to="/colleges" className="font-semibold text-[#225feb]">Open directory →</Link></div>
  return <div className="mt-12 grid gap-5 md:grid-cols-3">{colleges.map((college, i) => <Link to={`/college/${college.id}`} key={college.id} className="group overflow-hidden rounded-[22px] border border-[#e3e9f3] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_-30px_#34569455]"><div className={`relative flex h-32 items-center justify-between overflow-hidden px-7 ${i === 1 ? 'bg-[#edf2fb]' : i === 2 ? 'bg-[#eef4f5]' : 'bg-[#edf2ff]'}`}><span className="relative z-10 text-3xl font-medium tracking-[-.06em] text-[#597cae]">{college.name?.split(' ').filter(Boolean).map(word => word[0]).slice(0, 3).join('')}</span><GraduationCap className="absolute -bottom-3 right-5 h-28 w-28 -rotate-12 text-[#cbd9ed]" strokeWidth={.5}/><ArrowUpRight className="relative z-10 h-5 w-5 text-[#819bc2] transition group-hover:-translate-y-1 group-hover:translate-x-1"/></div><div className="p-7"><p className="text-[10px] uppercase tracking-[.12em] text-[#8fa0b9]">{college.type || 'MBA & PGDM'} · {college.location || 'India'}</p><h3 className="mt-3 min-h-14 text-xl font-medium leading-7 tracking-[-.04em] text-[#10264c]">{college.name}</h3><div className="mt-5 flex justify-between border-t border-[#edf1f7] pt-5 text-[11px]"><span className="text-[#9aabc2]">Explore the programme</span><span className="inline-flex items-center gap-2 font-semibold text-[#225feb]">View college <ArrowRight className="h-3 w-3"/></span></div></div></Link>)}</div>
}

export default function LandingPage() {
  useEffect(() => {
    document.title = 'Unidex — One profile. Every application.'
    if (window.location.hash === '#experience' || window.location.hash === '#for-colleges') requestAnimationFrame(() => document.querySelector(window.location.hash)?.scrollIntoView({ behavior: 'auto' }))
  }, [])
  return <div className="overflow-x-clip bg-white text-[#10264c]"><a href="#main" className="sr-only z-50 rounded-full bg-white px-5 py-3 text-[#225feb] focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a><PublicHeader/><main id="main">
    <section className="relative overflow-hidden pt-14 sm:pt-20" aria-labelledby="hero-heading"><div className="relative z-10 mx-auto px-5 text-center"><p className="mb-6 flex items-center justify-center gap-2.5 text-[8px] font-semibold uppercase tracking-[.2em] text-[#8395af] sm:mb-7 sm:text-[10px]"><span className="h-px w-5 bg-[#ff762e]"/>The MBA journey. Reconsidered.</p><h1 id="hero-heading" className="text-[clamp(50px,7.45vw,106px)] font-semibold leading-[1.01] tracking-[-.065em]">One profile.<br/><span className="text-[#9dacc2]">Every application.</span></h1><p className="mt-6 text-sm leading-7 text-[#8192ac] sm:text-base">Your ambition has a direction.<br/>Bring your MBA applications along.</p><div className="mt-7 flex flex-wrap items-center justify-center gap-5 sm:gap-7"><Link to="/signup" className={primaryClass}>Start your journey <ArrowRight className="h-4 w-4"/></Link><a href="#experience" className="inline-flex items-center gap-3 text-xs font-medium text-[#7186a5]">Explore the experience <span className="grid h-7 w-7 place-items-center rounded-full border border-[#dfe7f3]"><ArrowDown className="h-3 w-3 -rotate-45"/></span></a></div></div><HeroSculpture/><div className="mx-auto mt-4 flex max-w-[1280px] items-center justify-between border-b border-[#edf1f7] px-6 py-6 text-[9px] text-[#99a8be] sm:mt-0 sm:px-10 sm:text-[10px]"><span>MBA & PGDM admissions</span><a href="#experience" className="hidden items-center gap-2 sm:flex">Scroll to discover <ArrowDown className="h-3 w-3"/></a><span>Built around you.</span></div></section>
    <section id="experience" className="mx-auto max-w-[1280px] scroll-mt-28 px-6 pb-20 pt-20 sm:px-10 sm:pb-28 sm:pt-28"><Reveal className="flex flex-col justify-between gap-7 sm:flex-row sm:items-end"><div><Eyebrow>Big ambitions. Smaller to-do lists.</Eyebrow><div className="mt-5"><SectionTitle>A big decision.<br/><span className="text-[#a3b0c5]">A simpler way there.</span></SectionTitle></div></div><p className="text-sm leading-7 text-[#8798b2] sm:mb-1">Choosing an MBA is personal.<br/>Managing the applications should feel<br className="hidden sm:block"/> a little more effortless.</p></Reveal><ScrollJourney/></section>
    <section className="mx-auto max-w-[1360px] px-5 sm:px-10"><Reveal className="relative min-h-[480px] overflow-hidden rounded-[24px] sm:min-h-[560px] sm:rounded-[30px]"><img src="/assets/campus-life.webp" alt="Students exploring their options together in a university library" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-[65%_center]"/><div className="absolute inset-0 bg-gradient-to-r from-[#10264c]/80 via-[#10264c]/35 to-transparent"/><div className="relative z-10 max-w-xl px-8 py-16 sm:px-16 sm:py-20"><Eyebrow light>Make space for what comes next.</Eyebrow><h2 className="mt-6 text-[clamp(42px,4.8vw,67px)] font-medium leading-[1.06] tracking-[-.06em] text-white">Less paperwork.<br/>More possibility.</h2><p className="mt-6 text-sm leading-7 text-[#dfE7f2]">The conversations. The decisions. The bigger picture.<br className="hidden sm:block"/>Give your future more of your attention.</p><Link to="/signup" className="mt-9 inline-flex min-h-12 items-center gap-5 rounded-full bg-white px-6 py-3 text-xs font-semibold text-[#10264c]">Make your next move <ArrowRight className="h-4 w-4"/></Link></div><p className="absolute bottom-6 left-8 text-[9px] text-white/60 sm:left-16">Made for the student. Designed for the journey.</p></Reveal></section>
    <section className="mx-auto max-w-[1280px] px-6 py-24 sm:px-10 sm:py-32"><Reveal><div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end"><div><Eyebrow>Your next campus starts here.</Eyebrow><div className="mt-5"><SectionTitle>Find where<br/><span className="text-[#a3b0c5]">you could belong.</span></SectionTitle></div></div><div><p className="text-sm leading-7 text-[#8798b2]">A considered place to start.<br/>Explore your MBA and PGDM options.</p><Link to="/colleges" className="mt-5 inline-flex items-center gap-3 text-sm font-semibold text-[#225feb]">Explore all colleges <ArrowUpRight className="h-4 w-4"/></Link></div></div><FeaturedColleges/><p className="mt-5 text-[10px] leading-5 text-[#a0aec2]">Independently listed institutions. Confirm current fees, eligibility and deadlines with official college sources. Listings do not imply a partnership.</p></Reveal></section>
    <section className="bg-[#f6f8fc]"><div className="mx-auto grid max-w-[1280px] items-center gap-14 px-6 py-20 sm:px-10 md:grid-cols-2 md:gap-20 md:py-28"><Reveal className="relative"><img src="/assets/application-desk.webp" alt="An applicant organising academic documents and application notes" loading="lazy" className="aspect-[4/4.2] w-full rounded-[24px] object-cover"/><div className="absolute bottom-7 left-5 right-5 flex items-center gap-4 rounded-2xl border border-white/70 bg-white/95 p-5 shadow-lg shadow-[#10264c]/5 sm:left-7 sm:right-7"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf3ff] text-[#89a5ce]"><FileText className="h-5 w-5" strokeWidth={1.4}/></div><div><p className="text-sm font-medium tracking-[-.025em]">Your details. Together.</p><p className="mt-1 text-[10px] text-[#94a3b8]">Ready for your next application.</p></div></div></Reveal><Reveal><Eyebrow>Thought through. Down to the details.</Eyebrow><div className="mt-6"><SectionTitle>Your story.<br/>Your documents.<br/><span className="text-[#225feb]">Your say.</span></SectionTitle></div><p className="mt-7 text-sm leading-8 text-[#8193ae]">Keep the important things close.<br/>Know what is ready. See what needs attention.<br/>Review your details before sharing them.</p><Link to="/profile" className="mt-7 inline-flex items-center gap-3 text-sm font-semibold text-[#225feb]">Meet your workspace <ArrowRight className="h-4 w-4"/></Link><p className="mt-10 flex items-center gap-3 border-t border-[#e0e8f3] pt-7 text-[11px] text-[#94a3b8]"><ShieldCheck className="h-4 w-4" strokeWidth={1.5}/>Your profile. Your next step.</p></Reveal></div></section>
    <section id="for-colleges" className="mx-auto max-w-[1280px] scroll-mt-28 px-6 py-24 sm:px-10 sm:py-32"><Reveal className="relative overflow-hidden rounded-[26px] bg-[#10264c] px-8 py-16 sm:px-16 sm:py-20"><div className="relative z-10 max-w-xl"><Eyebrow light>For colleges. For a better connection.</Eyebrow><h2 className="mt-6 text-[clamp(36px,4.5vw,60px)] font-medium leading-[1.09] tracking-[-.06em] text-white">Better applications.<br/><span className="text-[#9ab5dc]">Clearer possibilities.</span></h2><p className="mt-6 text-sm leading-7 text-[#b8cce8]">A more considered connection between<br/>ambitious students and their next campus.</p><a href="mailto:partners@unidex.co.in?subject=Partner%20with%20Unidex" className="mt-8 inline-flex items-center gap-5 rounded-full bg-white px-6 py-3.5 text-xs font-semibold text-[#10264c]">Talk to us about partnerships <ArrowUpRight className="h-4 w-4"/></a></div><div className="absolute -right-20 top-1/2 hidden h-[420px] w-[420px] -translate-y-1/2 rounded-full border border-white/10 md:block"><div className="absolute inset-14 rounded-full border border-white/10"/><div className="absolute inset-28 rounded-full bg-white/[.04]"/><BrandMark className="absolute left-1/2 top-1/2 h-24 w-20 -translate-x-1/2 -translate-y-1/2 text-white/80"/>{[UserRound, GraduationCap, FileText].map((Icon, i) => <div key={i} className={`absolute grid h-16 w-16 place-items-center rounded-2xl border border-white/15 bg-[#1b365e] text-[#a1bbdf] ${i === 0 ? 'left-10 top-12 -rotate-12' : i === 1 ? 'right-5 top-40 rotate-12' : 'bottom-10 left-12 rotate-6'}`}><Icon className="h-6 w-6" strokeWidth={1}/></div>)}</div></Reveal></section>
    <section className="mx-auto grid max-w-[1280px] gap-10 px-6 pb-24 sm:px-10 md:grid-cols-[.9fr_1.1fr] md:gap-20"><Reveal><Eyebrow>A little clarity.</Eyebrow><div className="mt-5"><SectionTitle>Good questions.<br/><span className="text-[#a3b0c5]">Clear answers.</span></SectionTitle></div></Reveal><Reveal>{[{ question: 'What is Unidex?', answer: 'Unidex brings your MBA and PGDM application journey together: discover colleges, build a reusable profile, organise documents and track your next steps.' }, { question: 'Can I submit applications to colleges here?', answer: 'You can prepare your information and track your applications. Final submissions and fees are completed on each institution’s official portal. Always review your details and the college’s requirements.' }, { question: 'How does college matching work?', answer: 'Fit indicators compare your exam percentile with available college cutoffs. Where a cutoff is unavailable, an estimate may be shown. A fit indicator is a starting point for research and does not predict admission.' }, { question: 'How should I check fees and deadlines?', answer: 'Confirm current fees, eligibility, application dates and programme information with the college’s official website before making a decision.' }, { question: 'Can I save my details and documents?', answer: 'Yes. Sign in to create your profile, manage documents and maintain your application tracker. You can review and correct academic details extracted from documents before saving them.' }].map(({ question, answer }) => <details key={question} className="group border-b border-[#e4eaf3] py-6"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-sm font-medium tracking-[-.015em] text-[#526a8b] [&::-webkit-details-marker]:hidden">{question}<ChevronDown className="h-4 w-4 shrink-0 text-[#a7b7ce] transition group-open:rotate-180"/></summary><p className="mt-5 max-w-xl pr-5 text-[13px] leading-7 text-[#8798b2]">{answer}</p></details>)}</Reveal></section>
    <section className="relative overflow-hidden bg-[#f5f8ff] px-6 py-24 text-center sm:py-32"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,#e5eeff_0%,transparent_65%)]"/><Reveal className="relative"><BrandMark className="mx-auto mb-8 h-14 w-12 text-[#10264c]"/><Eyebrow>Your next big decision. A clearer first step.</Eyebrow><h2 className="mt-6 text-[clamp(45px,6vw,84px)] font-medium leading-[1.05] tracking-[-.065em]">Your ambition.<br/><span className="text-[#8fa4c4]">All in one place.</span></h2><Link to="/signup" className={`${primaryClass} mt-9`}>Start your journey <ArrowRight className="h-4 w-4"/></Link><p className="mt-6 text-[10px] text-[#9aabc2]">Explore. Prepare. Move forward.</p></Reveal></section>
  </main><PublicFooter/></div>
}
