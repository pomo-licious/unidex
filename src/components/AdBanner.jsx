// ─────────────────────────────────────────────────────────────────────────────
// src/components/AdBanner.jsx — Mock ad slots for investor demo
//
// Two components exported:
//   <LeaderboardAd />  — full-width strip (728×90 equivalent) at top of pages
//   <SidebarAds />     — stacked rectangle cards (300×250 equivalent) in sidebar
//
// These are shown ONLY when the user is demo@unidex.in (isDemo = true).
// All other users see nothing — no placeholder box, no empty space.
//
// // TODO: replace with real ad network (Google AdSense or direct sales)
// //       when live traffic reaches 1,000+ MAU
//
// Advertiser slots represented here are fictional for demo purposes.
// ─────────────────────────────────────────────────────────────────────────────


// ─── LEADERBOARD ─────────────────────────────────────────────────────────────
// Full-width strip, sits at the top of the main content area on every page.
// Styled to look like a real premium ad unit, not a placeholder box.

export function LeaderboardAd() {
  return (
    <div className="w-full bg-gradient-to-r from-slate-50 to-blue-50 border-b border-blue-100">
      <div className="px-6 py-3 flex items-center gap-4">

        {/* "Ad" label — required by ad network conventions */}
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0 border border-gray-300 rounded px-1 py-0.5">
          Ad
        </span>

        {/* Brand logo */}
        <div className="w-9 h-9 rounded-lg bg-blue-700 flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-white font-black text-sm">T</span>
        </div>

        {/* Brand name + tagline */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 leading-tight">TIME Institute</p>
          <p className="text-xs text-gray-500 truncate">India's #1 CAT coaching · 10,000+ IIM selections since 1992</p>
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-8 w-px bg-blue-200 shrink-0" />

        {/* Star rating + batch info */}
        <div className="hidden sm:block text-center shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-yellow-400 text-xs">★★★★★</span>
            <span className="text-xs font-semibold text-gray-700">4.8</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">CAT 2026 · Batch starts June 15</p>
        </div>

        {/* Divider */}
        <div className="hidden md:block h-8 w-px bg-blue-200 shrink-0" />

        {/* Price */}
        <div className="hidden md:block text-right shrink-0">
          <p className="text-[11px] text-gray-400">Starting at</p>
          <p className="text-sm font-black text-blue-700">₹45,000</p>
        </div>

        {/* CTA button */}
        <button className="shrink-0 ml-auto px-4 py-2 bg-blue-700 text-white text-xs font-bold rounded-lg hover:bg-blue-800 active:scale-95 transition-all shadow-sm">
          Enroll Now →
        </button>
      </div>
    </div>
  )
}


// ─── SIDEBAR RECTANGLE ADS ────────────────────────────────────────────────────
// Three stacked ad cards shown in the right column of
// CollegeDirectory and AppTracker pages (demo mode only).

const SIDEBAR_ADS = [
  {
    id:        1,
    brand:     'TIME Institute',
    logo:      'T',
    logoStyle: 'bg-blue-700',
    tagline:   'CAT 2026 Weekend Batch',
    detail:    'Online + Offline classes · Delhi, Mumbai, Bengaluru, Hyderabad',
    stars:     4.8,
    reviews:   '12,400 reviews',
    price:     '₹45,000',
    cta:       'Book Free Demo',
    ctaStyle:  'bg-blue-700 hover:bg-blue-800',
    tag:       'Most Popular',
    tagStyle:  'bg-blue-100 text-blue-700',
  },
  {
    id:        2,
    brand:     'Career Launcher',
    logo:      'CL',
    logoStyle: 'bg-orange-600',
    tagline:   'CAT 2026 Mock Test Series',
    detail:    '100+ full-length mocks · Detailed analysis · Video solutions',
    stars:     4.6,
    reviews:   '8,900 reviews',
    price:     '₹2,999',
    cta:       'Start Free Trial',
    ctaStyle:  'bg-orange-600 hover:bg-orange-700',
    tag:       'Best Value',
    tagStyle:  'bg-orange-100 text-orange-700',
  },
  {
    id:        3,
    brand:     'ISB Executive MBA',
    logo:      'ISB',
    logoStyle: 'bg-emerald-700',
    tagline:   'PGP for Executives',
    detail:    'GMAT waiver available · 1-year programme · Hyderabad + Mumbai',
    stars:     4.9,
    reviews:   '3,200 reviews',
    price:     '₹38.5L',
    cta:       'Request Info',
    ctaStyle:  'bg-emerald-700 hover:bg-emerald-800',
    tag:       'Premium',
    tagStyle:  'bg-emerald-100 text-emerald-700',
  },
]

export function SidebarAds() {
  return (
    <div className="space-y-4">
      {SIDEBAR_ADS.map(ad => (
        <div key={ad.id}
          className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3 shadow-sm">

          {/* Header: "Advertisement" label + tier tag */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border border-gray-200 rounded px-1 py-0.5">
              Advertisement
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ad.tagStyle}`}>
              {ad.tag}
            </span>
          </div>

          {/* Brand row: logo + name + stars */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${ad.logoStyle} flex items-center justify-center shrink-0 shadow-sm`}>
              <span className="text-white font-black text-xs leading-none">{ad.logo}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">{ad.brand}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-yellow-400 text-xs leading-none">★</span>
                <span className="text-xs font-semibold text-gray-700">{ad.stars}</span>
                <span className="text-xs text-gray-400">· {ad.reviews}</span>
              </div>
            </div>
          </div>

          {/* Ad copy */}
          <div>
            <p className="text-xs font-semibold text-gray-800 leading-snug">{ad.tagline}</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{ad.detail}</p>
          </div>

          {/* Price + CTA */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Starting at</p>
              <p className="text-sm font-black text-gray-900">{ad.price}</p>
            </div>
            <button className={`px-3 py-1.5 ${ad.ctaStyle} text-white text-xs font-bold rounded-lg transition-colors active:scale-95`}>
              {ad.cta}
            </button>
          </div>
        </div>
      ))}

      {/* Small ad network attribution */}
      <p className="text-center text-[10px] text-gray-300">
        Ads by Unidex Partner Network
      </p>
    </div>
  )
}
