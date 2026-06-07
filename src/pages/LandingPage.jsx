import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LandingPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)
  const scrollTimeoutRef = useRef(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user || null)
      if (user) navigate('/profile', { replace: true })
    })
  }, [navigate])

  useEffect(() => {
    let lastScrollY = 0
    const handleScroll = () => {
      const scrolled = window.scrollY > 50
      if ((lastScrollY > 50) !== scrolled) {
        lastScrollY = window.scrollY
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = setTimeout(() => {
          setNavScrolled(scrolled)
        }, 0)
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

  return (
    <div className="bg-[#0A1628] text-white overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');

        * {
          font-family: 'Space Grotesk', system-ui, sans-serif;
        }

        .fade-up {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }

        .fade-up.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .fade-up.visible:nth-child(1) { transition-delay: 0ms; }
        .fade-up.visible:nth-child(2) { transition-delay: 100ms; }
        .fade-up.visible:nth-child(3) { transition-delay: 200ms; }
        .fade-up.visible:nth-child(4) { transition-delay: 300ms; }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50% { transform: translateY(-12px) rotate(-2deg); }
        }

        .float-card {
          animation: float 4s ease-in-out infinite;
        }

        @keyframes count-up {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .number-counter {
          font-size: 2.5rem;
          font-weight: 700;
          animation: count-up 2s ease-out;
        }

        .nav-scrolled {
          background-color: rgba(10, 22, 40, 0.9);
          backdrop-filter: blur(10px);
          border-bottom-color: rgba(51, 65, 85, 0.3);
        }

        .gradient-blob {
          background: radial-gradient(circle at 30% 50%, rgba(201, 168, 76, 0.15) 0%, transparent 70%);
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        scrollbar-width: none;
        .scrollbar-hide::-webkit-scrollbar { display: none; }

        .text-display {
          font-size: clamp(2.5rem, 8vw, 4.5rem);
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.1;
        }

        .text-heading {
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 700;
          letter-spacing: -0.015em;
        }

        .card-hover {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .card-hover:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        }
      `}</style>

      {/* NAV */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 border-b border-slate-700 ${navScrolled ? 'nav-scrolled' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <div className="w-7 h-7 bg-[#C9A84C] rounded" />
            <span>Unidex</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('how-it-works')} className="text-sm text-slate-400 hover:text-white transition">How it works</button>
            <button onClick={() => scrollToSection('features')} className="text-sm text-slate-400 hover:text-white transition">Features</button>
            <button onClick={() => scrollToSection('for-colleges')} className="text-sm text-slate-400 hover:text-white transition">For colleges</button>
            <button onClick={() => navigate('/colleges?tab=all')} className="text-sm text-slate-400 hover:text-white transition">Browse colleges</button>
          </div>

          {/* Right side buttons */}
          <div className="hidden md:flex items-center gap-4">
            <button onClick={() => navigate('/login')} className="px-4 py-2 text-sm border border-slate-600 rounded-lg hover:border-white transition">
              Sign in
            </button>
            <button onClick={() => navigate('/signup')} className="px-6 py-2 bg-[#C9A84C] text-[#0A1628] rounded-full text-sm font-semibold hover:bg-amber-300 transition">
              Start for free
            </button>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1.5" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <div className={`w-6 h-0.5 bg-white transition-transform ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <div className={`w-6 h-0.5 bg-white transition-opacity ${mobileMenuOpen ? 'opacity-0' : ''}`} />
            <div className={`w-6 h-0.5 bg-white transition-transform ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0F2040] border-t border-slate-700 p-6 space-y-4">
            <button onClick={() => scrollToSection('how-it-works')} className="block w-full text-left text-slate-300 py-2">How it works</button>
            <button onClick={() => scrollToSection('features')} className="block w-full text-left text-slate-300 py-2">Features</button>
            <button onClick={() => scrollToSection('for-colleges')} className="block w-full text-left text-slate-300 py-2">For colleges</button>
            <button onClick={() => navigate('/colleges?tab=all')} className="block w-full text-left text-slate-300 py-2">Browse colleges</button>
            <hr className="border-slate-700" />
            <button onClick={() => navigate('/login')} className="block w-full text-center px-4 py-2 text-sm border border-slate-600 rounded-lg">Sign in</button>
            <button onClick={() => navigate('/signup')} className="block w-full text-center px-4 py-2 bg-[#C9A84C] text-[#0A1628] rounded-full text-sm font-semibold">Start for free</button>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen bg-[#0A1628] flex items-center overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 gradient-blob" />

        <div className="max-w-7xl mx-auto px-6 py-20 w-full grid md:grid-cols-5 gap-12 items-center relative z-10">
          <div className="md:col-span-3">
            <div className="mb-8">
              <span className="text-xs font-semibold tracking-widest text-[#C9A84C] uppercase">India's MBA Application Hub</span>
            </div>
            <h1 className="text-display mb-6 leading-tight">
              One place for every<br />MBA application.
            </h1>
            <p className="text-lg text-slate-400 mb-10 max-w-lg leading-relaxed">
              Discover colleges, build your profile, track deadlines, and apply — without switching between ten portals.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <button onClick={() => navigate('/signup')} className="px-8 py-3 bg-[#C9A84C] text-[#0A1628] rounded-full font-semibold hover:bg-amber-300 transition w-fit">
                Start for free
              </button>
              <button onClick={() => navigate('/colleges?tab=all')} className="px-8 py-3 border-2 border-white text-white rounded-full font-semibold hover:bg-white/10 transition w-fit">
                Browse colleges →
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <span>🔒</span>
                <span>Secure & private</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🎓</span>
                <span>Built for CAT aspirants</span>
              </div>
              <div className="flex items-center gap-2">
                <span>⭐</span>
                <span>500+ students tracking applications</span>
              </div>
            </div>
          </div>

          {/* Floating cards */}
          <div className="md:col-span-2 relative h-96 hidden md:block">
            {/* Back card */}
            <div className="absolute top-20 right-0 w-full bg-[#0F2040] rounded-2xl p-4 border border-slate-700 shadow-2xl" style={{ transform: 'rotate(5deg)', zIndex: 1 }}>
              <div className="text-xs text-slate-500 mb-3 font-semibold">DEADLINES</div>
              <div className="space-y-2">
                {['IIM A', 'XLRI', 'ISB'].map(col => (
                  <div key={col} className="flex justify-between items-center py-1.5 border-b border-slate-700 text-xs">
                    <span className="text-slate-300">{col}</span>
                    <span className="text-amber-500">May 15</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Front card */}
            <div className="absolute top-0 w-full bg-[#0F2040] rounded-2xl p-5 border border-slate-700 shadow-2xl float-card" style={{ zIndex: 2 }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-sm">My Applications</h3>
                <span className="text-xs px-2 py-1 bg-slate-700 rounded-full">5 tracked</span>
              </div>
              <div className="space-y-3 mb-4">
                {[
                  { name: 'IIM Ahmedabad', status: 'Applied', color: 'bg-blue-500/20 text-blue-400' },
                  { name: 'IIM Bangalore', status: 'Interview', color: 'bg-amber-500/20 text-amber-400' },
                  { name: 'XLRI', status: 'Offer', color: 'bg-emerald-500/20 text-emerald-400' },
                ].map(app => (
                  <div key={app.name} className="flex justify-between items-center py-2 border-b border-slate-700">
                    <span className="text-xs text-slate-300">{app.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${app.color}`}>{app.status}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-700 text-center">
                <div>
                  <div className="text-xl font-bold text-slate-200">2</div>
                  <div className="text-xs text-slate-500">In Progress</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-200">1</div>
                  <div className="text-xs text-slate-500">Interview</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-200">1</div>
                  <div className="text-xs text-slate-500">Offer</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-[#C9A84C] py-16">
        <ScrollTrigger>
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8">
            {[
              { label: 'CAT aspirants/year', value: '250,000+' },
              { label: 'MBA colleges listed', value: '71' },
              { label: 'Placement data verified', value: '100%' },
              { label: 'Free to get started', value: '✓' },
            ].map((stat, i) => (
              <div key={i} className="text-center fade-up">
                <div className="text-4xl font-bold text-[#0A1628] mb-2">{stat.value}</div>
                <div className="text-sm text-[#0A1628]/80">{stat.label}</div>
              </div>
            ))}
          </div>
        </ScrollTrigger>
      </section>

      {/* PROBLEM */}
      <section id="how-it-works" className="bg-white py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest text-[#C9A84C] uppercase">THE PROBLEM</span>
            <h2 className="text-heading text-[#0A1628] mt-4">
              MBA applications are scattered.<br />Your attention shouldn't be.
            </h2>
          </div>

          <ScrollTrigger>
            <div className="grid md:grid-cols-2 gap-8">
              {[
                { icon: '🏛', title: 'Different portals', desc: 'Every college has its own process and portal' },
                { icon: '🔄', title: 'Repeated forms', desc: 'Same details entered again and again' },
                { icon: '⏰', title: 'Missed deadlines', desc: 'Important dates slip through the chaos' },
                { icon: '📁', title: 'Lost documents', desc: 'Files everywhere, never where you need them' },
              ].map((item, i) => (
                <div key={i} className="p-8 bg-white border border-slate-200 rounded-2xl card-hover fade-up">
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <h3 className="text-lg font-semibold text-[#0A1628] mb-2">{item.title}</h3>
                  <p className="text-slate-600 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </ScrollTrigger>
        </div>
      </section>

      {/* SOLUTION FLOW */}
      <section className="bg-[#0A1628] py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-heading text-white">One organised flow.<br />Start to finish.</h2>
            <p className="text-slate-400 mt-4 max-w-lg mx-auto">From discovery to offer letter — Unidex handles the journey.</p>
          </div>

          <ScrollTrigger>
            <div className="grid md:grid-cols-5 gap-8 relative">
              {/* Connecting line */}
              <div className="hidden md:block absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-[#C9A84C] via-[#C9A84C] to-transparent" />

              {[
                { num: '1', icon: '🔍', title: 'Discover', desc: 'Find colleges' },
                { num: '2', icon: '👤', title: 'Profile', desc: 'Your details' },
                { num: '3', icon: '📁', title: 'Documents', desc: 'All in one' },
                { num: '4', icon: '✍️', title: 'Apply', desc: 'Smart guide' },
                { num: '5', icon: '🎯', title: 'Track', desc: 'Get offers' },
              ].map((step, i) => (
                <div key={i} className="relative text-center fade-up" style={{ transitionDelay: `${i * 150}ms` }}>
                  <div className="w-16 h-16 bg-[#C9A84C] rounded-full flex items-center justify-center font-bold text-[#0A1628] mb-4 mx-auto text-xl relative z-10">
                    {step.num}
                  </div>
                  <div className="text-2xl mb-2">{step.icon}</div>
                  <h3 className="font-semibold text-white mb-1">{step.title}</h3>
                  <p className="text-xs text-slate-400">{step.desc}</p>
                </div>
              ))}
            </div>
          </ScrollTrigger>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-[#F8F9FA] py-24">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollTrigger>
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                {[
                  'Personalised college matches based on CAT score',
                  'One profile reused across all applications',
                  'Document vault — resume, transcripts, photos',
                  'Deadline reminders — 7, 3, 1 day before',
                  'AI form fill (coming soon)',
                  'Application status tracker',
                ].map((feature, i) => (
                  <div key={i} className="flex gap-4 fade-up">
                    <span className="text-[#C9A84C] font-bold flex-shrink-0">✓</span>
                    <span className="text-[#0A1628]">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80"
                  alt="Product"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
            </div>
          </ScrollTrigger>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="bg-[#0A1628] py-24">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollTrigger>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="rounded-2xl overflow-hidden border-4 border-[#C9A84C] shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&q=80"
                  alt="Students"
                  className="w-full h-auto"
                />
              </div>

              <div>
                <blockquote className="text-2xl text-white italic mb-6 leading-relaxed">
                  "Finally, everything I need for my MBA applications in one place. The deadline reminders alone saved me."
                </blockquote>
                <p className="text-slate-400 mb-8">— CAT 2024 aspirant, 98.6 percentile</p>
                <div className="space-y-3 text-sm text-slate-300">
                  <div className="flex gap-2">
                    <span>🎯</span>
                    <span>Focus on your goals</span>
                  </div>
                  <div className="flex gap-2">
                    <span>⚡</span>
                    <span>Save time & effort</span>
                  </div>
                  <div className="flex gap-2">
                    <span>✅</span>
                    <span>Apply with confidence</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollTrigger>
        </div>
      </section>

      {/* FOR COLLEGES */}
      <section id="for-colleges" className="bg-[#C9A84C] py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-heading text-[#0A1628] mb-4">Partner with Unidex</h2>
          <p className="text-lg text-[#0A1628]/80 mb-8 max-w-2xl mx-auto">
            Reach thousands of serious MBA applicants actively researching and tracking applications.
          </p>
          <a
            href="mailto:colleges@unidex.co.in"
            className="inline-block px-8 py-3 bg-[#0A1628] text-[#C9A84C] rounded-full font-semibold hover:bg-[#0F2040] transition">
            Get in touch →
          </a>
        </div>
      </section>

      {/* VISION + MISSION */}
      <section className="bg-white py-24">
        <div className="max-w-5xl mx-auto px-6">
          <ScrollTrigger>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-12 bg-[#0A1628] rounded-2xl text-white">
                <div className="text-4xl mb-4">⭐</div>
                <h3 className="text-2xl font-bold mb-4">Vision</h3>
                <p className="text-slate-300 leading-relaxed">To become India's trusted application infrastructure for higher education.</p>
              </div>
              <div className="p-12 bg-white rounded-2xl border-2 border-[#C9A84C]">
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="text-2xl font-bold text-[#0A1628] mb-4">Mission</h3>
                <p className="text-slate-600 leading-relaxed">To help every MBA aspirant discover, complete, and track their applications with confidence.</p>
              </div>
            </div>
          </ScrollTrigger>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-[#0A1628] py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <ScrollTrigger>
            <h2 className="text-display text-white mb-6 fade-up">
              Start your MBA journey<br />with clarity.
            </h2>
            <p className="text-lg text-slate-400 mb-10 fade-up">
              Join thousands of aspirants already using Unidex. Free to get started.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 fade-up">
              <button onClick={() => navigate('/signup')} className="px-8 py-3 bg-[#C9A84C] text-[#0A1628] rounded-full font-semibold hover:bg-amber-300 transition">
                Start for free
              </button>
              <button onClick={() => navigate('/login')} className="px-8 py-3 border-2 border-white text-white rounded-full font-semibold hover:bg-white/10 transition">
                Sign in
              </button>
            </div>

            <p className="text-xs text-slate-500 fade-up">
              No credit card required · Takes 2 minutes · Cancel anytime
            </p>
          </ScrollTrigger>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#060E1A] border-t border-slate-800 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-[#C9A84C] rounded" />
                <span className="font-bold">Unidex</span>
              </div>
              <p className="text-xs text-slate-500">MBA Application Hub</p>
            </div>

            {[
              { title: 'Product', links: ['How it works', 'Features', 'Browse colleges', 'Pricing'] },
              { title: 'Company', links: ['About us', 'For colleges', 'Careers', 'Blog'] },
              { title: 'Support', links: ['Help center', 'Contact', 'Status', 'Docs'] },
              { title: 'Legal', links: ['Privacy', 'Terms', 'Security'] },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="font-semibold text-sm mb-4">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(link => (
                    <li key={link}>
                      <a href="#" className="text-xs text-slate-500 hover:text-white transition">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <p>© 2026 Unidex. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition">Instagram</a>
              <a href="#" className="hover:text-white transition">LinkedIn</a>
              <a href="#" className="hover:text-white transition">Twitter</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Scroll trigger component for fade-in animations
function ScrollTrigger({ children }) {
  const ref = useRef(null)
  const observerRef = useRef(null)

  useEffect(() => {
    const target = ref.current
    if (!target) return

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('.fade-up').forEach(el => {
              el.classList.add('visible')
            })
            if (observerRef.current) {
              observerRef.current.unobserve(entry.target)
            }
          }
        })
      },
      { threshold: 0.1 }
    )

    observerRef.current = observer
    observer.observe(target)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [])

  return <div ref={ref}>{children}</div>
}
