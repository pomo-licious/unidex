import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, Users, Calendar, GraduationCap, Play, Mail, Share2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function LandingPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)
  const scrollTimeoutRef = useRef(null)

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
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
          <div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#1a2744] mb-4 leading-tight">
              Track all your MBA applications from one place.
            </h1>
            <p className="text-lg text-gray-600 mb-8 font-medium">
              One profile. All your applications. Total clarity.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => navigate('/signup')} className="px-6 py-3 bg-[#c9a84c] text-white rounded-lg font-semibold hover:brightness-95 transition-all">
                Create your profile
              </button>
              <button onClick={() => scrollToSection('how-it-works')} className="px-6 py-3 border-2 border-gray-300 text-[#1a2744] rounded-lg font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                <Play className="w-4 h-4 fill-current" /> See how it works
              </button>
            </div>
          </div>

          {/* Right: Mockup Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
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
                <h3 className="text-lg font-bold text-[#1a2744] mb-4">Welcome back, Arjun 👋</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-sm font-medium text-[#1a2744]">ISB Hyderabad</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold">In progress</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-sm font-medium text-[#1a2744]">SPJIMR Mumbai</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">Submitted</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-sm font-medium text-[#1a2744]">IIM Bangalore</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-semibold">Shortlisted</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-sm font-medium text-[#1a2744]">FMS Delhi</span>
                    <span className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded font-semibold">Not started</span>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Upcoming Deadlines</p>
                  <p className="text-sm text-red-600 font-semibold">SPJIMR Round 1 — 15 May</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: TRUST BAR */}
      <section className="bg-white py-12 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: Shield, title: 'Secure & private', desc: 'Your data is encrypted and never shared' },
              { icon: Users, title: 'One profile for all', desc: 'Apply to multiple colleges at once' },
              { icon: Calendar, title: 'Deadlines in one place', desc: 'Never miss an important date' },
              { icon: GraduationCap, title: 'Built for MBA aspirants', desc: 'Designed by and for students' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <item.icon className="w-6 h-6 text-[#c9a84c] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-[#1a2744] text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-gray-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: PROBLEM */}
      <section className="bg-[#faf8f5] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#1a2744] mb-12">
            Applying is hard. Unidex makes it simple.
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '📂', title: 'Scattered information', desc: 'College details, deadlines, and requirements everywhere' },
              { icon: '⏰', title: 'Missed deadlines', desc: 'Easy to lose track of important dates' },
              { icon: '📝', title: 'Repetitive form filling', desc: 'Type the same information over and over' },
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-3xl mb-4">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-[#1a2744] mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: HOW IT WORKS */}
      <section id="how-it-works" className="bg-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          {/* Left: Mockup */}
          <div className="order-2 md:order-1">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-8 shadow-lg overflow-hidden">
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
          <div className="order-1 md:order-2">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#1a2744] mb-2">
              From shortlisting to submission.
            </h2>
            <p className="text-gray-600 mb-8 font-medium">
              Everything you need, in the right order.
            </p>

            <div className="space-y-6">
              {[
                { num: '1', title: 'Discover colleges', desc: 'Explore and shortlist the right MBA programs.' },
                { num: '2', title: 'Create one profile', desc: 'Add your details once and reuse everywhere.' },
                { num: '3', title: 'Upload documents', desc: 'Store and manage all your documents securely.' },
                { num: '4', title: 'Track deadlines', desc: 'Never miss an important date again.' },
                { num: '5', title: 'Apply with confidence', desc: 'Submit complete, accurate applications.' },
              ].map((step, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#c9a84c] text-white flex items-center justify-center font-bold text-sm">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1a2744] mb-1">{step.title}</h3>
                    <p className="text-sm text-gray-600">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: STAY ORGANIZED */}
      <section id="features" className="bg-[#faf8f5] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          {/* Left: Photo Placeholder */}
          <div className="bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl aspect-square flex items-center justify-center">
            <div className="text-center">
              <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Students at laptop</p>
            </div>
          </div>

          {/* Right: Text */}
          <div>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#1a2744] mb-8">
              Stay organized at every step.
            </h2>

            <div className="space-y-6">
              {[
                { icon: '🎯', title: 'Focus on your goals', desc: 'Let Unidex handle the organization so you can focus on your MBA goals.' },
                { icon: '⚡', title: 'Save time & effort', desc: 'Reduce the stress of managing multiple applications and deadlines.' },
                { icon: '✨', title: 'Apply with confidence', desc: 'Submit strong, complete applications to every college.' },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <span className="text-3xl">{item.icon}</span>
                  <div>
                    <h3 className="font-semibold text-[#1a2744] mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: VISION/MISSION */}
      <section id="for-colleges" className="bg-[#1a2744] text-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12">
          {/* Vision */}
          <div>
            <h3 className="text-sm font-bold text-[#c9a84c] uppercase tracking-wider mb-3">Our Vision</h3>
            <p className="text-2xl md:text-3xl font-serif font-bold mb-6">
              To become India's trusted application infrastructure for higher education.
            </p>
            <p className="text-gray-300">
              We believe that every MBA aspirant deserves tools that make their journey simpler, not more complicated.
            </p>
          </div>

          {/* Divider & Mission */}
          <div className="border-l border-[#c9a84c]/30 pl-12">
            <h3 className="text-sm font-bold text-[#c9a84c] uppercase tracking-wider mb-3">Our Mission</h3>
            <p className="text-2xl md:text-3xl font-serif font-bold mb-6">
              To help students discover, organize, and submit their applications seamlessly.
            </p>
            <p className="text-gray-300">
              Through thoughtful design and smart technology, we're building the future of MBA applications in India.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 8: FINAL CTA */}
      <section className="bg-[#faf8f5] py-16 md:py-24">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#1a2744] mb-8">
            Start managing your MBA applications with clarity.
          </h2>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/signup')} className="px-8 py-3 bg-[#c9a84c] text-white rounded-lg font-semibold hover:brightness-95 transition-all">
              Create your profile
            </button>
            <button onClick={() => navigate('/login')} className="px-8 py-3 border-2 border-[#1a2744] text-[#1a2744] rounded-lg font-semibold hover:bg-gray-50 transition-all">
              Sign in to Unidex
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 9: FOOTER */}
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
            <p>© 2026 Unidex. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
