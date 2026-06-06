import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LandingPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    // Check auth state
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user || null)
      setLoading(false)
      // Redirect logged-in users to profile
      if (user) {
        navigate('/profile', { replace: true })
      }
    })
  }, [navigate])

  if (loading) return null

  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: 'smooth' })
    setMobileMenuOpen(false)
  }

  return (
    <div className="bg-[#0A1628] text-white">
      {/* NAV BAR */}
      <nav className="sticky top-0 z-50 bg-[#0A1628]/95 backdrop-blur border-b border-[#0F2040]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <div className="w-8 h-8 bg-[#C9A84C] rounded-full flex items-center justify-center text-[#0A1628]">U</div>
            <span>Unidex</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('how-it-works')} className="text-[#94A3B8] hover:text-white transition">How it works</button>
            <button onClick={() => scrollToSection('features')} className="text-[#94A3B8] hover:text-white transition">Features</button>
            <button onClick={() => scrollToSection('for-colleges')} className="text-[#94A3B8] hover:text-white transition">For colleges</button>
            <button onClick={() => navigate('/colleges')} className="text-[#94A3B8] hover:text-white transition">Browse colleges</button>
          </div>

          {/* Right side buttons */}
          <div className="hidden md:flex items-center gap-4">
            <button onClick={() => navigate('/login')} className="px-4 py-2 text-white border border-[#94A3B8] rounded-lg hover:bg-[#0F2040] transition">
              Sign in
            </button>
            <button onClick={() => navigate('/signup')} className="px-6 py-2 bg-[#C9A84C] text-[#0A1628] rounded-lg font-semibold hover:bg-[#D4B366] transition">
              Start for free
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1.5"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <div className={`w-6 h-0.5 bg-white transition ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <div className={`w-6 h-0.5 bg-white transition ${mobileMenuOpen ? 'opacity-0' : ''}`} />
            <div className={`w-6 h-0.5 bg-white transition ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0F2040] border-t border-[#1A3A5C] p-6 space-y-4">
            <button onClick={() => scrollToSection('how-it-works')} className="block w-full text-left text-[#94A3B8] hover:text-white py-2">How it works</button>
            <button onClick={() => scrollToSection('features')} className="block w-full text-left text-[#94A3B8] hover:text-white py-2">Features</button>
            <button onClick={() => scrollToSection('for-colleges')} className="block w-full text-left text-[#94A3B8] hover:text-white py-2">For colleges</button>
            <button onClick={() => navigate('/colleges')} className="block w-full text-left text-[#94A3B8] hover:text-white py-2">Browse colleges</button>
            <hr className="border-[#1A3A5C]" />
            <button onClick={() => navigate('/login')} className="block w-full text-center px-4 py-2 text-white border border-[#94A3B8] rounded-lg">Sign in</button>
            <button onClick={() => navigate('/signup')} className="block w-full text-center px-4 py-2 bg-[#C9A84C] text-[#0A1628] rounded-lg font-semibold">Start for free</button>
          </div>
        )}
      </nav>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-32 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Track all your MBA applications from one place.
          </h1>
          <p className="text-xl text-[#94A3B8] mb-8 leading-relaxed">
            Unidex helps students discover colleges, manage documents, complete applications, and stay on top of deadlines — without the chaos.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <button onClick={() => navigate('/signup')} className="px-8 py-4 bg-[#C9A84C] text-[#0A1628] rounded-lg font-semibold hover:bg-[#D4B366] transition">
              Start for free
            </button>
            <button onClick={() => navigate('/colleges')} className="px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-[#0F2040] transition">
              Browse colleges →
            </button>
          </div>

          <div className="space-y-3 text-sm text-[#94A3B8]">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔒</span>
              <span>Secure & private</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🎓</span>
              <span>Built for MBA aspirants</span>
            </div>
          </div>
        </div>

        <div className="hidden md:block">
          <div className="bg-[#0F2040] rounded-xl p-8 border border-[#1A3A5C]">
            <div className="text-sm font-semibold text-[#94A3B8] mb-6">Your Application Tracker</div>
            <div className="space-y-4">
              {['IIM Ahmedabad', 'IIM Bangalore', 'SPJIMR Mumbai'].map((college) => (
                <div key={college} className="flex items-center justify-between p-4 bg-[#0A1628] rounded-lg border border-[#1A3A5C]">
                  <span className="font-medium">{college}</span>
                  <span className="text-xs px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full">In Progress</span>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-[#1A3A5C]/50 rounded-lg text-sm text-[#94A3B8]">
              <div className="flex justify-between mb-2">
                <span>Applications</span>
                <span className="text-[#C9A84C]">3</span>
              </div>
              <div className="flex justify-between">
                <span>Pending Deadlines</span>
                <span className="text-[#C9A84C]">1</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section id="how-it-works" className="bg-[#0F2040] py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-[#C9A84C] font-semibold mb-2">THE PROBLEM</div>
            <h2 className="text-4xl md:text-5xl font-bold">MBA applications are scattered across too many places.</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: '🏛', title: 'Different college portals', desc: 'Every college has a different portal and process' },
              { icon: '🔄', title: 'Repeated information', desc: 'Enter the same details again and again' },
              { icon: '📅', title: 'Missed deadlines', desc: 'Important dates slip by in the chaos' },
              { icon: '📁', title: 'Scattered documents', desc: 'Files are everywhere but never where needed' },
            ].map((item, i) => (
              <div key={i} className="p-8 bg-[#0A1628] rounded-xl border border-[#1A3A5C] hover:border-[#C9A84C] transition">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-[#94A3B8]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTION FLOW SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-32">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
          Unidex brings the journey into one organised flow.
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-0">
          {[
            { num: '1', icon: '🔍', title: 'Discover colleges', desc: 'Find your fit' },
            { num: '2', icon: '👤', title: 'Create profile', desc: 'Your details' },
            { num: '3', icon: '📁', title: 'Upload documents', desc: 'All in one place' },
            { num: '4', icon: '✍️', title: 'Complete applications', desc: 'Smart guidance' },
            { num: '5', icon: '🎯', title: 'Track deadlines', desc: 'Never miss one' },
          ].map((step, i) => (
            <div key={i} className="relative flex flex-col items-center text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-[#C9A84C] rounded-full flex items-center justify-center font-bold text-[#0A1628] mb-4 text-2xl">
                {step.num}
              </div>
              <div className="text-2xl mb-2">{step.icon}</div>
              <h3 className="font-semibold mb-1">{step.title}</h3>
              <p className="text-sm text-[#94A3B8]">{step.desc}</p>
              {i < 4 && <div className="hidden md:block absolute top-8 -right-2 text-[#C9A84C] text-2xl">→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="bg-[#0F2040] py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold">Everything you need to apply with confidence.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '📧', title: 'College discovery', desc: 'Filter and compare top MBA colleges based on your preferences' },
              { icon: '👤', title: 'One student profile', desc: 'Create once and reuse across multiple applications' },
              { icon: '📁', title: 'Document management', desc: 'Organise, store and reuse documents securely' },
              { icon: '✅', title: 'Application support', desc: 'Smart prompts and guidelines to help submit accurate applications' },
              { icon: '🔔', title: 'Deadline reminders', desc: 'Never miss an important date with timely alerts' },
              { icon: '⚡', title: 'Missing info checks', desc: 'We highlight missing fields before submission' },
            ].map((feat, i) => (
              <div key={i} className="p-8 bg-[#0A1628] rounded-xl border border-[#1A3A5C] hover:border-[#C9A84C] transition">
                <div className="text-4xl mb-4">{feat.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feat.title}</h3>
                <p className="text-[#94A3B8]">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-32 grid md:grid-cols-2 gap-12 items-center">
        <div className="bg-gradient-to-br from-[#0F2040] to-[#1A3A5C] rounded-xl h-80 flex items-center justify-center border border-[#1A3A5C]">
          <div className="text-center">
            <div className="text-6xl mb-4">🎓</div>
            <div className="text-[#94A3B8]">Indian MBA students</div>
          </div>
        </div>

        <div>
          <p className="text-xl text-[#94A3B8] mb-8 leading-relaxed">
            Unidex is designed with real MBA applicants in mind. From your first college search to the final submit button, we simplify every step so you can focus on what matters most — preparing for your future.
          </p>

          <div className="space-y-4">
            {[
              { icon: '🎯', label: 'Focus on your goals' },
              { icon: '⚡', label: 'Save time & effort' },
              { icon: '✅', label: 'Apply with confidence' },
            ].map((badge, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-3xl">{badge.icon}</span>
                <span className="text-lg font-medium">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR COLLEGES SECTION */}
      <section id="for-colleges" className="bg-[#C9A84C] py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-[#0A1628] mb-4">
            Are you a college or coaching institute?
          </h2>
          <p className="text-lg text-[#0A1628]/80 mb-8">
            Partner with Unidex to reach thousands of serious MBA applicants actively tracking applications.
          </p>
          <a
            href="mailto:colleges@unidex.co.in"
            className="inline-block px-8 py-4 bg-[#0A1628] text-[#C9A84C] rounded-lg font-semibold hover:bg-[#0F2040] transition">
            Get in touch →
          </a>
        </div>
      </section>

      {/* VISION & MISSION SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-32 grid md:grid-cols-2 gap-8">
        {[
          { title: 'Vision', text: 'To become India\'s trusted application infrastructure for higher education.' },
          { title: 'Mission', text: 'To help students discover, complete, and track their applications from one place.' },
        ].map((item, i) => (
          <div key={i} className="p-8 bg-[#0F2040] rounded-xl border border-[#1A3A5C]">
            <h3 className="text-2xl font-bold text-[#C9A84C] mb-4">{item.title}</h3>
            <p className="text-lg text-[#94A3B8] leading-relaxed">{item.text}</p>
          </div>
        ))}
      </section>

      {/* FINAL CTA SECTION */}
      <section className="bg-[#0F2040] py-20 md:py-32 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            Start managing your MBA applications with clarity.
          </h2>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button onClick={() => navigate('/signup')} className="px-8 py-4 bg-[#C9A84C] text-[#0A1628] rounded-lg font-semibold hover:bg-[#D4B366] transition">
              Start for free
            </button>
            <button onClick={() => navigate('/login')} className="px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-[#1A3A5C] transition">
              Sign in to Unidex
            </button>
          </div>

          <p className="text-[#94A3B8]">
            Join thousands of MBA aspirants · Secure · Private · Built for you
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#1A3A5C] py-16 bg-[#0A1628]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-[#C9A84C] rounded-full flex items-center justify-center text-[#0A1628] text-sm font-bold">U</div>
                <span className="font-bold">Unidex</span>
              </div>
              <p className="text-sm text-[#94A3B8]">Your MBA application companion</p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-[#94A3B8]">
                <li><a href="#how-it-works" className="hover:text-white transition">How it works</a></li>
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#for-colleges" className="hover:text-white transition">For colleges</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-[#94A3B8]">
                <li><a href="#" className="hover:text-white transition">About us</a></li>
                <li><a href="#for-colleges" className="hover:text-white transition">For colleges</a></li>
                <li><a href="#" className="hover:text-white transition">Careers</a></li>
                <li><a href="#" className="hover:text-white transition">Privacy policy</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-[#94A3B8]">
                <li><a href="#" className="hover:text-white transition">Help center</a></li>
                <li><a href="mailto:support@unidex.co.in" className="hover:text-white transition">Contact us</a></li>
                <li><a href="#" className="hover:text-white transition">Privacy policy</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Follow us</h4>
              <ul className="space-y-2 text-sm text-[#94A3B8]">
                <li><a href="#" className="hover:text-white transition">Instagram</a></li>
                <li><a href="#" className="hover:text-white transition">LinkedIn</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[#1A3A5C] pt-8 text-center text-sm text-[#94A3B8]">
            <p>© 2025 Unidex. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
