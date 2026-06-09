// components/ExamCalendar.jsx
// Displays the full exam calendar – drop anywhere in the app

import { useExamCalendar } from '../hooks/useCollegeData'

const EXAM_COLORS = {
  CAT:      { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',   dot: 'bg-blue-500' },
  XAT:      { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200', dot: 'bg-purple-500' },
  SNAP:     { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200', dot: 'bg-orange-500' },
  NMAT:     { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',   dot: 'bg-teal-500' },
  CMAT:     { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',  dot: 'bg-green-500' },
  MAT:      { bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-200', dot: 'bg-yellow-500' },
  'MAH-CET':{ bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',   dot: 'bg-rose-500' },
  GMAT:     { bg: 'bg-slate-50',   text: 'text-slate-700',   border: 'border-slate-200',  dot: 'bg-slate-400' },
}

export default function ExamCalendar() {
  const { exams, loading } = useExamCalendar()

  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const upcoming = exams.filter(e => !e.exam_date || e.exam_date >= today)
  const past     = exams.filter(e => e.exam_date && e.exam_date < today)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Exam Calendar</h2>
        <p className="text-sm text-slate-400 mt-0.5">2026-27 cycle · All dates verified</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Upcoming exams */}
          <section className="space-y-3">
            {upcoming.map(exam => <ExamCard key={exam.id} exam={exam} />)}
          </section>

          {/* Past exams (collapsed) */}
          {past.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Past
              </p>
              <div className="space-y-2 opacity-50">
                {past.map(exam => <ExamCard key={exam.id} exam={exam} compact />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function ExamCard({ exam, compact = false }) {
  const c = EXAM_COLORS[exam.exam_type] || EXAM_COLORS['GMAT']
  const daysUntil = exam.exam_date ? getDaysUntil(exam.exam_date) : null

  return (
    <div className={`rounded-xl border p-4 ${c.bg} ${c.border}`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${c.dot}`} />
          <div>
            <h3 className={`font-bold text-sm ${c.text}`}>{exam.exam_name}</h3>
            {!compact && (
              <p className="text-xs text-slate-500 mt-0.5">{exam.notes}</p>
            )}
          </div>
        </div>

        {/* Date badge */}
        <div className="text-right shrink-0">
          {exam.exam_date ? (
            <>
              <p className={`text-sm font-semibold ${c.text}`}>
                {formatDate(exam.exam_date)}
              </p>
              {daysUntil !== null && daysUntil > 0 && (
                <p className="text-xs text-slate-400 mt-0.5">{daysUntil}d to go</p>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-400">Year-round</p>
          )}
        </div>
      </div>

      {/* Registration + details row */}
      {!compact && (
        <div className="mt-3 flex flex-wrap gap-3">
          {exam.reg_open && (
            <Pill label="Reg opens" value={formatDate(exam.reg_open)} />
          )}
          {exam.reg_close && (
            <Pill label="Reg closes" value={formatDate(exam.reg_close)} />
          )}
          {exam.fee_inr && (
            <Pill label="Fee" value={`₹${exam.fee_inr.toLocaleString('en-IN')}`} />
          )}
          {exam.attempts > 1 && (
            <Pill label="Attempts" value={`${exam.attempts}x`} />
          )}
        </div>
      )}

      {/* Accepting colleges – first 4 */}
      {!compact && exam.accepting_colleges?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {exam.accepting_colleges.slice(0, 4).map(col => (
            <span key={col}
              className="text-xs bg-white/70 text-slate-600 border border-white px-2 py-0.5 rounded-full">
              {col}
            </span>
          ))}
          {exam.accepting_colleges.length > 4 && (
            <span className="text-xs text-slate-400 px-1 py-0.5">
              +{exam.accepting_colleges.length - 4} more
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function Pill({ label, value }) {
  return (
    <div className="bg-white/70 rounded-lg px-2.5 py-1.5 text-center">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="text-xs font-semibold text-slate-700 mt-0.5">{value}</p>
    </div>
  )
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
}

function getDaysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
