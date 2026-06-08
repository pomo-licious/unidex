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

  return (
    <div className="bg-[#0A1628] text-white overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
        * { font-family: 'Space Grotesk', system-ui, sans-serif; }
        .fade-up { opacity: 0; transform: translateY(30px); transition: opacity 0.6s ease-out, transform 0.6s ease-out; }
        .fade-up.visible { opacity: 1; transform: translateY(0); }
        .fade-up.visible:nth-child(1) { transition-delay: 0ms; }
        .fade-up.visible:nth-child(2) { transition-delay: 100ms; }
        .fade-up.visible:nth-child(3) { transition-delay: 200ms; }
        .fade-up.visible:nth-child(4) { transition-delay: 300ms; }
      `}</style>

      {/* NAV */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 border-b border-slate-700 ${navScrolled ? 'bg-[#0A1628]/95 backdrop-blur' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <div className="w-7 h-7 bg-[#C9A84C] rounded" />
            <span>Unidex</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('how-it-works')} className="text-sm text-slate-400 hover:text-white transition">How it works</button>
            <button onClick={() => scrollToSection('features')} className="text-sm text-slate-400 hover:text-white transition">Features</button>
            <button onClick={() => scrollToSection('for-colleges')} className="text-sm text-slate-400 hover:text-white transition">For colleges</button>
            <button onClick={() => navigate('/colleges?tab=all')} className="text-sm text-slate-400 hover:text-white transition">Browse colleges</button>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button onClick={() => navigate('/login')} className="px-4 py-2 text-sm border border-slate-600 rounded-lg hover:border-white transition">Sign in</button>
            <button onClick={() => navigate('/signup')} className="px-6 py-2 bg-[#C9A84C] text-[#0A1628] rounded-full text-sm font-semibold hover:scale-[1.02] hover:brightness-95 transition-all duration-200">Start for free</button>
          </div>

          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <div className={`w-6 h-0.5 bg-white mb-1.5 transition-transform ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <div className={`w-6 h-0.5 bg-white mb-1.5 transition-opacity ${mobileMenuOpen ? 'opacity-0' : ''}`} />
            <div className={`w-6 h-0.5 bg-white transition-transform ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>

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

      {/* HERO — Asymmetric layout */}
      <section className="min-h-screen bg-[#0A1628] flex items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-b from-[#C9A84C]/10 to-transparent rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-6 w-full grid md:grid-cols-5 gap-12 items-center relative z-10">
          {/* Left: 3/5 width */}
          <div className="md:col-span-3">
            <div className="mb-8">
              <span className="text-[#C9A84C] text-sm uppercase tracking-wider font-semibold">India's MBA Application Hub</span>
              <div className="w-12 h-px bg-[#C9A84C] mt-3" />
            </div>

            <h1 className="text-[80px] leading-[1.05] tracking-[-0.03em] font-bold mb-8">One place for every MBA application.</h1>

            <p className="text-lg leading-relaxed text-slate-300 mb-10 max-w-lg">Discover colleges, build your profile, track deadlines, and apply — without switching between ten portals.</p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <button onClick={() => navigate('/signup')} className="px-8 py-3 bg-[#C9A84C] text-[#0A1628] rounded-full font-semibold hover:scale-[1.02] hover:brightness-95 transition-all duration-200 w-fit">Start for free</button>
              <button onClick={() => navigate('/colleges?tab=all')} className="px-8 py-3 border-2 border-white text-white rounded-full font-semibold hover:scale-[1.02] hover:brightness-95 transition-all duration-200 w-fit">Browse colleges →</button>
            </div>

            <p className="text-sm text-slate-400">Used by aspirants targeting IIM A, B, C, ISB, XLRI and 67 more programmes.</p>
          </div>

          {/* Right: 2/5 width — Mockup */}
          <div className="md:col-span-2 hidden md:block">
            <div className="bg-[#0F2040] rounded-2xl border border-slate-700 p-5 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-sm">My Applications</h3>
                <span className="text-xs px-2 py-1 bg-slate-700 rounded-full">5 tracked</span>
              </div>

              <div className="space-y-2 mb-4">
                {[
                  { name: 'IIM Ahmedabad', status: 'Applied', color: 'bg-blue-500/20 text-blue-300' },
                  { name: 'IIM Bangalore', status: 'Interview', color: 'bg-amber-500/20 text-amber-300' },
                  { name: 'IIM Calcutta', status: 'Researching', color: 'bg-slate-500/20 text-slate-300' },
                  { name: 'XLRI Jamshedpur', status: 'Offer', color: 'bg-emerald-500/20 text-emerald-300' },
                  { name: 'ISB Hyderabad', status: 'Rejected', color: 'bg-red-500/20 text-red-300' },
                ].map(app => (
                  <div key={app.name} className="flex justify-between items-center text-xs py-1.5">
                    <span className="text-slate-300">{app.name}</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${app.color}`}>{app.status}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-600 pt-3 grid grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <div className="font-bold text-slate-200">2</div>
                  <div className="text-slate-500">Applied</div>
                </div>
                <div>
                  <div className="font-bold text-slate-200">1</div>
                  <div className="text-slate-500">Interview</div>
                </div>
                <div>
                  <div className="font-bold text-slate-200">1</div>
                  <div className="text-slate-500">Offer</div>
                </div>
                <div>
                  <div className="font-bold text-slate-200">1</div>
                  <div className="text-slate-500">Rejected</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS — Compressed spacing, 3 columns */}
      <section className="bg-[#C9A84C] py-12">
        <ScrollTrigger>
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8">
            {[
              { value: '250,000+', label: 'CAT aspirants/year' },
              { value: '71', label: 'MBA programmes in one place' },
              { value: '✓', label: 'Free to get started' },
            ].map((stat, i) => (
              <div key={i} className="text-center fade-up">
                <div className="text-4xl font-bold text-[#0A1628] mb-2">{stat.value}</div>
                <div className="text-sm text-[#0A1628]/80">{stat.label}</div>
              </div>
            ))}
          </div>
        </ScrollTrigger>
      </section>

      {/* PROBLEM — Expanded spacing */}
      <section id="how-it-works" className="bg-white py-32">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold tracking-wider text-[#C9A84C] uppercase">The problem</span>
            <h2 className="text-5xl leading-[1.1] tracking-tight font-semibold text-[#0A1628] mt-4">MBA applications are scattered. Your attention shouldn't be.</h2>
          </div>

          <ScrollTrigger>
            <div className="grid md:grid-cols-2 gap-8">
              {[
                { icon: '🏛', title: 'Different portals', desc: 'Every college has its own process and portal' },
                { icon: '🔄', title: 'Repeated forms', desc: 'Same details entered again and again' },
                { icon: '⏰', title: 'Missed deadlines', desc: 'Important dates slip through the chaos' },
                { icon: '📁', title: 'Lost documents', desc: 'Files everywhere, never where you need them' },
              ].map((item, i) => (
                <div key={i} className="p-8 bg-white border border-slate-200 rounded-2xl hover:shadow-xl hover:scale-[1.02] transition-all duration-200 fade-up">
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
            <h2 className="text-5xl leading-[1.1] tracking-tight font-semibold text-white">One organised flow. Start to finish.</h2>
            <p className="text-lg leading-relaxed text-slate-300 mt-4 max-w-lg mx-auto">From discovery to offer letter — Unidex handles the journey.</p>
          </div>

          <ScrollTrigger>
            <div className="grid md:grid-cols-5 gap-8 relative">
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

      {/* FEATURES — Standard spacing */}
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
                    <span className="text-emerald-400 font-bold flex-shrink-0">✓</span>
                    <span className="text-[#0A1628]">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img src="https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80" alt="Product" className="w-full h-auto" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
            </div>
          </ScrollTrigger>
        </div>
      </section>

      {/* SOCIAL PROOF — Expanded spacing */}
      <section className="bg-[#0A1628] py-32">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollTrigger>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80" alt="Students" className="w-full h-auto" />
              </div>

              <div>
                <blockquote className="text-2xl italic text-white mb-6 leading-relaxed">"Finally, everything I need for my MBA applications in one place. The deadline reminders alone saved me."</blockquote>
                <p className="text-slate-400 mb-8">— CAT 2024 aspirant, 98.6 percentile</p>
                <div className="space-y-3 text-sm text-slate-300">
                  <div className="flex gap-2"><span>🎯</span><span>Focus on your goals</span></div>
                  <div className="flex gap-2"><span>⚡</span><span>Save time & effort</span></div>
                  <div className="flex gap-2"><span>✅</span><span>Apply with confidence</span></div>
                </div>
              </div>
            </div>
          </ScrollTrigger>
        </div>
      </section>

      {/* FOR COLLEGES */}
      <section id="for-colleges" className="bg-[#C9A84C] py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-5xl leading-[1.1] tracking-tight font-semibold text-[#0A1628] mb-4">Partner with Unidex</h2>
          <p className="text-lg leading-relaxed text-[#0A1628]/80 mb-8 max-w-2xl mx-auto">Reach thousands of serious MBA applicants actively researching and tracking applications.</p>
          <a href="mailto:colleges@unidex.co.in" className="inline-block px-8 py-3 bg-[#0A1628] text-[#C9A84C] rounded-full font-semibold hover:scale-[1.02] hover:brightness-95 transition-all duration-200">Get in touch →</a>
        </div>
      </section>

      {/* VISION + MISSION — Standard spacing */}
      <section className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-6">
          <ScrollTrigger>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-12 bg-[#0A1628] rounded-2xl text-white">
                <div className="text-4xl mb-4">⭐</div>
                <h3 className="text-5xl leading-[1.1] tracking-tight font-semibold mb-4">Vision</h3>
                <p className="text-slate-300 leading-relaxed">To become India's trusted application infrastructure for higher education.</p>
              </div>
              <div className="p-12 bg-white rounded-2xl border-2 border-[#C9A84C]">
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="text-5xl leading-[1.1] tracking-tight font-semibold text-[#0A1628] mb-4">Mission</h3>
                <p className="text-slate-600 leading-relaxed">To help every MBA aspirant discover, complete, and track their applications with confidence.</p>
              </div>
            </div>
          </ScrollTrigger>
        </div>
      </section>

      {/* FINAL CTA — Most space */}
      <section className="bg-[#0A1628] py-40">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <ScrollTrigger>
            <h2 className="text-[80px] leading-[1.05] tracking-[-0.03em] font-bold text-white mb-6 fade-up">Start your MBA journey with clarity.</h2>
            <p className="text-lg leading-relaxed text-slate-300 mb-10 fade-up">Join thousands of aspirants already using Unidex. Free to get started.</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 fade-up">
              <button onClick={() => navigate('/signup')} className="px-8 py-3 bg-[#C9A84C] text-[#0A1628] rounded-full font-semibold hover:scale-[1.02] hover:brightness-95 transition-all duration-200">Start for free</button>
              <button onClick={() => navigate('/login')} className="px-8 py-3 border-2 border-white text-white rounded-full font-semibold hover:scale-[1.02] hover:brightness-95 transition-all duration-200">Sign in</button>
            </div>

            <p className="text-xs text-slate-500 fade-up">No credit card required · Takes 2 minutes · Cancel anytime</p>
          </ScrollTrigger>
        </div>
      </section>

      {/* RECENTLY UPDATED COLLEGES — FIX 3 */}
      <RecentlyUpdatedSection />

      {/* EMAIL CAPTURE BANNER — FIX 5 */}
      <EmailCaptureModal />

      {/* FOOTER */}
      <footer className="bg-[#060E1A] border-t border-slate-800 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-[#C9A84C] rounded" />
                <span className="font-bold">Unidex</span>
              </div>
              <p className="text-xs text-slate-500">MBA Application Hub</p>
            </div>

            {[
              { title: 'Product', links: ['How it works', 'Features', 'Browse colleges', 'Pricing'] },
              { title: 'Company', links: ['About us', 'For colleges'] },
              { title: 'Legal', links: ['Privacy', 'Terms'] },
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

            <div>
              <h4 className="font-semibold text-sm mb-4">Follow us</h4>
              <div className="space-y-2">
                <a href="#" className="block text-xs text-slate-500 hover:text-white transition">Instagram</a>
                <a href="#" className="block text-xs text-slate-500 hover:text-white transition">LinkedIn</a>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 text-center text-xs text-slate-500">
            <p>© 2026 Unidex. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ─── Recently Updated Colleges Section (FIX 3) ─────────────────────────────────
function RecentlyUpdatedSection() {
  const [colleges, setColleges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadRecentColleges() {
      try {
        const { data } = await supabase
          .from('colleges')
          .select('id, name, image_url, updated_at')
          .order('updated_at', { ascending: false })
          .limit(8)

        setColleges(data || [])
      } catch (err) {
        console.error('Error loading colleges:', err)
      } finally {
        setLoading(false)
      }
    }

    loadRecentColleges()
  }, [])

  if (loading || colleges.length === 0) return null

  return (
    <section className="bg-[#0A1628] py-16 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-6">
        <h3 className="text-2xl font-bold text-white mb-8">Recently Updated Colleges</h3>
        <div className="overflow-x-auto pb-4 -mx-6 px-6">
          <div className="flex gap-4 min-w-min">
            {colleges.map(college => (
              <div
                key={college.id}
                onClick={() => window.location.href = `/college/${college.id}`}
                className="w-48 flex-shrink-0 bg-[#0F2040] rounded-lg border border-slate-700 overflow-hidden cursor-pointer hover:border-[#C9A84C] transition group"
              >
                {college.image_url && (
                  <img
                    src={college.image_url}
                    alt={college.name}
                    className="w-full h-32 object-cover group-hover:brightness-110 transition"
                  />
                )}
                <div className="p-3">
                  <p className="text-sm font-semibold text-white truncate">{college.name}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Updated {new Date(college.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Email Capture Banner (FIX 5) ────────────────────────────────────────────────
function EmailCaptureModal() {
  const [email, setEmail] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleScroll = () => {
    const scrollPercent = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight
    if (scrollPercent > 0.6 && !isOpen && !localStorage.getItem('emailCaptureSubmitted')) {
      setIsOpen(true)
    }
  }

  useEffect(() => {
    if (localStorage.getItem('emailCaptureSubmitted')) {
      setSubmitted(true)
      return
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('email_captures')
        .insert([{ email, source: 'landing_page' }])

      if (error && error.code !== '23505') throw error // 23505 = unique constraint

      localStorage.setItem('emailCaptureSubmitted', 'true')
      setSubmitted(true)
      setTimeout(() => setIsOpen(false), 2000)
    } catch (err) {
      console.error('Error capturing email:', err)
    } finally {
      setLoading(false)
    }
  }

  const [user] = useState(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setSubmitted(true)
    })
  }, [])

  if (submitted || user) return null

  if (!isOpen) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0F2040] border-t border-slate-700 z-40 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between gap-6">
        <div>
          <p className="text-white font-semibold text-sm">Join the MBA journey</p>
          <p className="text-slate-400 text-xs mt-1">Get insider tips, college updates, and CAT prep guides.</p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="flex gap-2 flex-shrink-0">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              className="px-4 py-2 bg-[#0A1628] border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-[#C9A84C] text-[#0A1628] rounded-lg font-semibold text-sm hover:brightness-110 transition disabled:opacity-50 flex-shrink-0"
            >
              {loading ? 'Joining…' : 'Join'}
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium flex-shrink-0">
            ✓ Check your inbox!
          </div>
        )}

        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-white transition flex-shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

function ScrollTrigger({ children }) {
  const ref = useRef(null)
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible'))
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return <div ref={ref}>{children}</div>
}
