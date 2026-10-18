import { supabase } from './supabase'
import { DOCUMENT_MIME_TYPES, IMAGE_MIME_TYPES, isDocumentType } from './admissionsDocumentTypes'
import { normalizeAiImports, validateAdmissionsProfile } from './admissionsProfile'
import { sanitizeLocalAdmissionsExtraction } from './admissionsLocalExtraction'

const BUCKET = 'unidex-admissions-private'
const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = DOCUMENT_MIME_TYPES
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const attemptIds = new Map()

export class AdmissionsError extends Error {
  constructor(message, { code = 'ADMISSIONS_ERROR', cause, details, status, stopBatch = false } = {}) {
    super(message)
    this.name = 'AdmissionsError'
    this.code = code
    this.cause = cause
    this.details = details
    this.status = status
    this.stopBatch = stopBatch
  }
}

function fail(error, action) {
  if (error instanceof AdmissionsError) return error
  const code = error?.code || error?.status || 'ADMISSIONS_ERROR'
  const missingSetup = ['42P01', '42883', 'PGRST202', 'PGRST205'].includes(String(code))
  return new AdmissionsError(
    missingSetup
      ? 'Admissions storage is not configured yet. Apply the admissions workspace migration before continuing.'
      : `${action}: ${error?.message || 'The server did not complete the request. Please try again.'}`,
    { code, cause: error, details: error?.details || error?.hint },
  )
}

async function currentUser(expectedUserId) {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) throw new AdmissionsError('Sign in to save your admissions workspace.', { code: 'AUTH_REQUIRED', cause: error, stopBatch: true })
  if (expectedUserId && data.user.id !== expectedUserId) throw new AdmissionsError('Your account changed. Reload this page before saving your changes.', { code: 'ACCOUNT_CHANGED', stopBatch: true })
  return data.user
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AdmissionsError(`${label} must be an object.`, { code: 'INVALID_INPUT' })
}

async function ownedDocument(document, expectedUserId) {
  const user = await currentUser(expectedUserId)
  if (!document?.id) throw new AdmissionsError('Select an uploaded document first.', { code: 'INVALID_INPUT' })
  const { data, error } = await supabase.from('student_admissions_documents').select('*').eq('id', document.id).eq('user_id', user.id).single()
  if (error || !data) throw fail(error || new Error('Document not found.'), 'Could not load document')
  if (data.storage_bucket !== BUCKET || typeof data.storage_path !== 'string' || !data.storage_path.startsWith(`${user.id}/`)) throw new AdmissionsError('This document is not in your private storage.', { code: 'DOCUMENT_OWNERSHIP_INVALID', stopBatch: true })
  return data
}

function isPrivatePhoto(document, userId) {
  return document?.user_id === userId && document.document_type === 'photo' && IMAGE_MIME_TYPES.includes(document.mime_type) && document.storage_bucket === BUCKET && typeof document.storage_path === 'string' && document.storage_path.startsWith(`${userId}/`) && document.size_bytes > 0 && document.size_bytes <= MAX_BYTES
}

export async function getAdmissionsProfilePhoto(profileOrDocumentId, expectedUserId) {
  const user = await currentUser(expectedUserId)
  const id = typeof profileOrDocumentId === 'string' ? profileOrDocumentId : profileOrDocumentId?.profile_photo_document_id
  if (!id || !UUID.test(id)) return null
  const { data: document, error } = await supabase.from('student_admissions_documents').select('*').eq('id', id).eq('user_id', user.id).maybeSingle()
  if (error) throw fail(error, 'Could not load your profile photograph')
  if (!isPrivatePhoto(document, user.id)) return null
  const { data, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(document.storage_path, 300)
  if (signedError) throw fail(signedError, 'Could not open your private profile photograph')
  await currentUser(user.id)
  if (!data?.signedUrl) return null
  return { document_id: document.id, file_name: document.file_name, url: data.signedUrl, expires_at: new Date(Date.now() + 300_000).toISOString() }
}

async function withSignedUrls(documents) {
  if (!documents.length) return []
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(documents.map(d => d.storage_path), 300)
  if (error) throw fail(error, 'Could not create private document links')
  const byPath = new Map((data || []).map(item => [item.path, item]))
  return documents.map(document => ({ ...document, signed_url: byPath.get(document.storage_path)?.signedUrl || null }))
}

export async function loadAdmissionsProfileRecord(expectedUserId) {
  const user = await currentUser(expectedUserId)
  const { data, error } = await supabase.from('student_admissions_profiles').select('profile,schema_version,revision,updated_at').eq('user_id', user.id).maybeSingle()
  if (error) throw fail(error, 'Could not load profile')
  if (data) return { profile: { ...data.profile, schema_version: data.schema_version }, revision: Number(data.revision) }
  // Read-only continuity for existing accounts. Nothing is migrated until Save.
  const { data: legacy, error: legacyError } = await supabase.from('students').select('name,email,academic_background,target_colleges,academic_10th,academic_12th,academic_graduation,exam_scores').eq('user_id', user.id).maybeSingle()
  if (legacyError) throw fail(legacyError, 'Could not load your existing profile')
  if (!legacy) return { profile: null, revision: 0 }
  const background = legacy.academic_background && typeof legacy.academic_background === 'object' ? legacy.academic_background : {}
  const present = value => value !== undefined && value !== null && value !== ''
  const academic = (direct, fallback) => ({ ...Object.fromEntries(Object.entries(fallback).filter(([, value]) => present(value))), ...(direct && typeof direct === 'object' ? direct : {}) })
  const profile = {
    schema_version: 1,
    full_name: legacy.name || '', email: legacy.email || user.email || '',
    phone: background.mobile || background.phone || '', current_city: background.city || '',
    date_of_birth: background.date_of_birth || '', gender: background.gender || '', nationality: background.nationality || '',
    academic_10th: academic(legacy.academic_10th, {}),
    academic_12th: academic(legacy.academic_12th, {}),
    academic_graduation: academic(legacy.academic_graduation, { university: background.university, college: background.college, degree: background.degree, branch: background.major, year_of_passing: background.grad_year, cgpa: background.cgpa ?? background.gpa, cgpa_scale: background.gpa_scale }),
    exam_scores: [], work_experience: [],
  }
  if (Array.isArray(legacy.exam_scores)) profile.exam_scores = legacy.exam_scores
  else if (legacy.exam_scores && typeof legacy.exam_scores === 'object' && legacy.exam_scores.exam) profile.exam_scores = [legacy.exam_scores]
  if (!profile.exam_scores.length) {
    if (present(background.cat_percentile)) profile.exam_scores.push({ exam: 'CAT', year: background.cat_year ?? null, percentile: background.cat_percentile, total_score: null, section_scores: Object.fromEntries(['VARC', 'DILR', 'QA'].map(section => [section, background[`cat_${section.toLowerCase()}`]]).filter(([, value]) => present(value))) })
    for (const exam of ['GMAT', 'GRE']) if (present(background[`${exam.toLowerCase()}_score`])) profile.exam_scores.push({ exam, total_score: background[`${exam.toLowerCase()}_score`], percentile: null, year: null, section_scores: {} })
  }
  if (background.company || background.role) profile.work_experience = [{ company: background.company || '', designation: background.role || '', start_date: null, end_date: null }]
  if (present(background.work_exp_yrs) && Number.isFinite(Number(background.work_exp_yrs))) profile.total_work_experience_months = Number(background.work_exp_yrs) * 12
  // Preserve explicitly recorded score scales; never convert GPA or percentiles.
  return { profile, revision: 0 }
}

export async function loadAdmissionsProfile(expectedUserId) {
  return (await loadAdmissionsProfileRecord(expectedUserId)).profile
}

export async function saveAdmissionsProfile(profile, expectedUserId, expectedRevision) {
  requireObject(profile, 'Profile')
  const user = await currentUser(expectedUserId)
  const validation = validateAdmissionsProfile(profile)
  if (!validation.valid) throw new AdmissionsError('Review the highlighted profile details before saving.', { code: 'INVALID_PROFILE', details: validation.errors })
  const canonicalProfile = { ...profile, schema_version: 1, profile_photo_document_id: profile.profile_photo_document_id || null, ai_imports: normalizeAiImports(profile.ai_imports) }
  if (JSON.stringify(canonicalProfile).length > 1_000_000) throw new AdmissionsError('Your profile history is too large to save. Contact support before continuing.', { code: 'PROFILE_TOO_LARGE' })
  if (canonicalProfile.profile_photo_document_id) {
    const { data: photo, error: photoError } = await supabase.from('student_admissions_documents').select('*').eq('id', canonicalProfile.profile_photo_document_id).eq('user_id', user.id).maybeSingle()
    if (photoError) throw fail(photoError, 'Could not validate your profile photograph')
    if (!photo) {
      // A removed, previously saved photograph must not trap later profile edits.
      // Only clear a pointer already persisted for this account; reject new/foreign IDs.
      const { data: existing, error: existingError } = await supabase.from('student_admissions_profiles').select('profile').eq('user_id', user.id).maybeSingle()
      if (existingError) throw fail(existingError, 'Could not check your saved profile photograph')
      if (existing?.profile?.profile_photo_document_id === canonicalProfile.profile_photo_document_id) canonicalProfile.profile_photo_document_id = null
      else throw new AdmissionsError('Choose an image uploaded as a profile photograph in your account.', { code: 'INVALID_PROFILE_PHOTO' })
    } else if (!isPrivatePhoto(photo, user.id)) throw new AdmissionsError('Choose an image uploaded as a profile photograph in your account.', { code: 'INVALID_PROFILE_PHOTO' })
  }
  await currentUser(user.id)
  const row = { user_id: user.id, profile: canonicalProfile, schema_version: 1 }
  if (expectedRevision !== undefined && (!Number.isInteger(expectedRevision) || expectedRevision < 0)) throw new AdmissionsError('Reload the latest profile before saving reviewed details.', { code: 'INVALID_REVISION' })
  let query
  if (expectedRevision === 0) query = supabase.from('student_admissions_profiles').insert(row).select('profile').single()
  else if (expectedRevision > 0) query = supabase.from('student_admissions_profiles').update({ profile: row.profile, schema_version: 1 }).eq('user_id', user.id).eq('revision', expectedRevision).select('profile').maybeSingle()
  else query = supabase.from('student_admissions_profiles').upsert(row, { onConflict: 'user_id' }).select('profile').single()
  const { data, error } = await query
  if (expectedRevision !== undefined && ((expectedRevision === 0 && error?.code === '23505') || (!error && !data))) throw new AdmissionsError('Your profile changed in another tab. Reopen the document review to compare with your latest profile before saving.', { code: 'PROFILE_CHANGED' })
  if (error) throw fail(error, 'Could not save profile')
  return data.profile
}

export async function listAdmissionsDocuments() {
  const user = await currentUser()
  const { data, error } = await supabase.from('student_admissions_documents').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  if (error) throw fail(error, 'Could not load documents')
  return withSignedUrls(data || [])
}

export async function uploadAdmissionsDocument(file, documentType, onProgress, expectedUserId) {
  const user = await currentUser(expectedUserId)
  if (!file || !ALLOWED_TYPES.includes(file.type)) throw new AdmissionsError('Upload a PDF, JPG, PNG or WebP file.', { code: 'INVALID_FILE_TYPE' })
  if (!file.size || file.size > MAX_BYTES) throw new AdmissionsError('Documents must be between 1 byte and 10 MB.', { code: 'FILE_TOO_LARGE' })
  if (!isDocumentType(documentType)) throw new AdmissionsError('Choose a document category.', { code: 'INVALID_INPUT' })
  if (documentType === 'photo' && !IMAGE_MIME_TYPES.includes(file.type)) throw new AdmissionsError('Profile photographs must be JPG, PNG or WebP images.', { code: 'INVALID_FILE_TYPE' })
  const id = crypto.randomUUID()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-150) || 'document'
  const path = `${user.id}/${id}/${safeName}`
  // Supabase upload exposes no byte progress. These are start/complete signals only.
  onProgress?.(0)
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) throw fail(uploadError, 'Could not upload document')
  const { data, error } = await supabase.from('student_admissions_documents').insert({ id, user_id: user.id, document_type: documentType, file_name: file.name, mime_type: file.type, size_bytes: file.size, storage_bucket: BUCKET, storage_path: path }).select('*').single()
  if (error) {
    const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([path])
    const wrapped = fail(error, 'Could not save document metadata')
    if (cleanupError) wrapped.details = 'The file uploaded but metadata failed. Contact support to remove the unattached upload.'
    throw wrapped
  }
  onProgress?.(100)
  const [document] = await withSignedUrls([data])
  return document
}

export async function extractAdmissionsDocument(document, expectedUserId, openaiDocumentProcessing = false) {
  if (openaiDocumentProcessing !== true) throw new AdmissionsError('Confirm that this document may be sent to OpenAI GPT for extraction before continuing.', { code: 'DOCUMENT_PROCESSING_CONSENT_REQUIRED' })
  const stored = await ownedDocument(document, expectedUserId)
  if (stored.document_type === 'photo') throw new AdmissionsError('Profile photographs are not sent for text extraction.', { code: 'PHOTO_EXTRACTION_DISABLED' })
  const { data, error } = await supabase.functions.invoke('admissions-ocr', { body: { document_id: stored.id, openai_document_processing: true } })
  if (error) {
    let body = {}
    try { body = await error.context?.json() || {} } catch { /* Response can be unavailable for network failures. */ }
    const status = error.context?.status || error.status
    const code = body.code || (status === 401 ? 'AUTH_REQUIRED' : status === 429 ? 'OCR_RATE_LIMITED' : 'OCR_FAILED')
    const stopBatch = body.stop_batch === true || ['AUTH_REQUIRED', 'ACCOUNT_CHANGED', 'OCR_DISABLED', 'OCR_NOT_CONFIGURED', 'OCR_QUOTA_EXHAUSTED', 'OCR_RATE_LIMITED', 'OCR_PROVIDER_CONFIGURATION', 'OCR_SERVICE_UNAVAILABLE'].includes(code)
    throw new AdmissionsError(body.error || error.message || 'Document extraction is unavailable. Enter your details manually.', { code, status, stopBatch, cause: error })
  }
  if (!data?.ok || !data?.document) throw new AdmissionsError(data?.error || 'OCR returned an invalid response.', { code: data?.code || 'OCR_FAILED', stopBatch: data?.stop_batch === true })
  await currentUser(stored.user_id)
  return { ...data.document, signed_url: document.signed_url || null }
}

function requireActiveExtraction(signal) {
  if (signal?.aborted) throw new DOMException('Extraction cancelled. Previously saved results remain available.', 'AbortError')
}

// Download through authenticated Storage rather than trusting a URL supplied by
// a card. The database row, ownership and bytes are rechecked before OCR sees it.
export async function downloadAdmissionsDocumentForLocalExtraction(document, expectedUserId, { signal } = {}) {
  requireActiveExtraction(signal)
  const stored = await ownedDocument(document, expectedUserId)
  if (stored.document_type === 'photo') throw new AdmissionsError('Use profile photographs directly without text extraction.', { code: 'PHOTO_EXTRACTION_DISABLED' })
  if (!ALLOWED_TYPES.includes(stored.mime_type) || !Number.isInteger(Number(stored.size_bytes)) || stored.size_bytes <= 0 || stored.size_bytes > MAX_BYTES || /(^|\/)\.\.?($|\/)|\\/.test(stored.storage_path)) throw new AdmissionsError('This document has invalid file metadata. Upload a supported copy.', { code: 'LOCAL_OCR_INVALID_FILE' })
  requireActiveExtraction(signal)
  const { data, error } = await supabase.storage.from(BUCKET).download(stored.storage_path, {}, { signal })
  requireActiveExtraction(signal)
  if (error) throw fail(error, 'Could not download your private document')
  if (!data || typeof data.arrayBuffer !== 'function' || data.size <= 0 || data.size > MAX_BYTES || data.size !== Number(stored.size_bytes) || data.type && data.type !== stored.mime_type && data.type !== 'application/octet-stream') throw new AdmissionsError('Downloaded file details do not match the uploaded document. Upload a fresh copy.', { code: 'LOCAL_OCR_INVALID_FILE' })
  const magic = new Uint8Array(await data.slice(0, 16).arrayBuffer())
  const valid = stored.mime_type === 'application/pdf' ? String.fromCharCode(...magic.slice(0, 5)) === '%PDF-' : stored.mime_type === 'image/png' ? [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => magic[index] === byte) : stored.mime_type === 'image/jpeg' ? magic[0] === 255 && magic[1] === 216 && magic[2] === 255 : stored.mime_type === 'image/webp' ? String.fromCharCode(...magic.slice(0, 4)) === 'RIFF' && String.fromCharCode(...magic.slice(8, 12)) === 'WEBP' : false
  if (!valid) throw new AdmissionsError('The file contents do not match its document format. Upload a supported copy.', { code: 'LOCAL_OCR_INVALID_FILE' })
  await currentUser(stored.user_id)
  requireActiveExtraction(signal)
  return { blob: data.type === stored.mime_type ? data : data.slice(0, data.size, stored.mime_type), document: stored }
}

export async function saveLocalAdmissionsExtraction(document, extractedData, expectedUserId, { extractionModel = 'local:pdfjs+tesseract', signal } = {}) {
  requireActiveExtraction(signal)
  requireObject(extractedData, 'Extracted suggestions')
  if (JSON.stringify(extractedData).length > 100_000) throw new AdmissionsError('The extracted suggestions are too large. Try a shorter document.', { code: 'LOCAL_OCR_RESULT_TOO_LARGE' })
  const stored = await ownedDocument(document, expectedUserId)
  if (stored.document_type === 'photo') throw new AdmissionsError('Profile photos do not have extracted text fields.', { code: 'PHOTO_EXTRACTION_DISABLED' })
  const suggestions = sanitizeLocalAdmissionsExtraction(extractedData, stored.document_type)
  if (typeof extractionModel !== 'string' || !/^local:[a-zA-Z0-9.+_-]{1,100}$/.test(extractionModel)) throw new AdmissionsError('The local extraction engine could not be identified.', { code: 'LOCAL_OCR_INVALID_RESULT' })
  await currentUser(stored.user_id)
  requireActiveExtraction(signal)
  const { data, error } = await supabase.from('student_admissions_documents').update({ extracted_data: suggestions, extraction_model: extractionModel, extraction_error: null, extraction_started_at: null, reviewed_data: null, reviewed_at: null, status: 'needs_review' }).eq('id', stored.id).eq('user_id', stored.user_id).select('*').single()
  if (error) throw fail(error, 'Could not save automatically extracted suggestions')
  if (!data?.id) throw new AdmissionsError('The server did not confirm that suggestions were saved.', { code: 'LOCAL_OCR_SAVE_NOT_CONFIRMED' })
  await currentUser(stored.user_id)
  // An in-flight write may complete while cancellation is requested. Return its
  // confirmed record so the caller reports that saved partial result accurately.
  return { ...data, signed_url: document.signed_url || null }
}

export async function saveDocumentReview(document, reviewedData, expectedUserId) {
  requireObject(reviewedData, 'Reviewed data')
  const stored = await ownedDocument(document, expectedUserId)
  if (!stored.extracted_data) throw new AdmissionsError('Extract document fields before confirming them.', { code: 'REVIEW_REQUIRED' })
  const { data, error } = await supabase.from('student_admissions_documents').update({ reviewed_data: reviewedData, reviewed_at: new Date().toISOString(), status: 'reviewed' }).eq('id', stored.id).eq('user_id', stored.user_id).select('*').single()
  if (error) throw fail(error, 'Could not save reviewed fields')
  // Profile changes are deliberate UI actions after review; extraction never overwrites it.
  return { ...data, signed_url: document.signed_url || null }
}

export async function removeAdmissionsDocument(document, expectedUserId) {
  const stored = await ownedDocument(document, expectedUserId)
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([stored.storage_path])
  if (storageError) throw fail(storageError, 'Could not remove stored document')
  const { error } = await supabase.from('student_admissions_documents').delete().eq('id', stored.id).eq('user_id', stored.user_id)
  if (error) throw fail(error, 'File removed, but its metadata could not be removed; retry removal')
  return { id: stored.id, removed: true }
}

export async function getAdmissionsDraft() {
  const user = await currentUser()
  const { data, error } = await supabase.from('admissions_drafts').select('draft').eq('user_id', user.id).maybeSingle()
  if (error) throw fail(error, 'Could not load application draft')
  return data?.draft || null
}

export async function saveAdmissionsDraft(draft, expectedUserId) {
  requireObject(draft, 'Draft')
  const user = await currentUser(expectedUserId)
  const { data, error } = await supabase.from('admissions_drafts').upsert({ user_id: user.id, schema_version: 1, draft }, { onConflict: 'user_id' }).select('draft').single()
  if (error) throw fail(error, 'Could not save application draft')
  return data.draft
}

export async function listCollegePlans() {
  const user = await currentUser()
  const { data, error } = await supabase.from('admissions_college_plans').select('*').eq('user_id', user.id).order('updated_at', { ascending: false })
  if (error) throw fail(error, 'Could not load saved colleges')
  return data || []
}

export async function saveCollegePlan(plan, expectedUserId) {
  requireObject(plan, 'College plan')
  const user = await currentUser(expectedUserId)
  if (!plan.college_id || !plan.college_snapshot) throw new AdmissionsError('A college plan needs its college ID and snapshot.', { code: 'INVALID_INPUT' })
  const row = { user_id: user.id, college_id: String(plan.college_id), college_snapshot: plan.college_snapshot }
  for (const key of ['status', 'notes', 'checklist', 'is_bookmarked', 'is_selected']) if (plan[key] !== undefined) row[key] = plan[key]
  const { data, error } = await supabase.from('admissions_college_plans').upsert(row, { onConflict: 'user_id,college_id' }).select('*').single()
  if (error) throw fail(error, 'Could not save college plan')
  return data
}

export async function removeCollegePlan(id, expectedUserId) {
  const user = await currentUser(expectedUserId)
  if (!id) throw new AdmissionsError('Choose a saved college first.', { code: 'INVALID_INPUT' })
  const { error } = await supabase.from('admissions_college_plans').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw fail(error, 'Could not remove college plan')
  return { id, removed: true }
}

export async function submitAdmissionsApplication({ profile, colleges, collegeAnswers = {}, consents, requestId, expectedUserId }) {
  requireObject(profile, 'Profile')
  requireObject(collegeAnswers, 'College answers')
  requireObject(consents, 'Consents')
  const user = await currentUser(expectedUserId)
  if (!Array.isArray(colleges) || !colleges.length) throw new AdmissionsError('Select at least one college.', { code: 'INVALID_INPUT' })
  if (!consents.accuracy || !consents.privacy || !consents.internal_submission) throw new AdmissionsError('Review and accept every submission declaration.', { code: 'CONSENT_REQUIRED' })
  const key = JSON.stringify({ user: user.id, profile, colleges, collegeAnswers, consents })
  if (!requestId && !attemptIds.has(key)) attemptIds.set(key, crypto.randomUUID())
  const { data, error } = await supabase.rpc('submit_admissions_application', { p_request_id: requestId || attemptIds.get(key), p_profile: profile, p_colleges: colleges, p_college_answers: collegeAnswers, p_consents: consents, p_expected_user_id: user.id })
  if (error) throw fail(error, 'Could not submit application')
  if (!data?.receipt || !data?.id) throw new AdmissionsError('The server did not return a submission receipt. Retry using the same request ID.', { code: 'INVALID_RECEIPT' })
  return data
}

export async function recoverAdmissionsSubmission(requestId, expectedUserId) {
  const user = await currentUser(expectedUserId)
  if (!requestId) throw new AdmissionsError('A saved submission request ID is required to recover your receipt.', { code: 'INVALID_INPUT' })
  const { data, error } = await supabase.from('admissions_submissions').select('id,request_id,receipt,schema_version,status,profile_snapshot,colleges_snapshot,college_answers_snapshot,consents,submitted_at').eq('request_id', requestId).eq('user_id', user.id).maybeSingle()
  if (error) throw fail(error, 'Could not check your submission receipt')
  return data ? { ...data, college_count: data.colleges_snapshot?.length || 0 } : null
}
