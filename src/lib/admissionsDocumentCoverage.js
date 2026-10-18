import { canReuseAdmissionsAiExtraction, getSafeAdmissionsDocumentSuggestions } from './admissionsBatchReview'
import { buildAdmissionsDocumentReview } from './admissionsDocumentReview'

// Reading by AI and checking by a student are separate, observable steps.
export function getAdmissionsDocumentCoverage(documents = [], profile = {}) {
  const entries = documents.map(document => {
    if (document.document_type === 'photo') return { document, state: 'photo', fields: 0, needsStudentReview: false }
    const data = document.extracted_data
    const stored = data && typeof data === 'object' && !Array.isArray(data)
    const failed = ['error', 'failed'].includes(document.status)
    const current = canReuseAdmissionsAiExtraction(document)
    let fields = 0
    if (stored) fields = buildAdmissionsDocumentReview(getSafeAdmissionsDocumentSuggestions(document), {}).fields.length
    const state = failed ? 'failed' : !stored ? 'unread' : !fields ? 'empty' : !current ? 'outdated' : 'read'
    const unreviewedImport = (profile.ai_imports || []).some(item => item.document_id === document.id && item.reviewed === false)
    return { document, state, fields, needsStudentReview: state === 'read' && (!['reviewed', 'verified'].includes(document.status) || unreviewedImport) }
  })
  const text = entries.filter(entry => entry.state !== 'photo')
  return {
    entries,
    textCount: text.length,
    readCount: text.filter(entry => entry.state === 'read').length,
    pendingDocuments: text.filter(entry => ['failed', 'unread', 'outdated', 'empty'].includes(entry.state)).map(entry => entry.document),
    failedCount: text.filter(entry => entry.state === 'failed').length,
    outdatedCount: text.filter(entry => entry.state === 'outdated').length,
    pendingReviewCount: text.filter(entry => entry.needsStudentReview).length,
  }
}
