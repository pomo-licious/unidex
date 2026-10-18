import { Link } from 'react-router-dom'
import { ArrowUpRight, FileText, Pencil, Plus, Sparkles } from 'lucide-react'
import PrivateProfilePhoto from './PrivateProfilePhoto'
import { getAiImportedFields } from '../lib/admissionsAiReview'
import { formatInr, hasProfileValue } from '../lib/admissionsProfile'

const personal = [['full_name', 'Full name'], ['email', 'Email address'], ['phone', 'Mobile number'], ['date_of_birth', 'Date of birth'], ['gender', 'Gender'], ['nationality', 'Nationality'], ['current_city', 'Current city']]
const academics = [
  { key: 'academic_10th', title: 'Class 10', fields: [['board', 'Board'], ['school', 'School'], ['year', 'Year of completion'], ['percentage', 'Percentage'], ['cgpa', 'CGPA'], ['cgpa_scale', 'CGPA grading scale']] },
  { key: 'academic_12th', title: 'Class 12', fields: [['board', 'Board'], ['school', 'School'], ['stream', 'Stream'], ['year', 'Year of completion'], ['percentage', 'Percentage'], ['cgpa', 'CGPA'], ['cgpa_scale', 'CGPA grading scale']] },
  { key: 'academic_graduation', title: 'Graduation', fields: [['university', 'University'], ['college', 'College / institution'], ['degree', 'Degree'], ['branch', 'Specialization / branch'], ['year_of_passing', 'Year of completion'], ['percentage', 'Percentage'], ['cgpa', 'CGPA'], ['cgpa_scale', 'CGPA grading scale']] },
]
const examFields = [['exam', 'Entrance exam'], ['year', 'Exam year'], ['total_score', 'Total score'], ['percentile', 'Overall percentile']]
const workFields = [['company', 'Company'], ['designation', 'Designation'], ['start_date', 'Start date'], ['end_date', 'End date'], ['current', 'Currently employed here'], ['months', 'Experience in this role (months)'], ['last_drawn_ctc', 'Annual CTC in this role (₹)']]
const preferenceFields = [['programme', 'Programme'], ['study_mode', 'Study mode'], ['preferred_cities', 'Preferred cities'], ['max_fees_inr', 'Maximum programme fee (₹)'], ['specialization', 'Preferred specialization'], ['college_types', 'Institution preferences']]
const isPresent = value => Array.isArray(value) ? value.some(hasProfileValue) : hasProfileValue(value)
const sameValue = (left, right) => {
  if (typeof left === 'boolean' || typeof right === 'boolean') return left === right
  if (typeof left === 'number' || typeof right === 'number') return isPresent(left) && isPresent(right) && Number(left) === Number(right)
  return String(left ?? '').trim() === String(right ?? '').trim()
}
function displayValue(value, key) {
  if (!isPresent(value)) return 'Not added'
  if (Array.isArray(value)) return value.filter(hasProfileValue).join(', ')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (key === 'last_drawn_ctc' || key === 'max_fees_inr') return formatInr(value)
  if (key === 'percentage' || key === 'percentile') return `${value}%`
  return String(value)
}

function ReviewGroup({ title, step, missing = false, optional = true, busy, onEdit, children }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-[#fbfcff] px-5 py-4 sm:px-6"><div><h2 className="text-sm font-semibold text-[#10264c]">{title}</h2>{optional && <p className="mt-1 text-[10px] text-slate-400">Add what applies to you. You can complete optional details later.</p>}</div><button type="button" disabled={busy} onClick={() => onEdit(step)} aria-label={`Edit ${title.toLowerCase()}`} className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white px-3 py-2 text-[11px] font-semibold text-[#225feb] transition hover:bg-blue-50 disabled:opacity-50">{missing ? <Plus size={12}/> : <Pencil size={12}/>} {missing ? 'Add missing information' : 'Edit details'}</button></div><div className="px-5 py-1 sm:px-6">{children}</div></section>
}

export default function ExtractedProfileReview({ profile = {}, user, documents = [], busy = false, onEdit }) {
  const imported = getAiImportedFields(profile)
  const sources = new Map(imported.map(field => [JSON.stringify(field.path.map(String)), field]))
  const sourceDocuments = new Map()
  for (const record of profile.ai_imports || []) {
    if (record?.file_name && record?.document_id) sourceDocuments.set(record.document_id, { id: record.document_id, name: record.file_name })
  }
  const photoDocument = documents.find(document => document.id === profile.profile_photo_document_id)
  function row(label, path, value, { key = path.at(-1), missingLabel } = {}) {
    const source = sources.get(JSON.stringify(path.map(String)))
    const changed = source && !sameValue(value, source.aiValue)
    return <div key={JSON.stringify(path)} className="grid gap-1.5 border-b border-slate-100 py-3.5 last:border-0 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] sm:gap-5"><dt className="text-xs leading-6 text-slate-500">{label}</dt><dd className="min-w-0"><p className={`break-words text-xs font-medium leading-6 ${isPresent(value) ? 'text-[#10264c]' : 'text-slate-400'}`}>{isPresent(value) ? displayValue(value, key) : missingLabel || 'Not added'}</p>{source && <div className="mt-1.5"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold ${changed ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-[#225feb]'}`}><Sparkles size={10}/>{changed ? 'Edited after import' : 'Document-filled'}</span><p className="mt-1 break-words text-[10px] leading-5 text-slate-400">Source: {source.fileName}</p>{changed && <p className="break-words text-[10px] leading-5 text-amber-800">Originally extracted: {displayValue(source.aiValue, key)}</p>}</div>}</dd></div>
  }
  const missingPersonal = personal.some(([key]) => !isPresent(profile[key]))
  const missingAcademics = academics.some(group => group.fields.some(([key]) => !isPresent(profile[group.key]?.[key])))
  const missingWork = !isPresent(profile.total_work_experience_months) || !isPresent(profile.last_drawn_ctc)
  const missingPreferences = preferenceFields.some(([key]) => !isPresent(profile.preferences?.[key]))
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-[#f5f8ff] p-5 sm:p-6"><div><p className="text-xs font-semibold text-[#10264c]">{imported.length ? 'Already filled. Yours to check.' : 'Your saved details, together.'}</p><p className="mt-2 max-w-xl text-xs leading-6 text-slate-500">You don’t need to enter these details again. Review the values below, and use Edit or Add missing information only where needed.</p></div>{imported.length > 0 && <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[10px] font-semibold text-[#225feb]"><Sparkles size={13}/>{imported.length} document-sourced fields</span>}</div>
    <section aria-label="Profile photo" className="rounded-2xl border border-slate-200 p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-5"><PrivateProfilePhoto key={`${user?.id || 'account'}:${profile.profile_photo_document_id || 'none'}`} documentId={profile.profile_photo_document_id} userId={user?.id} name={profile.full_name} uploadTo="/documents?setup=1" uploadState={{ returnTo: '/onboarding' }}/><Link to="/documents?setup=1" state={{ returnTo: '/onboarding' }} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#225feb]">{profile.profile_photo_document_id ? 'Manage photo & documents' : 'Add a profile photo (optional)'}<ArrowUpRight size={13}/></Link></div><p className="mt-4 text-[10px] leading-5 text-slate-500">{profile.profile_photo_document_id ? `Uploaded photo${photoDocument?.file_name ? ` · ${photoDocument.file_name}` : ''}. Photo assignment uses your uploaded image directly; it is not AI-generated.` : 'A profile photo is optional. You can upload one later.'}</p></section>
    <ReviewGroup title="Personal details" step="personal" missing={missingPersonal} optional={false} busy={busy} onEdit={onEdit}><dl>{personal.map(([key, label]) => row(label, [key], profile[key], { missingLabel: ['full_name', 'email'].includes(key) ? 'Needed to finish setup' : undefined }))}</dl></ReviewGroup>
    <ReviewGroup title="Your education" step="academics" missing={missingAcademics} busy={busy} onEdit={onEdit}>{academics.map(group => <section key={group.key} className="py-4"><h3 className="mb-2 text-xs font-semibold text-[#225feb]">{group.title}</h3><dl>{group.fields.map(([key, label]) => row(label, [group.key, key], profile[group.key]?.[key]))}</dl></section>)}</ReviewGroup>
    <ReviewGroup title="Entrance exams" step="exams" missing={!profile.exam_scores?.length || profile.exam_scores.some(exam => !isPresent(exam.total_score) && !isPresent(exam.percentile))} busy={busy} onEdit={onEdit}>{profile.exam_scores?.length ? profile.exam_scores.map((exam, index) => <section key={exam._unidex_row_id || index} className="py-4"><h3 className="mb-2 text-xs font-semibold text-[#225feb]">Result {index + 1}{exam.exam ? ` · ${exam.exam}` : ''}</h3><dl>{examFields.map(([key, label]) => row(label, ['exam_scores', index, key], exam[key]))}{Object.entries(exam.section_scores || {}).map(([key, value]) => row(`Section score · ${key}`, ['exam_scores', index, 'section_scores', key], value))}</dl>{!Object.keys(exam.section_scores || {}).length && <p className="py-3 text-[11px] text-slate-400">No section scores added.</p>}</section>) : <p className="py-5 text-xs leading-6 text-slate-500">No results added yet. You can add them when available.</p>}</ReviewGroup>
    <ReviewGroup title="Your experience" step="work" missing={missingWork} busy={busy} onEdit={onEdit}><dl>{row('Total full-time experience (months)', ['total_work_experience_months'], profile.total_work_experience_months)}{row('Last drawn annual CTC (₹)', ['last_drawn_ctc'], profile.last_drawn_ctc, { missingLabel: 'Not shared (optional)' })}</dl>{profile.work_experience?.length ? profile.work_experience.map((role, index) => <section key={role._unidex_row_id || role.id || index} className="border-t border-slate-100 py-4"><h3 className="mb-2 text-xs font-semibold text-[#225feb]">Role {index + 1}{role.company ? ` · ${role.company}` : ''}</h3><dl>{workFields.map(([key, label]) => row(label, ['work_experience', index, key], role[key], { missingLabel: key === 'end_date' && role.current ? 'Current role' : undefined }))}</dl></section>) : <p className="py-4 text-xs leading-6 text-slate-500">No roles added. Fresh graduates can leave this blank or enter zero total months.</p>}</ReviewGroup>
    <ReviewGroup title="Your preferences" step="preferences" missing={missingPreferences} busy={busy} onEdit={onEdit}><dl>{preferenceFields.map(([key, label]) => row(label, ['preferences', key], profile.preferences?.[key]))}</dl></ReviewGroup>
    <section aria-label="Original source documents" className="rounded-2xl border border-slate-200 p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-semibold text-[#10264c]">Original source documents</h2><Link to="/documents?setup=1" state={{ returnTo: '/onboarding' }} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#225feb]">Review documents<ArrowUpRight size={12}/></Link></div>{sourceDocuments.size ? <><ul className="mt-4 grid gap-3 sm:grid-cols-2">{[...sourceDocuments.values()].map(document => <li key={document.id} className="flex min-w-0 items-start gap-2 rounded-xl bg-[#f8faff] p-3"><FileText size={15} className="mt-0.5 shrink-0 text-[#225feb]"/><span className="break-words text-[11px] leading-5 text-slate-600">{document.name}</span></li>)}</ul><p className="mt-4 text-[10px] leading-5 text-slate-400">These filenames identify the sources in your import history. Document-filled labels show the source of each current field; edited values also show what was originally extracted.</p></> : <p className="mt-4 text-xs leading-6 text-slate-500">No document-sourced fields are recorded in this profile yet. You can continue with your saved details or upload documents.</p>}</section>
  </div>
}
