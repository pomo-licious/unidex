export function getProfileSectionForPath(path = '') {
  if (path.startsWith('academic_') || path.startsWith('professional_qualifications')) return 'academics'
  if (path.startsWith('exam_scores')) return 'exams'
  if (path.startsWith('work_experience') || path.startsWith('defence_service') || path === 'last_drawn_ctc' || path === 'total_work_experience_months') return 'work'
  if (path.startsWith('preferences')) return 'preferences'
  return 'personal'
}
