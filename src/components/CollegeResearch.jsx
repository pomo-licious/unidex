import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { groupCollegeResearch, isIllustrativeResearchField, isStudentResearchField, studentResearchLabel, studentResearchValue } from '../lib/admissionsCollegeResearch'

function ResearchText({ value }) {
  const text = studentResearchValue(value)
  return text.split(/(https?:\/\/[^\s<>"(),;]+)/g).map((part, index) => {
    if (!/^https?:\/\//.test(part)) return part
    try {
      const url = new URL(part)
      return <a key={index} href={url.href} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-[#225feb] underline decoration-[#c9d9ff] underline-offset-2">{part}<ArrowUpRight className="ml-0.5 inline h-3 w-3"/></a>
    } catch { return part }
  })
}

export default function CollegeResearch({ research }) {
  const groups = groupCollegeResearch(research)
  const supplementary = (research?.supplementary || []).map(record => ({ ...record, fields: Object.fromEntries(Object.entries(record.fields || {}).filter(([label, value]) => isStudentResearchField(label, value))) })).filter(record => Object.keys(record.fields).length)
  const hasIllustrations = [...Object.keys(research?.fields || {}), ...supplementary.flatMap(record => Object.keys(record.fields))].some(isIllustrativeResearchField)
  if (!groups.length) return <p className="text-xs leading-6 text-[#8190a6]">Detailed source research is not available for this record. Check the institution’s current prospectus.</p>
  return <div className="space-y-4"><p className="text-xs leading-7 text-[#718098]">Programme research is included below, with the original qualifications on fees, cohorts and admissions cycles. A published or estimated figure is not automatically a verified current admission rule.{research.source?.auditedOn ? ` Research reviewed ${research.source.auditedOn}.` : ''}</p>{hasIllustrations && <p className="rounded-xl border border-[#e2e9f5] bg-[#f1f5ff] p-4 text-[11px] leading-6 text-[#60738e]">Illustrative growth scenarios use assumed annual rates applied to a published baseline. Actual salaries vary; these figures do not promise future earnings.</p>}{groups.map(group => <details key={group.key} className="group rounded-2xl border border-[#e4eaf3] bg-white"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-xs font-semibold text-[#10264c]">{group.title}<ChevronDown className="h-4 w-4 shrink-0 text-[#8da0bd] transition group-open:rotate-180"/></summary><dl className="space-y-5 border-t border-[#edf0f6] p-5">{group.fields.map(field => <div key={field.label}><dt className="text-[10px] font-semibold leading-5 text-[#8190a6]">{studentResearchLabel(field.label)}</dt><dd className="mt-1.5 whitespace-pre-line break-words text-xs leading-7 text-[#526982]"><ResearchText value={field.value}/></dd></div>)}</dl></details>)}{supplementary.length > 0 && <details className="rounded-2xl border border-[#e4eaf3] bg-white"><summary className="cursor-pointer p-5 text-xs font-semibold text-[#10264c]">Additional research notes · {supplementary.length} record{supplementary.length === 1 ? '' : 's'}</summary><div className="space-y-5 border-t border-[#edf0f6] p-5">{supplementary.map((record, index) => <section key={`${record.sheet}-${record.row}-${index}`}><h3 className="text-xs font-semibold text-[#10264c]">{record.sheet || `Additional note ${index + 1}`}</h3><dl className="mt-3 space-y-4">{Object.entries(record.fields || {}).map(([label, value]) => <div key={label}><dt className="text-[10px] font-medium text-[#8190a6]">{studentResearchLabel(label)}</dt><dd className="mt-1 whitespace-pre-line break-words text-[11px] leading-6 text-[#60738e]"><ResearchText value={value}/></dd></div>)}</dl></section>)}</div></details>}</div>
}
