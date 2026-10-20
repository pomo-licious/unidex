// Pure shared contract: the Edge Function and browser use the same destinations.
// A selected category routes facts; it never proves what a document contains.
export const ADMISSIONS_EXTRACTION_SCHEMA_VERSION = 4

const PERSONAL = ['full_name', 'date_of_birth']
const ALL_FIELDS = [...PERSONAL, 'email', 'phone', 'gender', 'nationality', 'current_city', 'academic_10th', 'academic_12th', 'academic_graduation', 'exam_scores', 'work_experience', 'professional_qualifications', 'defence_service', 'total_work_experience_months', 'last_drawn_ctc']
const classNumber = level => level.replace('th', '')
const schoolInstruction = level => `This upload was selected as a Class ${classNumber(level)} mark sheet. Read the student's printed name, date of birth, school, examining board, passing year, and explicitly printed overall percentage or CGPA and its scale into academic_${level} only. Do not use the school address as the student's city or a school phone as the student's phone. Do not calculate an overall result from subject marks. Check the printed education level: if it explicitly identifies only a different level and not the requested level, set document_type_mismatch to true and leave the requested academic section null. Never relabel Class 12 marks as Class 10, or vice versa, to fit the selected category.`

const target = (type, label, fields, primaryFields, help, instruction, maxTokens) => Object.freeze({ type, label, fields: Object.freeze(fields), primaryFields: Object.freeze(primaryFields), help, instruction, maxTokens })
const school = (type, label, level) => target(type, label, [...PERSONAL, type], [type], `Fills Class ${classNumber(level)} school, board, passing year and printed marks in your profile.`, schoolInstruction(level), 1536)
const identity = (type, label) => target(type, label, [...PERSONAL, 'nationality', 'current_city'], [], 'Fills only printed personal details. Identity numbers are excluded.', 'Extract only the printed name, date of birth, nationality and city. Never return identifiers, document numbers or machine-readable-zone text.', 1024)

const TARGETS = Object.freeze({
  academic_10th: school('academic_10th', 'Class 10 mark sheet', '10th'),
  academic_12th: school('academic_12th', 'Class 12 mark sheet', '12th'),
  academic_graduation: target('academic_graduation', 'Graduation mark sheet', [...PERSONAL, 'academic_graduation'], ['academic_graduation'], 'Fills your undergraduate college, university, degree, passing year and printed marks.', 'Read undergraduate degree details into academic_graduation. Do not put school, professional qualification or postgraduate marks here. If the printed record explicitly belongs only to a different education level, set document_type_mismatch to true and leave academic_graduation null.', 2048),
  exam_score: target('exam_score', 'Entrance exam scorecard', [...PERSONAL, 'exam_scores'], ['exam_scores'], 'Fills the exam, year, edition, total score, percentile and printed section results.', 'Read every explicitly named entrance exam and attempt into exam_scores, preserving score versus percentile and the printed GMAT edition. Do not fill school or university marks.', 3072),
  professional_qualification: target('professional_qualification', 'Professional qualification / doctorate', [...PERSONAL, 'professional_qualifications'], ['professional_qualifications'], 'Fills CA, CS, CMA, other professional qualifications or doctorate details.', 'Read each professional qualification or doctorate into professional_qualifications, with title, institution, explicit status, year and printed results. Do not place these results in undergraduate or school marks.', 3072),
  work_experience: target('work_experience', 'Work experience / CTC', [...PERSONAL, 'work_experience', 'total_work_experience_months', 'last_drawn_ctc'], ['work_experience', 'total_work_experience_months', 'last_drawn_ctc'], 'Fills employers, roles, dates and explicitly stated experience or annual INR CTC.', 'Read every employer, role and employment date. Read experience duration and last annual INR CTC only when explicitly stated. Do not infer missing months or multiply monthly pay into CTC.', 4096),
  defence_service: target('defence_service', 'Defence service / discharge certificate', [...PERSONAL, 'defence_service', 'total_work_experience_months', 'last_drawn_ctc'], ['defence_service', 'total_work_experience_months', 'last_drawn_ctc'], 'Fills printed service status, branch, rank, dates and stated experience or annual CTC.', 'Read only printed service status, branch, rank, dates, current-service status and a short responsibility summary, plus explicitly stated experience and annual INR CTC. Never return service identifiers, unit postings or operational details. Do not infer pay or experience from rank.', 3072),
  resume: target('resume', 'Resume / CV', ALL_FIELDS, [], 'Fills all supported education, qualifications, work and personal details visible in your resume.', 'Read all supported sections and every separately stated qualification, exam and employer. A resume can legitimately contain several education levels; preserve each in its correct profile section. Do not flag a mismatch just because it includes several profile sections.', 8192),
  other: target('other', 'Other document', ALL_FIELDS, [], 'Fills supported details from a combined record; each fact stays in its matching profile section.', 'This general category accepts combined records. Do not flag a mismatch just because it includes several profile sections. Read all supported explicitly identified profile sections. Do not guess an education level when the record does not identify it.', 8192),
  pan_card: identity('pan_card', 'PAN card'),
  aadhaar_card: identity('aadhaar_card', 'Aadhaar card'),
  passport: identity('passport', 'Passport'),
  government_id: identity('government_id', 'Other government ID'),
  photo: target('photo', 'Profile photograph', [], [], 'Applied directly as your profile photo; no AI text extraction.', 'Photographs are not sent for AI text extraction.', 0),
})

export function getAdmissionsDocumentTarget(documentType) {
  return typeof documentType === 'string' && Object.hasOwn(TARGETS, documentType) ? TARGETS[documentType] : TARGETS.other
}

export function scopeAdmissionsDocumentSuggestions(value, documentType) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(getAdmissionsDocumentTarget(documentType).fields.filter(key => Object.hasOwn(value, key)).map(key => [key, value[key]]))
}
