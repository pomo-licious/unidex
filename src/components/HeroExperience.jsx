import { useEffect, useId, useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight, CalendarDays, Check, FileText, GraduationCap, Layers3, Pause, Play, ShieldCheck, Sparkles } from 'lucide-react'
import { BrandMark, BrandWordmark } from './Brand'
import './HeroExperience.css'

const DESTINATIONS = [
  { key: 'campus', Icon: GraduationCap, kicker: 'FIND YOUR DIRECTION', title: 'Your next campus.', detail: 'Discover the possibilities.', number: '1' },
  { key: 'application', Icon: FileText, kicker: 'BRING YOUR STORY', title: 'Your next application.', detail: 'Prepare with a little more clarity.', number: '2' },
  { key: 'next', Icon: CalendarDays, kicker: 'KEEP MOVING FORWARD', title: 'Your next step.', detail: 'See what comes next.', number: '3' },
]

// This is a product illustration, not a representation of submitted applications.
// DOM variables keep decorative parallax out of React's render loop.
export default function HeroExperience() {
  const scene = useRef(null)
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const id = useId().replace(/:/g, '')

  useEffect(() => {
    const root = scene.current
    if (!root) return
    const hero = root.closest('.udx-landing-hero')
    if (hero) hero.dataset.heroPaused = String(paused)
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    let frame = 0
    let inView = true
    let x = 0
    let y = 0
    const reset = () => {
      x = 0; y = 0
      root.style.setProperty('--hero-x', '0px')
      root.style.setProperty('--hero-y', '0px')
      root.style.setProperty('--hero-scroll', '0px')
    }
    const render = () => {
      frame = 0
      if (preference.matches || paused || !inView) { reset(); return }
      const bounds = root.getBoundingClientRect()
      const scroll = Math.max(-12, Math.min(12, (window.innerHeight * .65 - bounds.top - bounds.height / 2) * .025))
      root.style.setProperty('--hero-x', `${x}px`)
      root.style.setProperty('--hero-y', `${y}px`)
      root.style.setProperty('--hero-scroll', `${scroll}px`)
    }
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(render) }
    const move = event => {
      if (!pointer.matches || preference.matches || paused || !inView) return
      const bounds = root.getBoundingClientRect()
      x = ((event.clientX - bounds.left) / bounds.width - .5) * 18
      y = ((event.clientY - bounds.top) / bounds.height - .5) * 12
      schedule()
    }
    const leave = () => { x = 0; y = 0; schedule() }
    const updatePreference = () => { setReducedMotion(preference.matches); reset(); schedule() }
    const visibility = () => {
      root.dataset.documentHidden = String(document.hidden)
      if (document.hidden) reset()
      else schedule()
    }
    const observer = window.IntersectionObserver ? new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      root.dataset.inView = String(inView)
      if (inView) schedule()
      else reset()
    }, { rootMargin: '60px' }) : null
    observer?.observe(root)
    root.addEventListener('pointermove', move, { passive: true })
    root.addEventListener('pointerleave', leave, { passive: true })
    window.addEventListener('scroll', schedule, { passive: true })
    preference.addEventListener('change', updatePreference)
    document.addEventListener('visibilitychange', visibility)
    const initial = window.requestAnimationFrame(updatePreference)
    return () => {
      window.cancelAnimationFrame(initial)
      window.cancelAnimationFrame(frame)
      root.removeEventListener('pointermove', move)
      root.removeEventListener('pointerleave', leave)
      window.removeEventListener('scroll', schedule)
      preference.removeEventListener('change', updatePreference)
      document.removeEventListener('visibilitychange', visibility)
      observer?.disconnect()
      hero?.removeAttribute('data-hero-paused')
      reset()
    }
  }, [paused])

  return <div ref={scene} className="udx-hero-experience" data-paused={paused ? 'true' : 'false'} data-in-view="true">
    <div className="udx-hero-scene" role="img" aria-label="A reusable Unidex profile connects your academic details and documents to college discovery, application preparation and next steps.">
      <div className="udx-hero-aura" aria-hidden="true"/>
      <div className="udx-hero-grid" aria-hidden="true"/>
      <div className="udx-hero-orbit udx-hero-orbit-one" aria-hidden="true"><span/></div>
      <div className="udx-hero-orbit udx-hero-orbit-two" aria-hidden="true"><span/></div>
      <svg className="udx-hero-connectors" viewBox="0 0 1120 470" fill="none" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id={`${id}-flow`} x1="240" x2="900" y1="230" y2="230" gradientUnits="userSpaceOnUse"><stop stopColor="#83b7ff"/><stop offset=".55" stopColor="#225feb"/><stop offset="1" stopColor="#90c8ff"/></linearGradient></defs>
        <g className="udx-hero-path-base"><path d="M255 220H372Q402 220 402 200H452"/><path d="M661 185H720Q750 185 750 101H817"/><path d="M661 235H817"/><path d="M661 285H720Q750 285 750 366H817"/></g>
        <g className="udx-hero-path-flow" stroke={`url(#${id}-flow)`}><path className="udx-hero-flow-source" d="M255 220H372Q402 220 402 200H452"/><path className="udx-hero-flow-one" d="M661 185H720Q750 185 750 101H817"/><path className="udx-hero-flow-two" d="M661 235H817"/><path className="udx-hero-flow-three" d="M661 285H720Q750 285 750 366H817"/></g>
        <g className="udx-hero-junctions"><circle cx="750" cy="235" r="4"/><circle cx="750" cy="235" r="10" className="udx-hero-junction-pulse"/></g>
      </svg>
      <svg className="udx-hero-mobile-connectors" viewBox="0 0 400 390" fill="none" preserveAspectRatio="none" aria-hidden="true"><g className="udx-hero-path-base"><path d="M174 205H201Q218 205 218 83H248"/><path d="M174 205H248"/><path d="M174 245H201Q218 245 218 322H248"/></g><g className="udx-hero-path-flow" stroke="#73a6fb"><path className="udx-hero-flow-one" d="M174 205H201Q218 205 218 83H248"/><path className="udx-hero-flow-two" d="M174 205H248"/><path className="udx-hero-flow-three" d="M174 245H201Q218 245 218 322H248"/></g></svg>
      <div className="udx-hero-source udx-hero-depth-back" aria-hidden="true"><div className="udx-hero-source-entry"><div className="udx-hero-source-back"/><div className="udx-hero-source-paper"><span className="udx-hero-micro">YOUR STORY, TOGETHER</span><div className="udx-hero-paper-icon"><FileText size={26} strokeWidth={1.25}/></div><strong>Good things.<br/>All in one place.</strong><div className="udx-hero-paper-lines"><i/><i/><i/></div><div className="udx-hero-paper-foot"><span/>Academics & documents</div></div></div></div>
      <div className="udx-hero-profile-wrap udx-hero-depth-front" aria-hidden="true"><div className="udx-hero-profile-entry"><div className="udx-hero-profile-float"><div className="udx-hero-profile-glint"/><div className="udx-hero-profile-header"><BrandWordmark light className="w-[104px]"/><ShieldCheck size={16} strokeWidth={1.4}/></div><div className="udx-hero-profile-mark"><BrandMark className="h-[57px] w-[46px] text-white"/><span className="udx-hero-mark-orbit"/></div><span className="udx-hero-profile-kicker">ONE REUSABLE PROFILE</span><strong>Your story.<br/>Ready to go.</strong><div className="udx-hero-profile-fields">{['Academics', 'Experience', 'Documents'].map((field, index) => <div key={field} style={{ '--field-order': index }}><span>{field}</span><Check size={11} strokeWidth={2}/></div>)}</div><div className="udx-hero-profile-bottom"><span>Made for your next chapter.</span><ArrowRight size={13}/></div></div></div></div>
      {DESTINATIONS.map(({ key, Icon, kicker, title, detail, number }, index) => <div key={key} className={`udx-hero-destination udx-hero-destination-${key} udx-hero-depth-mid`} aria-hidden="true"><div className="udx-hero-destination-entry" style={{ '--destination-order': index }}><div className="udx-hero-destination-float" style={{ '--destination-order': index }}><div className="udx-hero-destination-icon"><Icon size={22} strokeWidth={1.35}/><span>{number}</span></div><div className="udx-hero-destination-copy"><span>{kicker}</span><strong>{title}</strong><small>{detail}</small></div><ArrowUpRight className="udx-hero-destination-arrow" size={14} strokeWidth={1.6}/></div></div></div>)}
      <div className="udx-hero-floating-note udx-hero-depth-back" aria-hidden="true"><span><Layers3 size={14} strokeWidth={1.5}/></span><span>One profile.<strong>More possibilities.</strong></span><Sparkles size={12}/></div>
      <div className="udx-hero-mobile-input" aria-hidden="true"><FileText size={12}/><span>Your details, connected.</span><Check size={11}/></div>
    </div>
    <div className="udx-hero-caption"><span><i/>Your details, connected to what comes next.</span><button type="button" onClick={() => setPaused(value => !value)} disabled={reducedMotion} aria-pressed={paused} aria-label={reducedMotion ? 'Animation disabled by your reduced motion preference' : paused ? 'Play hero animation' : 'Pause hero animation'}>{paused || reducedMotion ? <Play size={10}/> : <Pause size={10}/>}<span>{reducedMotion ? 'Reduced motion' : paused ? 'Play motion' : 'Pause motion'}</span></button></div>
  </div>
}
