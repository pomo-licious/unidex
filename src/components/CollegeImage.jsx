import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getCollegeImage } from '../data/collegeImages'

const safeLink = value => { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null } catch { return null } }

function CampusPlaceholder() {
  return <div className="absolute inset-0 overflow-hidden bg-[#edf2fa]" role="img" aria-label="Architectural illustration. A verified campus photograph is not yet available.">
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="h-full w-full" fill="none" aria-hidden="true">
      <rect width="640" height="360" fill="#eaf0f9"/>
      <circle cx="506" cy="68" r="115" fill="#e0e9f8"/>
      <path d="M0 300L640 196V360H0V300Z" fill="#dae5f5"/>
      <path d="M91 116H379V298H91V116Z" fill="#bccfea"/>
      <path d="M91 116L263 74H469L379 116H91Z" fill="#cbdaf0"/>
      <path d="M379 116L469 74V256L379 298V116Z" fill="#a8bedc"/>
      <path d="M112 135H359V150H112V135Z" fill="#e6eef9"/>
      {[0, 1, 2, 3, 4, 5].map(column => <g key={column}><path d={`M${115 + column * 42} 170H${137 + column * 42}V220H${115 + column * 42}V170Z`} fill="#edf3fc"/><path d={`M${115 + column * 42} 238H${137 + column * 42}V285H${115 + column * 42}V238Z`} fill="#dce8f8"/></g>)}
      <path d="M392 134L456 103V124L392 155V134ZM392 180L456 149V170L392 201V180ZM392 226L456 195V216L392 247V226Z" fill="#d1dff2"/>
      <path d="M66 300H402L491 258" stroke="#9cb4d6" strokeWidth="2"/>
      <path d="M245 300L198 360M271 300L250 360" stroke="#c3d2e9" strokeWidth="2"/>
      <circle cx="501" cy="238" r="34" fill="#c6d7ec"/>
      <path d="M501 238V292" stroke="#9bb3d4" strokeWidth="3"/>
      <circle cx="61" cy="241" r="24" fill="#ceddf0"/>
      <path d="M61 243V298" stroke="#a6bddd" strokeWidth="3"/>
      <circle cx="552" cy="88" r="5" fill="#ff762e"/>
    </svg>
    <span className="absolute bottom-3 left-3 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[9px] font-medium text-[#7086a5] backdrop-blur-sm">Campus photograph not yet available</span>
  </div>
}

export default function CollegeImage({ college, className = 'aspect-[16/10]', imageClassName = '', collegeHref, eager = false, showAttribution = true }) {
  const image = getCollegeImage(college)
  const [failedSource, setFailedSource] = useState(null)
  const unavailable = !image || failedSource === image.src
  const source = safeLink(image?.sourceUrl)
  const license = safeLink(image?.licenseUrl)
  const destination = /^\/college\/[a-zA-Z0-9_-]+$/.test(collegeHref || '') ? collegeHref : null
  const photograph = unavailable ? <CampusPlaceholder/> : <img src={image.src} srcSet={image.smallSrc ? `${image.smallSrc} 640w, ${image.src} ${image.width || 1200}w` : undefined} sizes={image.smallSrc ? (eager ? '(min-width: 1024px) calc(100vw - 344px), 100vw' : '(min-width: 1536px) 420px, (min-width: 768px) 46vw, 100vw') : undefined} alt={image.alt || `${college.name} campus`} width={image.width || 1200} height={image.height || 750} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} decoding="async" onError={() => setFailedSource(image.src)} style={{ objectPosition: image.objectPosition || '50% 50%' }} className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 motion-reduce:transition-none ${imageClassName}`}/>
  return <figure className={`relative isolate overflow-hidden bg-[#edf2fa] ${className}`}>
    {/* The photo link and attribution are siblings: licence/source anchors must
        never be nested inside the college navigation anchor. */}
    {destination ? <Link to={destination} aria-label={`Explore ${college.name}`} className="absolute inset-0 block focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#225feb]">{photograph}</Link> : photograph}
      {!unavailable && showAttribution && (image.credit || image.license) && <figcaption title="Photograph resized to WebP and cropped to fit this layout. The source link identifies the original." className="absolute bottom-2 right-2 z-10 max-w-[88%] rounded-md bg-[#071b36]/65 px-2 py-1 text-right text-[9px] leading-4 text-white/95 backdrop-blur-sm">
        {source ? <a href={source} target="_blank" rel="noopener noreferrer" className="underline decoration-white/35 underline-offset-2 hover:decoration-white">Photo: {image.credit || 'source'}</a> : <span>Photo: {image.credit}</span>}
        {image.license && <><span className="mx-1.5 text-white/50">·</span>{license ? <a href={license} target="_blank" rel="noopener noreferrer" className="underline decoration-white/35 underline-offset-2 hover:decoration-white">{image.license}</a> : <span>{image.license}</span>}</>}
      </figcaption>}
  </figure>
}
