import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, Users, Calendar, GraduationCap, Play, Mail, Share2, Sparkles, Check, FolderOpen, CalendarX, FileText, Target, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Hook to detect prefers-reduced-motion preference
function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

// Scroll reveal hook for fade + rise animations
function useScrollReveal() {
  const [isVisible, setIsVisible] = useState({})
  const elementsRef = useRef({})

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsVisible(prev => ({
            ...prev,
            [entry.target.id]: true,
          }))
          observer.unobserve(entry.target)
        }
      })
    }, observerOptions)

    Object.values(elementsRef.current).forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return { isVisible, elementsRef }
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)
  const scrollTimeoutRef = useRef(null)
  const { isVisible, elementsRef } = useScrollReveal()
  const prefersReducedMotion = useReducedMotion()

  // B1: Dashboard animation state
  const [dashboardState, setDashboardState] = useState(0)

  // B2: Stat counters state
  const [statsCounted, setStatsCounted] = useState(false)

  // B4: CTA pulse state
  const [ctaPulse, setCtaPulse] = useState({})

  // Set page title
  useEffect(() => {
    document.title = 'Unidex — Track your MBA applications'
  }, [])

  // Redirect logged-in users to profile
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user || null)
      if (user) navigate('/profile', { replace: true })
    })
  }, [navigate])

  // Navbar scroll effect
  useEffect(() => {
    let lastScrollY = 0
    const handleScroll = () => {
      const scrolled = window.scrollY > 50
      if ((lastScrollY > 50) !== scrolled) {
        lastScrollY = window.scrollY
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = setTimeout(() => setNavScrolled(scrolled), 0)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [])

  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: 'smooth' })
    setMobileMenuOpen(false)
  }

  // B1: Dashboard mockup animation loop
  useEffect(() => {
    if (prefersReducedMotion) return
    const interval = setInterval(() => {
      setDashboardState(prev => (prev + 1) % 4)
    }, 2500)
    return () => clearInterval(interval)
  }, [prefersReducedMotion])

  // B2 & B4: Stat counters and CTA pulse observers
  useEffect(() => {
    if (prefersReducedMotion) return

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (entry.target.id === 'stat-counters') {
            setStatsCounted(true)
            observer.unobserve(entry.target)
          }
          if (entry.target.id === 'hero-cta') {
            setCtaPulse(prev => ({
              ...prev,
              [entry.target.id]: true
            }))
            observer.unobserve(entry.target)
          }
        }
      })
    }, { threshold: 0.2 })

    const statsEl = document.getElementById('stat-counters')
    const ctaEl = document.getElementById('hero-cta')
    if (statsEl) observer.observe(statsEl)
    if (ctaEl) observer.observe(ctaEl)

    return () => observer.disconnect()
  }, [prefersReducedMotion])

  return (
    <div className="bg-white overflow-hidden text-gray-900">

      {/* SECTION 1: NAVBAR */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 border-b border-gray-200 ${navScrolled ? 'bg-white shadow-sm' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <div className="w-8 h-8 bg-[#c9a84c] rounded-lg flex items-center justify-center text-white font-bold text-sm">U</div>
            <div className="hidden sm:block">
              <div className="text-sm font-bold text-[#1a2744]">UNIDEX</div>
              <div className="text-xs text-gray-600">MBA APPLICATION HUB</div>
            </div>
          </Link>

          {/* Center Links (Desktop) */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('how-it-works')} className="text-sm text-gray-600 hover:text-[#1a2744] transition font-medium">
              How it works
            </button>
            <button onClick={() => scrollToSection('features')} className="text-sm text-gray-600 hover:text-[#1a2744] transition font-medium">
              Features
            </button>
            <button onClick={() => scrollToSection('for-colleges')} className="text-sm text-gray-600 hover:text-[#1a2744] transition font-medium">
              For colleges
            </button>
          </div>

          {/* Right Side (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            <button onClick={() => navigate('/login')} className="text-sm text-[#1a2744] font-medium hover:text-[#c9a84c] transition">
              Sign in
            </button>
            <button onClick={() => navigate('/signup')} className="px-6 py-2 bg-[#c9a84c] text-white rounded-lg text-sm font-semibold hover:brightness-95 transition-all">
              Get started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden text-[#1a2744]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <div className="space-y-1">
              <div className={`h-0.5 w-5 bg-[#1a2744] transition-transform ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <div className={`h-0.5 w-5 bg-[#1a2744] transition-opacity ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <div className={`h-0.5 w-5 bg-[#1a2744] transition-transform ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 p-6 space-y-4">
            <button onClick={() => scrollToSection('how-it-works')} className="block w-full text-left text-gray-600 py-2 font-medium">
              How it works
            </button>
            <button onClick={() => scrollToSection('features')} className="block w-full text-left text-gray-600 py-2 font-medium">
              Features
            </button>
            <button onClick={() => scrollToSection('for-colleges')} className="block w-full text-left text-gray-600 py-2 font-medium">
              For colleges
            </button>
            <hr className="border-gray-200" />
            <button onClick={() => navigate('/login')} className="block w-full text-center text-[#1a2744] py-2 font-medium">
              Sign in
            </button>
            <button onClick={() => navigate('/signup')} className="block w-full text-center bg-[#c9a84c] text-white py-2 rounded-lg font-semibold">
              Get started
            </button>
          </div>
        )}
      </nav>

      {/* SECTION 2: HERO */}
      <section className="bg-white py-16 md:py-28">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          {/* Left: Text */}
          <div>
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-[#1a2744] mb-6 leading-tight">
              {/* Line 1: "Track all your" */}
              <div className={`motion-safe:animate-fadeIn motion-safe:animation-delay-0`}>
                Track all your
              </div>
              {/* Line 2: "MBA" (gold) + "applications from" */}
              <div className={`motion-safe:animate-fadeIn motion-safe:animation-delay-120`}>
                <span className="text-[#c9a84c]">MBA</span>
                {' '}applications from
              </div>
              {/* Line 3: "one place." */}
              <div className={`motion-safe:animate-fadeIn motion-safe:animation-delay-240`}>
                one place.
              </div>
            </h1>
            <p className="text-xl text-gray-600 mb-10 font-medium leading-relaxed">
              One profile. All your applications. Total clarity.
            </p>
            <div className="flex flex-col sm:flex-row gap-4" id="hero-cta">
              <button onClick={() => navigate('/signup')} className={`px-8 py-3 bg-[#c9a84c] text-white rounded-lg font-semibold hover:brightness-90 hover:scale-105 motion-safe:transition-all motion-safe:duration-300 active:scale-95 ${!prefersReducedMotion && ctaPulse['hero-cta'] ? 'animate-pulse-once' : ''}`}>
                Create your profile
              </button>
              <button onClick={() => scrollToSection('how-it-works')} className="px-8 py-3 border-2 border-[#1a2744] text-[#1a2744] rounded-lg font-semibold hover:bg-[#1a2744] hover:text-white motion-safe:transition-all motion-safe:duration-300 flex items-center justify-center gap-2 active:scale-95">
                <Play className="w-4 h-4 fill-current" /> See how it works
              </button>
            </div>
          </div>

          {/* Right: Mockup Card with Parallax */}
          <div className="motion-safe:animate-slideUp" style={{ backgroundAttachment: 'fixed' }}>
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden hover:shadow-2xl motion-safe:transition-shadow motion-safe:duration-300">
            <div className="flex h-96 bg-gray-50">
              {/* Sidebar */}
              <div className="w-40 bg-[#1a2744] text-white p-4 space-y-6">
                <div>
                  <div className="text-xs uppercase font-bold text-[#c9a84c] tracking-wider mb-4">Menu</div>
                  <nav className="space-y-2 text-sm">
                    <div className="px-3 py-2 bg-[#2a3f66] rounded text-white font-medium">Dashboard</div>
                    <div className="px-3 py-2 text-gray-300 hover:text-white cursor-pointer">Colleges</div>
                    <div className="px-3 py-2 text-gray-300 hover:text-white cursor-pointer">Applications</div>
                    <div className="px-3 py-2 text-gray-300 hover:text-white cursor-pointer">Documents</div>
                    <div className="px-3 py-2 text-gray-300 hover:text-white cursor-pointer">Deadlines</div>
                    <div className="px-3 py-2 text-gray-300 hover:text-white cursor-pointer">Profile</div>
                  </nav>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 bg-white overflow-auto">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-bold text-[#1a2744]">Welcome back, Arjun</h3>
                  <Sparkles className="w-5 h-5 text-[#c9a84c]" />
                </div>
                <div className="space-y-3 mb-6">
                  {/* ISB - Static */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-sm font-medium text-[#1a2744]">ISB Hyderabad</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold">In progress</span>
                  </div>
                  {/* SPJIMR - Cycles: Submitted → Shortlisted */}
                  <div className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 motion-safe:transition-all motion-safe:duration-300 ${!prefersReducedMotion ? 'motion-safe:opacity-100' : 'motion-safe:opacity-100'}`}>
                    <span className="text-sm font-medium text-[#1a2744]">SPJIMR Mumbai</span>
                    <span className={`text-xs px-2 py-1 rounded font-semibold motion-safe:transition-all motion-safe:duration-300 ${dashboardState === 0 || dashboardState === 1 ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                      {dashboardState === 0 || dashboardState === 1 ? 'Submitted' : 'Shortlisted'}
                    </span>
                  </div>
                  {/* IIM Bangalore - Static */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-sm font-medium text-[#1a2744]">IIM Bangalore</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-semibold">Shortlisted</span>
                  </div>
                  {/* FMS Delhi - Cycles: Not started → In progress → Submitted */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-sm font-medium text-[#1a2744]">FMS Delhi</span>
                    <span className={`text-xs px-2 py-1 rounded font-semibold motion-safe:transition-all motion-safe:duration-300 ${
                      dashboardState === 0 ? 'bg-gray-300 text-gray-700' :
                      dashboardState === 1 || dashboardState === 2 ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {dashboardState === 0 ? 'Not started' : dashboardState === 1 || dashboardState === 2 ? 'In progress' : 'Submitted'}
                    </span>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Upcoming Deadlines</p>
                  <p className="text-sm text-red-600 font-semibold motion-safe:transition-all motion-safe:duration-300">
                    SPJIMR Round 1 — {Math.max(1, 15 - (dashboardState * 2))} May
                  </p>
                </div>
              </div>
            </div>
          </div>
            </div>
          </div>
      </section>

      {/* SECTION 3: TRUST BAR */}
      <section id="trust-bar" ref={el => elementsRef.current['trust-bar'] = el} className="bg-white py-16 md:py-20 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className={`grid md:grid-cols-4 gap-8 motion-safe:transition-all motion-safe:duration-700 ${isVisible['trust-bar'] ? 'motion-safe:opacity-100 motion-safe:translate-y-0' : 'motion-safe:opacity-0 motion-safe:translate-y-4'}`}>
            {[
              { icon: Shield, title: 'Secure & private', desc: 'Your data is encrypted and never shared' },
              { icon: Users, title: 'One profile for all', desc: 'Apply to multiple colleges at once' },
              { icon: Calendar, title: 'Deadlines in one place', desc: 'Never miss an important date' },
              { icon: GraduationCap, title: 'Built for MBA aspirants', desc: 'Designed by and for students' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-4 hover:scale-105 motion-safe:transition-transform motion-safe:duration-300">
                <item.icon className="w-6 h-6 text-[#c9a84c] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-[#1a2744] text-sm mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3.5: STAT COUNTERS */}
      <section id="stat-counters" className="bg-white py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { label: 'Colleges', value: 245 },
              { label: 'Fields auto-filled', value: 60 },
              { label: 'Application rounds tracked', value: 5 }
            ].map((stat, idx) => (
              <div key={idx} className={`text-center motion-safe:transition-all motion-safe:duration-1000 ${statsCounted && !prefersReducedMotion ? 'motion-safe:opacity-100 motion-safe:scale-100' : 'motion-safe:opacity-0 motion-safe:scale-90'}`}>
                <div className="text-4xl md:text-5xl font-bold text-[#c9a84c] mb-2">
                  {stat.value}
                  <span className="text-lg">+</span>
                </div>
                <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: PROBLEM */}
      <section id="problem" ref={el => elementsRef.current['problem'] = el} className="bg-[#faf8f5] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className={`text-4xl md:text-5xl font-serif font-bold text-[#1a2744] mb-16 motion-safe:transition-all motion-safe:duration-700 ${isVisible['problem'] ? 'motion-safe:opacity-100 motion-safe:translate-y-0' : 'motion-safe:opacity-0 motion-safe:translate-y-8'}`}>
            Applying is hard. Unidex makes it simple.
          </h2>

          {/* 3-Column Problem Cards */}
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: FolderOpen, title: 'Scattered information', desc: 'College details, deadlines, and requirements everywhere' },
              { icon: CalendarX, title: 'Missed deadlines', desc: 'Easy to lose track of important dates' },
              { icon: FileText, title: 'Repetitive form filling', desc: 'Type the same information over and over' },
            ].map((item, idx) => (
              <div key={idx} className={`flex flex-col items-center hover:scale-105 motion-safe:transition-all motion-safe:duration-300 ${isVisible['problem'] ? 'motion-safe:opacity-100 motion-safe:translate-y-0' : 'motion-safe:opacity-0 motion-safe:translate-y-4'}`} style={{ transitionDelay: idx * 100 + 'ms' }}>
                <div className="w-20 h-20 rounded-full bg-[#faf8f5] flex items-center justify-center mb-6 hover:bg-gray-200 motion-safe:transition-colors motion-safe:duration-300">
                  <item.icon className="w-10 h-10 text-[#c9a84c]" />
                </div>
                <h3 className="font-semibold text-[#1a2744] mb-3 text-lg">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed text-center">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: HOW IT WORKS */}
      <section id="how-it-works" ref={el => elementsRef.current['how-it-works'] = el} className="bg-white py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          {/* Left: Mockup */}
          <div className={`order-2 md:order-1 motion-safe:transition-all motion-safe:duration-700 ${isVisible['how-it-works'] ? 'motion-safe:opacity-100 motion-safe:translate-y-0' : 'motion-safe:opacity-0 motion-safe:translate-y-8'}`}>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-8 shadow-lg hover:shadow-2xl motion-safe:transition-shadow motion-safe:duration-300 overflow-hidden">
              <div className="space-y-3 mb-6">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">College Directory</div>
                {['ISB Hyderabad', 'IIM Ahmedabad', 'SPJIMR Mumbai', 'IIM Bangalore', 'FMS Delhi'].map((college, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <span className="text-sm font-medium text-[#1a2744]">{college}</span>
                    <button className="text-xs text-[#c9a84c] font-semibold hover:underline">View →</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Steps */}
          <div className={`order-1 md:order-2 motion-safe:transition-all motion-safe:duration-700 ${isVisible['how-it-works'] ? 'motion-safe:opacity-100 motion-safe:translate-y-0' : 'motion-safe:opacity-0 motion-safe:translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#1a2744] mb-6">
              From shortlisting to submission.
            </h2>
            <p className="text-gray-600 mb-12 font-medium text-lg leading-relaxed">
              Everything you need, in the right order.
            </p>

            <div className="space-y-8">
              {[
                { num: '1', title: 'Discover colleges', desc: 'Explore and shortlist the right MBA programs.' },
                { num: '2', title: 'Create one profile', desc: 'Add your details once and reuse everywhere.' },
                { num: '3', title: 'Upload documents', desc: 'Store and manage all your documents securely.' },
                { num: '4', title: 'Track deadlines', desc: 'Never miss an important date again.' },
                { num: '5', title: 'Apply with confidence', desc: 'Submit complete, accurate applications.' },
              ].map((step, idx) => (
                <div key={idx} className="flex gap-6 hover:translate-x-2 motion-safe:transition-transform motion-safe:duration-300">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#c9a84c] text-white flex items-center justify-center font-bold text-base hover:scale-110 motion-safe:transition-transform motion-safe:duration-300">
                    {step.num}
                  </div>
                  <div className="pt-1">
                    <h3 className="font-semibold text-[#1a2744] mb-2 text-lg">{step.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: STAY ORGANIZED */}
      <section id="features" ref={el => elementsRef.current['features'] = el} className="bg-[#faf8f5] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          {/* Left: Checkmarks Card */}
          <div className={`rounded-2xl hover:shadow-2xl motion-safe:transition-shadow motion-safe:duration-300 motion-safe:transition-all motion-safe:duration-700 ${isVisible['features'] ? 'motion-safe:opacity-100 motion-safe:translate-y-0' : 'motion-safe:opacity-0 motion-safe:translate-y-8'}`}>
            <div className="bg-[#1a2744] rounded-2xl p-10 space-y-6">
              {[
                'Profile complete',
                'Documents uploaded',
                'Deadlines tracked'
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#c9a84c] flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-[#1a2744]" />
                  </div>
                  <p className="text-white font-medium text-lg">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Text */}
          <div className={`motion-safe:transition-all motion-safe:duration-700 ${isVisible['features'] ? 'motion-safe:opacity-100 motion-safe:translate-y-0' : 'motion-safe:opacity-0 motion-safe:translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#1a2744] mb-10">
              Stay organized at every step.
            </h2>

            <div className="space-y-8">
              {[
                { Icon: Target, title: 'Focus on your goals', desc: 'Let Unidex handle the organization so you can focus on your MBA goals.' },
                { Icon: Zap, title: 'Save time & effort', desc: 'Reduce the stress of managing multiple applications and deadlines.' },
                { Icon: Sparkles, title: 'Apply with confidence', desc: 'Submit strong, complete applications to every college.' },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-6 hover:translate-x-2 motion-safe:transition-transform motion-safe:duration-300 p-4 rounded-lg hover:bg-white motion-safe:transition-colors motion-safe:duration-300">
                  <item.Icon className="w-8 h-8 text-[#c9a84c] flex-shrink-0" />
                  <div className="pt-1">
                    <h3 className="font-semibold text-[#1a2744] mb-2 text-lg">{item.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: VISION/MISSION */}
      <section id="for-colleges" ref={el => elementsRef.current['for-colleges'] = el} className="bg-[#1a2744] text-white py-20 md:py-28">
        <div className={`max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 motion-safe:transition-all motion-safe:duration-700 ${isVisible['for-colleges'] ? 'motion-safe:opacity-100 motion-safe:translate-y-0' : 'motion-safe:opacity-0 motion-safe:translate-y-8'}`}>
          {/* Vision */}
          <div className="hover:translate-y-2 motion-safe:transition-transform motion-safe:duration-300">
            <h3 className="text-sm font-bold text-[#c9a84c] uppercase tracking-wider mb-4">Our Vision</h3>
            <p className="text-3xl md:text-4xl font-serif font-bold mb-8 leading-tight">
              To become India's trusted application infrastructure for higher education.
            </p>
            <p className="text-gray-400 text-lg leading-relaxed">
              We believe that every MBA aspirant deserves tools that make their journey simpler, not more complicated.
            </p>
          </div>

          {/* Divider & Mission */}
          <div className="border-l border-[#c9a84c]/30 pl-12 hover:translate-y-2 motion-safe:transition-transform motion-safe:duration-300">
            <h3 className="text-sm font-bold text-[#c9a84c] uppercase tracking-wider mb-4">Our Mission</h3>
            <p className="text-3xl md:text-4xl font-serif font-bold mb-8 leading-tight">
              To help students discover, organize, and submit their applications seamlessly.
            </p>
            <p className="text-gray-400 text-lg leading-relaxed">
              Through thoughtful design and smart technology, we're building the future of MBA applications in India.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 8: ABOUT UNIDEX */}
      <section id="about" ref={el => elementsRef.current['about'] = el} className="bg-white py-20 md:py-28 border-t border-gray-200">
        <div className={`max-w-4xl mx-auto px-6 motion-safe:transition-all motion-safe:duration-700 ${isVisible['about'] ? 'motion-safe:opacity-100 motion-safe:translate-y-0' : 'motion-safe:opacity-0 motion-safe:translate-y-8'}`}>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#1a2744] mb-8 text-center">
            About Unidex
          </h2>

          <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
            <p>
              We built Unidex because we lived through the MBA application chaos. Juggling deadlines across a dozen colleges, managing scattered documents, losing track of which college needed what — it felt like a job on top of the actual work of applications. We realized there was no tool built specifically for this journey, so we built one.
            </p>

            <p>
              Today, Unidex is built by people who remember the stress of applications. We're here to help you focus on what matters: your essays, your goals, and choosing the school that's right for you. Everything else — the organization, the deadlines, the documents — we handle that.
            </p>

            <p>
              We believe every MBA aspirant deserves tools that make their journey simpler, not more complicated. Through thoughtful design and genuine simplicity, we're building the future of MBA applications in India.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 9: FINAL CTA */}
      <section id="final-cta" ref={el => elementsRef.current['final-cta'] = el} className="bg-[#faf8f5] py-20 md:py-28">
        <div className={`max-w-2xl mx-auto px-6 text-center motion-safe:transition-all motion-safe:duration-700 ${isVisible['final-cta'] ? 'motion-safe:opacity-100 motion-safe:translate-y-0' : 'motion-safe:opacity-0 motion-safe:translate-y-8'}`}>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#1a2744] mb-12 leading-tight">
            Start managing your MBA applications with clarity.
          </h2>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/signup')} className="px-10 py-4 bg-[#c9a84c] text-white rounded-lg font-semibold hover:brightness-90 hover:scale-105 motion-safe:transition-all motion-safe:duration-300 active:scale-95 text-lg">
              Create your profile
            </button>
            <button onClick={() => navigate('/login')} className="px-10 py-4 border-2 border-[#1a2744] text-[#1a2744] rounded-lg font-semibold hover:bg-[#1a2744] hover:text-white motion-safe:transition-all motion-safe:duration-300 active:scale-95 text-lg">
              Sign in to Unidex
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 10: FOOTER */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-8 pb-8 border-b border-gray-200">
            {/* Left: Logo */}
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition">
              <div className="w-8 h-8 bg-[#c9a84c] rounded-lg flex items-center justify-center text-white font-bold text-sm">U</div>
              <div>
                <div className="text-sm font-bold text-[#1a2744]">UNIDEX</div>
                <div className="text-xs text-gray-600">MBA APPLICATION HUB</div>
              </div>
            </Link>

            {/* Center: Links */}
            <div className="flex flex-col sm:flex-row gap-6 sm:justify-center">
              <button onClick={() => scrollToSection('how-it-works')} className="text-sm text-gray-600 hover:text-[#1a2744] transition font-medium">How it works</button>
              <button onClick={() => scrollToSection('features')} className="text-sm text-gray-600 hover:text-[#1a2744] transition font-medium">Features</button>
              <button onClick={() => scrollToSection('for-colleges')} className="text-sm text-gray-600 hover:text-[#1a2744] transition font-medium">For colleges</button>
              <button onClick={() => navigate('/privacy')} className="text-sm text-gray-600 hover:text-[#1a2744] transition font-medium">Privacy</button>
              <button onClick={() => navigate('/terms')} className="text-sm text-gray-600 hover:text-[#1a2744] transition font-medium">Terms</button>
            </div>

            {/* Right: Social */}
            <div className="flex gap-4 sm:justify-end">
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-[#1a2744] transition">
                <Share2 className="w-5 h-5" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-[#1a2744] transition">
                <Share2 className="w-5 h-5" />
              </a>
              <a href="mailto:hello@unidex.co.in" className="text-gray-600 hover:text-[#1a2744] transition">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div className="text-center text-sm text-gray-600">
            <p>© {new Date().getFullYear()} Unidex. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
