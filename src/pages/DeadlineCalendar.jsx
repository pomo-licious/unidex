import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, Download, Loader2, Plus } from 'lucide-react'
import Layout from '../components/Layout'
import { useAdmissions } from '../context/AdmissionsContext'
import { DELHI_NCR_COLLEGES } from '../data/delhiNcrColleges'

const pad = value => String(value).padStart(2, '0')
const isoDate = (year, month, day) => `${year}-${pad(month + 1)}-${pad(day)}`
const dateText = iso => new Date(`${iso}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
function planDate(plan) {
  const snapshot = plan.college_snapshot || {}
  const college = DELHI_NCR_COLLEGES.find(item => item.id === plan.college_id) || snapshot
  const selectedProgramme = snapshot.selected_programme && typeof snapshot.selected_programme === 'object'
    ? snapshot.selected_programme
    : snapshot.programme && typeof snapshot.programme === 'object' ? snapshot.programme : null
  const programmeId = snapshot.selectedProgrammeId || snapshot.programme_id || snapshot.programme_key || selectedProgramme?.id
  const programmeName = snapshot.selectedProgrammeName || selectedProgramme?.name || (typeof snapshot.programme === 'string' ? snapshot.programme : '')
  const programmeRecords = Array.isArray(college.programmes) ? college.programmes
    : college.programmes && typeof college.programmes === 'object' ? Object.values(college.programmes)
      : selectedProgramme ? [selectedProgramme] : []
  const programme = programmeId
    ? programmeRecords.find(item => item.id === programmeId)
    : programmeName ? programmeRecords.find(item => item.name === programmeName) : null
  // An explicit programme must resolve to its own date; never inherit another programme's deadline.
  const deadline = programmeId || programmeName ? programme?.deadline : college.deadline
  const manual = plan.checklist?.deadline
  if (manual?.date && /^\d{4}-\d{2}-\d{2}$/.test(manual.date)) return { date: manual.date, source: 'Your date', sourceUrl: null, note: 'Added by you; confirm with the college.' }
  if (deadline?.date && deadline.verificationStatus === 'verified_current_cycle') return { date: deadline.date, source: 'Official deadline', sourceUrl: deadline.sourceUrl, note: deadline.label || '', closesAt: deadline.closesAt }
  return null
}
function calendarText(events) {
  const escape = value => String(value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Unidex//Admissions Calendar//EN', 'CALSCALE:GREGORIAN']
  for (const event of events) {
    const end = new Date(`${event.date}T12:00:00Z`); end.setUTCDate(end.getUTCDate() + 1)
    lines.push('BEGIN:VEVENT', `UID:${escape(event.id)}@unidex.co.in`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`, `DTSTART;VALUE=DATE:${event.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${end.toISOString().slice(0, 10).replace(/-/g, '')}`, `SUMMARY:${escape(event.name)} — application deadline`, `DESCRIPTION:${escape([event.source, event.note, event.sourceUrl, event.closesAt ? `Closes ${event.closesAt}` : null].filter(Boolean).join('\n'))}`, 'END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export default function DeadlineCalendar() {
  const { user, plans = [], loading, error, refreshPlans } = useAdmissions()
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selected, setSelected] = useState(null)
  const [exportError, setExportError] = useState('')
  useEffect(() => { document.title = 'Your calendar · Unidex' }, [])
  const events = useMemo(() => plans.map(plan => { const deadline = planDate(plan); return deadline ? { id: plan.id, name: plan.college_snapshot?.name || 'College', collegeId: plan.college_id, ...deadline } : null }).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date)), [plans])
  const unknown = plans.filter(plan => !planDate(plan))
  const now = new Date()
  const today = isoDate(now.getFullYear(), now.getMonth(), now.getDate())
  const upcoming = events.filter(event => event.date >= today)
  const year = month.getFullYear(), monthIndex = month.getMonth()
  const leading = (new Date(year, monthIndex, 1).getDay() + 6) % 7
  const total = new Date(year, monthIndex + 1, 0).getDate()
  const grid = Array.from({ length: Math.ceil((leading + total) / 7) * 7 }, (_, i) => i >= leading && i < leading + total ? i - leading + 1 : null)
  const monthEvents = events.filter(event => event.date.startsWith(`${year}-${pad(monthIndex + 1)}`))
  const detailEvents = selected ? events.filter(event => event.date === selected) : upcoming.slice(0, 5)
  function moveMonth(offset) { setMonth(new Date(year, monthIndex + offset, 1)); setSelected(null) }
  function exportCalendar() {
    try {
      setExportError('')
      const file = new Blob([calendarText(events)], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(file), link = document.createElement('a')
      link.href = url; link.download = 'Unidex-application-deadlines.ics'; link.click(); URL.revokeObjectURL(url)
    } catch { setExportError('Calendar export did not complete. Please try again.') }
  }

  return <Layout><div className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 sm:py-10">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-3 text-[10px] font-semibold uppercase tracking-[.22em] text-[#225feb]">A little more ahead</p><h1 className="text-3xl font-semibold tracking-[-.045em] text-[#10264c] sm:text-[42px]">Make room for what's next.</h1><p className="mt-3 text-sm leading-6 text-[#7c8ca5]">The important dates. One clear view.</p></div><button disabled={events.length === 0 || loading} onClick={exportCalendar} className="inline-flex items-center gap-2 rounded-full border border-[#dce4f0] bg-white px-5 py-3 text-xs font-semibold text-[#10264c] transition hover:border-[#225feb] disabled:opacity-40"><Download className="h-4 w-4"/>Export calendar</button></div>
    {(error || exportError) && <div role="alert" className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-xs leading-5 text-red-700">{exportError || error}<button onClick={async () => { try { await refreshPlans() } catch (err) { setExportError(err.message || 'Calendar could not be refreshed.') } }} className="ml-3 underline">Retry</button></div>}
    {loading ? <div className="flex justify-center gap-3 rounded-3xl bg-white py-24 text-sm text-[#7c8ca5]"><Loader2 className="h-5 w-5 animate-spin text-[#225feb]"/>Loading your calendar…</div> : !user ? <div className="rounded-3xl border border-[#e5ebf4] bg-white py-20 text-center"><CalendarDays className="mx-auto h-10 w-10 text-[#225feb]"/><h2 className="mt-5 text-2xl font-medium tracking-tight">Your dates, together.</h2><p className="mt-3 text-sm text-[#7c8ca5]">Sign in to see deadlines for your saved college plans.</p><Link to="/login" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#225feb] px-6 py-3 text-xs font-semibold text-white">Sign in <ArrowRight className="h-4 w-4"/></Link></div> : <>
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]"><section className="overflow-hidden rounded-[24px] border border-[#e5ebf4] bg-white"><div className="flex flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-7"><div><h2 className="text-xl font-medium tracking-tight">{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h2><p className="mt-1.5 text-[11px] text-[#91a0b6]">{monthEvents.length} saved deadline{monthEvents.length === 1 ? '' : 's'} this month</p></div><div className="flex items-center gap-2"><button onClick={() => { setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setSelected(today) }} className="rounded-full border border-[#e5ebf4] px-4 py-2 text-[10px] font-semibold text-[#6d829f]">Today</button><button aria-label="Previous month" onClick={() => moveMonth(-1)} className="rounded-full p-2 text-[#7c8ca5] hover:bg-[#f0f4fa]"><ChevronLeft className="h-4 w-4"/></button><button aria-label="Next month" onClick={() => moveMonth(1)} className="rounded-full p-2 text-[#7c8ca5] hover:bg-[#f0f4fa]"><ChevronRight className="h-4 w-4"/></button></div></div><div className="grid grid-cols-7 border-y border-[#edf1f7] bg-[#fafbfd]">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <div key={day} className="py-3 text-center text-[10px] font-medium text-[#96a5ba]">{day}</div>)}</div><div className="grid grid-cols-7">{grid.map((day, i) => {
      const iso = day ? isoDate(year, monthIndex, day) : null, dayEvents = iso ? events.filter(event => event.date === iso) : []
      return <div key={i} className={`min-h-[72px] border-b border-r border-[#edf1f7] last:border-r-0 sm:min-h-[108px] ${!day ? 'bg-[#fafbfd]' : selected === iso ? 'bg-[#edf3ff]' : ''}`}>{day && <button aria-label={`${dateText(iso)}${dayEvents.length ? `, ${dayEvents.length} deadlines` : ''}`} aria-pressed={selected === iso} onClick={() => setSelected(selected === iso ? null : iso)} className="h-full min-h-[72px] w-full px-1.5 py-2 text-left transition hover:bg-[#f4f7fc] sm:min-h-[108px] sm:px-3 sm:py-3"><span className={`grid h-7 w-7 place-items-center rounded-full text-[11px] ${iso === today ? 'bg-[#225feb] font-semibold text-white' : 'text-[#6d829f]'}`}>{day}</span><span className="mt-2 flex flex-wrap gap-1 sm:hidden">{dayEvents.map(event => <span key={event.id} className={`h-1.5 w-1.5 rounded-full ${event.source === 'Your date' ? 'bg-[#ff8e53]' : 'bg-[#225feb]'}`}/>)}</span><span className="mt-2 hidden space-y-1 sm:block">{dayEvents.slice(0, 2).map(event => <span key={event.id} className={`block truncate rounded px-1.5 py-1 text-[8px] font-medium ${event.source === 'Your date' ? 'bg-[#fff2e9] text-[#b97c51]' : 'bg-[#edf3ff] text-[#225feb]'}`}>{event.name}</span>)}{dayEvents.length > 2 && <span className="text-[8px] text-[#8796ad]">+{dayEvents.length - 2} more</span>}</span></button>}</div>
    })}</div><div className="flex flex-wrap items-center gap-5 px-6 py-4 text-[10px] text-[#91a0b6]"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#225feb]"/>Verified official date</span><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#ff8e53]"/>Date you entered</span></div></section>
    <aside className="space-y-5"><section className="rounded-[24px] bg-[#10264c] px-6 py-7 text-white"><CalendarDays className="h-5 w-5 text-[#8bb4ff]"/><p className="mt-6 text-[10px] uppercase tracking-[.18em] text-[#91aed6]">Looking ahead</p><p className="mt-2 text-4xl font-medium tracking-[-.05em]">{upcoming.length}<span className="ml-2 text-xs font-normal tracking-normal text-[#afc1df]">upcoming dates</span></p><p className="mt-4 text-[11px] leading-6 text-[#afc1df]">Only verified official dates and dates you enter appear here. Unknown deadlines stay on your checklist.</p>{upcoming[0] && <button onClick={() => { const [y, m] = upcoming[0].date.split('-').map(Number); setMonth(new Date(y, m - 1, 1)); setSelected(upcoming[0].date) }} className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold">Go to next deadline <ArrowRight className="h-3.5 w-3.5"/></button>}</section><section className="rounded-[24px] border border-[#e5ebf4] bg-white p-6"><h2 className="text-sm font-semibold">{selected ? dateText(selected) : 'Next on your calendar'}</h2><div className="mt-5 space-y-5">{detailEvents.length ? detailEvents.map(event => <div key={event.id} className="border-b border-[#edf1f7] pb-4 last:border-0 last:pb-0"><p className="text-[10px] text-[#225feb]">{dateText(event.date)}</p><Link to={`/college/${event.collegeId}`} className="mt-2 block text-xs font-semibold leading-5">{event.name}</Link><p className="mt-1.5 text-[10px] leading-5 text-[#91a0b6]">{event.source}{event.note ? ` · ${event.note}` : ''}</p>{event.closesAt && <p className="mt-1.5 text-[10px] text-[#7c8ca5]">Closes {new Date(event.closesAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' })} IST</p>}{event.sourceUrl && <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-[#225feb]">Official source <ArrowUpRight className="h-3 w-3"/></a>}</div>) : <p className="text-xs leading-6 text-[#91a0b6]">{selected ? 'A little breathing room. No saved deadlines on this date.' : 'No confirmed upcoming dates yet. Add colleges and confirm their deadlines.'}</p>}</div></section></aside></div>
    {unknown.length > 0 && <section className="mt-7 rounded-[24px] border border-[#e5ebf4] bg-white p-6 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#b88258]">A useful next step</p><h2 className="mt-3 text-xl font-medium tracking-tight">A few dates to confirm.</h2><p className="mt-2 text-xs leading-6 text-[#91a0b6]">Check these colleges' official admissions pages. Add your confirmed date from your application plan.</p></div><Link to="/tracker" className="inline-flex items-center gap-2 text-xs font-semibold text-[#225feb]">Update my plans <ArrowRight className="h-4 w-4"/></Link></div><div className="mt-5 flex flex-wrap gap-2">{unknown.map(plan => <Link key={plan.id} to={`/college/${plan.college_id}`} className="rounded-full border border-[#e5ebf4] bg-[#fafbfd] px-4 py-2 text-[10px] text-[#7c8ca5]">{plan.college_snapshot?.name || 'College'} · Confirm deadline</Link>)}</div></section>}
    {plans.length === 0 && <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#dce6fa] bg-[#edf3ff] px-6 py-5"><p className="text-xs leading-6 text-[#627aa0]">Start by adding colleges to your plan. Their confirmed dates will appear here.</p><Link to="/colleges" className="inline-flex items-center gap-2 text-xs font-semibold text-[#225feb]"><Plus className="h-4 w-4"/>Explore colleges</Link></div>}
    <p className="mt-5 text-[10px] leading-5 text-[#91a0b6]">Exports contain all-day reminders. Check official sources for closing times, programme eligibility and changes. Email reminders require a configured delivery service.</p>
    </>}
  </div></Layout>
}
