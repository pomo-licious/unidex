export const DOCUMENT_TYPES = [
  ['academic_10th', 'Class 10 mark sheet'], ['academic_12th', 'Class 12 mark sheet'],
  ['academic_graduation', 'Graduation mark sheet'], ['professional_qualification', 'Professional qualification / doctorate'], ['exam_score', 'Entrance exam scorecard'],
  ['resume', 'Resume / CV'], ['work_experience', 'Work experience / CTC'], ['defence_service', 'Defence service / discharge certificate'],
  ['pan_card', 'PAN card'], ['aadhaar_card', 'Aadhaar card'], ['passport', 'Passport'],
  ['government_id', 'Other government ID'], ['photo', 'Profile photograph'], ['other', 'Other document'],
]
export const DOCUMENT_TYPE_LABELS = Object.fromEntries(DOCUMENT_TYPES)
export const IDENTITY_DOCUMENT_TYPES = ['pan_card', 'aadhaar_card', 'passport', 'government_id']
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const DOCUMENT_MIME_TYPES = ['application/pdf', ...IMAGE_MIME_TYPES]
export const isDocumentType = value => Object.hasOwn(DOCUMENT_TYPE_LABELS, value)
