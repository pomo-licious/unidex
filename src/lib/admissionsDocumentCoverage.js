import { canReuseAdmissionsAiExtraction, getSafeAdmissionsDocumentSuggestions } from './admissionsBatchReview'
import { buildAdmissionsDocumentReview } from './admissionsDocumentReview'
import { getAdmissionsDocumentTarget } from './admissionsDocumentTypes'

// Reading by AI and checking by a student are separate, observable steps.
export function getAdmissionsDocumentCoverage(documents = [], profile = {}) {
  const entries = documents.map(document => {
    if (document.document_type === 'photo') return { document, state: 'photo', fields: 0, needsStudentReview: false }
    const data = document.extracted_data
    const stored = data && typeof data === 'object' && !Array.isArray(data)
    const failed = ['error', 'failed'].includes(document.status)
    const current = canReuseAdmissionsAiExtraction(document)
    const model = stored ? buildAdmissionsDocumentReview(getSafeAdmissionsDocumentSuggestions(document), {}) : { fields: [] }
    const fields = model.fields.length
    const target = getAdmissionsDocumentTarget(document.document_type)
    const missingTarget = target.primaryFields.length > 0 && !model.fields.some(field => target.primaryFields.includes(field.path[0]) && !['invalid', 'ambiguous'].includes(field.status))
    const state = failed ? 'failed' : !stored ? 'unread' : !fields ? 'empty' : !current ? 'outdated' : missingTarget ? 'partial' : 'read'
    const unreviewedImport = (profile.ai_imports || []).some(item => item.document_id === document.id && item.reviewed === false)
    return { document, state, fields, missingTarget, targetLabel: target.label, needsStudentReview: ['read', 'partial'].includes(state) && (!['reviewed', 'verified'].includes(document.status) || unreviewedImport) }
  })
  const text = entries.filter(entry => entry.state !== 'photo')
  return {
    entries,
    textCount: text.length,
    readCount: text.filter(entry => entry.state === 'read').length,
    pendingDocuments: text.filter(entry => ['failed', 'unread', 'outdated', 'empty', 'partial'].includes(entry.state)).map(entry => entry.document),
    partialCount: text.filter(entry => entry.state === 'partial').length,
    failedCount: text.filter(entry => entry.state === 'failed').length,
    outdatedCount: text.filter(entry => entry.state === 'outdated').length,
    pendingReviewCount: text.filter(entry => entry.needsStudentReview).length,
  }
}
