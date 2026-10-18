import { isAiImportPath, normalizeAiImports } from './admissionsProfile'
import { applyAdmissionsDocumentReview, buildAdmissionsDocumentReview, comparableDocumentValues, DOCUMENT_REVIEW_NUMBERS, hasDocumentReviewValue } from './admissionsDocumentReview'

const text = value => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const keyOf = path => JSON.stringify(path)
const safePart = key => typeof key === 'number' ? Number.isInteger(key) && key >= 0 : !['__proto__', 'constructor', 'prototype'].includes(key)
function set(value, path, next) {
  if (!path.every(safePart)) throw new Error('Unsupported document field.')
  let node = value
  path.forEach((key, index) => { if (index === path.length - 1) node[key] = next; else { node[key] ??= typeof path[index + 1] === 'number' ? [] : {}; node = node[key] } })
}
const identityTypes = new Set(['pan_card', 'aadhaar_card', 'passport', 'government_id'])
export function getSafeAdmissionsDocumentSuggestions(document) {
  const source = object(document.extracted_data) ? document.extracted_data : {}
  // Identity documents contribute only these printed common facts. Numbers,
  // addresses, machine-readable zones and raw identity text are never imported.
  return identityTypes.has(document.document_type) ? Object.fromEntries(['full_name', 'date_of_birth', 'nationality', 'current_city'].filter(key => hasDocumentReviewValue(source[key]) && typeof source[key] === 'string' && (key === 'date_of_birth' ? /^\d{4}-\d{2}-\d{2}$/.test(source[key]) : !/\d/.test(source[key]))).map(key => [key, source[key]])) : source
}
function normalized(field, value) {
  if (DOCUMENT_REVIEW_NUMBERS.has(field.key) || field.path.includes('section_scores')) return Number.isFinite(Number(value)) ? Number(value) : text(value)
  return field.key === 'current' ? String(value) === 'true' : text(value)
}
function overlap(section, a, b) {
  if (section === 'exam_scores') return hasDocumentReviewValue(a.exam) && text(a.exam) === text(b.exam) && (!hasDocumentReviewValue(a.year) || !hasDocumentReviewValue(b.year) || Number(a.year) === Number(b.year))
  return hasDocumentReviewValue(a.company) && text(a.company) === text(b.company) && (!hasDocumentReviewValue(a.designation) || !hasDocumentReviewValue(b.designation) || text(a.designation) === text(b.designation)) && (!hasDocumentReviewValue(a.start_date) || !hasDocumentReviewValue(b.start_date) || (String(a.start_date).length === 7 || String(b.start_date).length === 7 ? String(a.start_date).slice(0, 7) === String(b.start_date).slice(0, 7) : a.start_date === b.start_date))
}
function strictIdentity(section, row) {
  if (section === 'exam_scores') return hasDocumentReviewValue(row.exam) && hasDocumentReviewValue(row.year) ? `${text(row.exam)}|${row.year}` : null
  return hasDocumentReviewValue(row.company) && hasDocumentReviewValue(row.designation) && hasDocumentReviewValue(row.start_date) ? `${text(row.company)}|${text(row.designation)}|${row.start_date}` : null
}
const sourceInfo = (document, value) => ({ document_id: document.id, file_name: document.file_name || 'Document', value: structuredClone(value) })
function addCandidate(map, path, field, document) {
  const key = keyOf(path)
  if (!map.has(key)) map.set(key, { path, field, candidates: [] })
  map.get(key).candidates.push({ field, document, value: field.value })
}
function agreeing(candidates) { return candidates.every(item => comparableDocumentValues(item.field, item.value, candidates[0].value)) }
function addSources(map, path, candidates) { map.set(keyOf(path), candidates.map(item => sourceInfo(item.document, item.value))) }
function conflictFor(group, kind = 'cross_document') { return { kind, path: group.path, label: group.field.label, values: group.candidates.map(item => sourceInfo(item.document, item.value)), message: 'Documents disagree. This field was left unchanged for your review.' } }

export function appendAdmissionsAiImports(profile, appliedFields, sourceMap, importedAt = new Date().toISOString(), { reviewed = false } = {}) {
  let imports = (Array.isArray(profile.ai_imports) ? profile.ai_imports : []).filter(object).map(item => structuredClone(item))
  const added = new Map()
  for (const field of appliedFields.filter(item => isAiImportPath(item.path))) for (const source of sourceMap.get(keyOf(field.path)) || []) {
    // Preserve older timestamps/baselines for unrelated fields from this file.
    imports = imports.map(entry => entry.document_id === source.document_id ? { ...entry, fields: (entry.fields || []).filter(item => keyOf(item.path) !== keyOf(field.path)) } : entry).filter(entry => entry.fields?.length)
    if (!added.has(source.document_id)) added.set(source.document_id, { document_id: source.document_id, file_name: source.file_name, fields: [], imported_at: importedAt, reviewed })
    let baseline = source.value !== undefined ? source.value : field.value
    if (DOCUMENT_REVIEW_NUMBERS.has(field.path.at(-1)) || field.path.includes('section_scores')) baseline = Number.isFinite(Number(baseline)) ? Number(baseline) : baseline
    if (field.path.at(-1) === 'current' && ['true', 'false'].includes(String(baseline))) baseline = String(baseline) === 'true'
    const entry = added.get(source.document_id)
    entry.fields = entry.fields.filter(item => keyOf(item.path) !== keyOf(field.path))
    entry.fields.push({ path: structuredClone(field.path), value: structuredClone(baseline) })
  }
  return normalizeAiImports([...imports, ...added.values()].slice(-100))
}

export function planAdmissionsBatchAutofill(profile, documents, { primaryPhotoDocumentId = null, importedAt = new Date().toISOString() } = {}) {
  const scalar = new Map(), arraySources = { exam_scores: [], work_experience: [] }, sourceMap = new Map(), suggestions = {}, conflicts = []
  const usable = documents.filter(document => document.document_type !== 'photo' && object(document.extracted_data)).slice().sort((a, b) => String(a.id).localeCompare(String(b.id)))
  for (const document of usable) {
    const model = buildAdmissionsDocumentReview(getSafeAdmissionsDocumentSuggestions(document), profile)
    for (const field of model.fields.filter(item => !item.record)) addCandidate(scalar, field.path, field, document)
    for (const row of model.records) {
      const fields = model.fields.filter(item => item.record?.id === row.id)
      if (fields.length) arraySources[row.section].push({ document, fields, source: row.source, section: row.section })
    }
  }
  const blockedPairs = new Set()
  for (const group of scalar.values()) if (!agreeing(group.candidates) && ['cgpa', 'cgpa_scale'].includes(group.path.at(-1))) blockedPairs.add(group.path[0])
  for (const group of scalar.values()) {
    if (!agreeing(group.candidates) || blockedPairs.has(group.path[0]) && ['cgpa', 'cgpa_scale'].includes(group.path.at(-1))) { conflicts.push(blockedPairs.has(group.path[0]) && ['cgpa', 'cgpa_scale'].includes(group.path.at(-1)) ? { ...conflictFor(group, 'grading_scale'), message: 'CGPA or its grading scale differs across documents. The pair was left unchanged for review.' } : conflictFor(group)); continue }
    set(suggestions, group.path, group.candidates[0].value)
    addSources(sourceMap, group.path, group.candidates)
  }
  for (const section of ['exam_scores', 'work_experience']) {
    const groups = []
    for (const row of arraySources[section]) {
      const identity = strictIdentity(section, row.source)
      const signature = JSON.stringify(row.fields.map(field => [field.path.slice(2), normalized(field, field.value)]).sort((a, b) => keyOf(a[0]).localeCompare(keyOf(b[0]))))
      let group = groups.find(item => identity ? item.identity === identity : !item.identity && item.signature === signature)
      if (!group) { group = { identity, signature, source: row.source, rows: [], fields: new Map(), blocked: false }; groups.push(group) }
      group.rows.push(row)
      row.fields.forEach(field => addCandidate(group.fields, field.path.slice(2), field, row.document))
    }
    for (const group of groups) {
      if ([...group.fields.values()].some(field => !agreeing(field.candidates))) group.blocked = true
      if (groups.some(other => other !== group && overlap(section, group.source, other.source))) group.blocked = true
    }
    suggestions[section] = []
    for (const group of groups) {
      if (group.blocked) {
        conflicts.push({ kind: 'record_ambiguity', path: [section], label: section === 'exam_scores' ? 'Exam result' : 'Work experience', values: group.rows.map(row => sourceInfo(row.document, section === 'exam_scores' ? `${row.source.exam || 'Unknown exam'} · ${row.source.year || 'year not shown'}` : `${row.source.company || 'Unknown company'} · ${row.source.designation || 'role not shown'}`)), message: 'These records overlap or disagree. Open individual reviews to choose their correct target; no record was added automatically.' })
        continue
      }
      const index = suggestions[section].length, merged = {}
      for (const field of group.fields.values()) { set(merged, field.path, field.candidates[0].value); addSources(sourceMap, [section, index, ...field.path], field.candidates) }
      suggestions[section].push(merged)
    }
  }
  const model = buildAdmissionsDocumentReview(suggestions, profile)
  // Do not attach a new CGPA to an unknown or contradictory saved denominator.
  for (const section of ['academic_10th', 'academic_12th', 'academic_graduation']) {
    const cgpa = model.fields.find(field => field.path[0] === section && field.key === 'cgpa'), scale = model.fields.find(field => field.path[0] === section && field.key === 'cgpa_scale')
    if (cgpa?.include && hasDocumentReviewValue(profile[section]?.cgpa_scale) && !scale || cgpa?.include && scale && !scale.include && !comparableDocumentValues(scale, scale.value, profile[section]?.cgpa_scale)) {
      cgpa.include = false
      conflicts.push({ kind: 'grading_scale', path: [section, 'cgpa'], label: 'CGPA and grading scale', values: sourceMap.get(keyOf([section, 'cgpa'])) || [], message: 'The value and its grading scale need a paired review. No conversion or replacement was made.' })
    }
  }
  for (const field of model.fields) {
    if (!field.include) continue
    const invalidContact = field.key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(field.value)) || field.key === 'phone' && !/^\+?[\d\s()-]{7,22}$/.test(String(field.value))
    if (invalidContact) { field.include = false; conflicts.push({ kind: 'invalid', path: field.path, label: field.label, values: sourceMap.get(keyOf(field.path)) || [], message: 'This contact value needs correction before it can be imported.' }) }
  }
  for (const section of ['academic_10th', 'academic_12th', 'academic_graduation']) {
    const value = model.fields.find(field => field.path[0] === section && field.key === 'cgpa'), scale = model.fields.find(field => field.path[0] === section && field.key === 'cgpa_scale')
    if (value?.include && scale?.include && Number(value.value) > Number(scale.value)) {
      value.include = false; scale.include = false
      conflicts.push({ kind: 'grading_scale', path: [section, 'cgpa'], label: 'CGPA and grading scale', values: sourceMap.get(keyOf([section, 'cgpa'])) || [], message: 'The extracted CGPA exceeds its stated grading scale. Confirm the pair manually.' })
    }
  }
  for (const field of model.fields) if (['variance', 'ambiguous', 'invalid'].includes(field.status)) conflicts.push({ kind: field.status, path: field.path, label: field.label, current: structuredClone(field.current), values: sourceMap.get(keyOf(field.path)) || [], message: field.reason })
  const result = applyAdmissionsDocumentReview(profile, model)
  // Translate source-array paths to the resolved target paths returned by the
  // review engine before recording immutable provenance baselines.
  const resolvedSources = new Map(), rowTargets = new Map()
  const nextIndex = { exam_scores: (profile.exam_scores || []).length, work_experience: (profile.work_experience || []).length }
  for (const row of model.records) if (model.fields.some(field => field.record?.id === row.id && (field.include || field.status === 'same'))) rowTargets.set(row.id, row.choice === 'new' ? nextIndex[row.section]++ : Number(row.choice.split(':')[1]))
  for (const field of model.fields.filter(item => item.include)) {
    const target = field.record ? [field.record.section, rowTargets.get(field.record.id), ...field.path.slice(2)] : field.path
    if (result.appliedFields.some(item => keyOf(item.path) === keyOf(target))) resolvedSources.set(keyOf(target), sourceMap.get(keyOf(field.path)) || [])
  }
  const photos = documents.filter(document => document.document_type === 'photo' && ['image/jpeg', 'image/png', 'image/webp'].includes(document.mime_type))
  if (photos.length > 1 && !primaryPhotoDocumentId) throw Object.assign(new Error('Choose a primary profile photo or explicitly skip the selected photos.'), { code: 'PHOTO_CHOICE_REQUIRED' })
  const photoId = primaryPhotoDocumentId === 'skip' ? null : primaryPhotoDocumentId || photos[0]?.id
  const photo = photoId ? photos.find(document => document.id === photoId) : null
  if (photoId && !photo) throw new Error('The chosen profile photo is not an uploaded image in this selection.')
  let photoApplied = false
  if (photo && !hasDocumentReviewValue(profile.profile_photo_document_id)) {
    result.profile.profile_photo_document_id = photo.id; photoApplied = true
    const field = { path: ['profile_photo_document_id'], value: photo.id }
    result.appliedFields.push(field); resolvedSources.set(keyOf(field.path), [sourceInfo(photo, photo.id)])
  } else if (photo && profile.profile_photo_document_id !== photo.id) conflicts.push({ kind: 'photo_variance', path: ['profile_photo_document_id'], label: 'Profile photo', current: profile.profile_photo_document_id, values: [sourceInfo(photo, photo.id)], message: 'A profile photo is already saved. It was preserved; use “Use as profile photo” beside this document to replace it explicitly.' })
  if (result.appliedFields.some(field => isAiImportPath(field.path))) result.profile.ai_imports = appendAdmissionsAiImports(result.profile, result.appliedFields, resolvedSources, importedAt)
  return { ...result, appliedCount: result.appliedFields.length, photoApplied, textFieldCount: result.appliedFields.length - Number(photoApplied), conflicts, needsReviewDocumentIds: [...new Set(conflicts.flatMap(item => item.values.map(value => value.document_id)))], importedAt }
}

export function shouldStopAdmissionsBatch(error) {
  return error?.stopBatch === true || [401, 403, 429].includes(Number(error?.status)) || ['AUTH_REQUIRED', 'ACCOUNT_CHANGED', 'OCR_DISABLED', 'OCR_NOT_CONFIGURED', 'OCR_RATE_LIMITED', 'OCR_QUOTA_EXHAUSTED', 'OCR_PROVIDER_CONFIGURATION'].includes(error?.code)
}
export async function runAdmissionsDocumentBatch(documents, { extract, processingApproved = false, reextract = false, onProgress = () => {}, signal } = {}) {
  const results = [], readyDocuments = []
  let stopReason = null
  for (const document of documents) {
    let result
    if (signal?.aborted) result = { document, status: 'not_attempted', error: 'Cancelled. This file was not processed.', code: 'LOCAL_OCR_CANCELLED' }
    else if (document.document_type === 'photo') { result = { document, status: 'photo' }; readyDocuments.push(document) }
    else if (!reextract && object(document.extracted_data)) { result = { document, status: 'reused' }; readyDocuments.push(document) }
    else if (stopReason) result = { document, status: 'not_attempted', error: stopReason.message, code: stopReason.code }
    else if (!processingApproved) result = { document, status: 'not_attempted', error: 'Processing approval was not given for these files.', code: 'CONSENT_REQUIRED' }
    else {
      onProgress({ results: [...results], current: document })
      try {
        const updated = await extract(document)
        if (!updated?.id || !object(updated.extracted_data)) throw new Error('No extraction result was confirmed for this document.')
        result = { document: updated, status: 'extracted' }; readyDocuments.push(updated)
      } catch (error) {
        result = { document, status: error?.name === 'AbortError' ? 'not_attempted' : 'failed', error: error?.message || 'Extraction failed.', code: error?.name === 'AbortError' ? 'LOCAL_OCR_CANCELLED' : error?.code || 'OCR_FAILED' }
        if (shouldStopAdmissionsBatch(error)) stopReason = { message: result.error, code: result.code }
      }
    }
    results.push(result); onProgress({ results: [...results], current: null })
  }
  return { results, readyDocuments, stopReason, cancelled: signal?.aborted === true }
}
