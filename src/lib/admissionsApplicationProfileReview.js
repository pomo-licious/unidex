import { prepareProfileSaveReview } from './admissionsAiReview'
import { normalizeAdmissionsProfile } from './admissionsProfile'

// Both application save paths pass through the same checked, immutable attempt.
// Callers use `profile` for the draft and submission after this succeeds.
export async function saveReviewedApplicationProfile({ candidate, editorBase, trackedBase, user, loadRecord, saveProfile, confirmCorrections, isActive = () => true }) {
  const captured = structuredClone(candidate)
  if (!isActive()) return { cancelled: true }
  const latest = await loadRecord(user.id)
  if (!isActive()) return { cancelled: true }
  const prepared = prepareProfileSaveReview(captured, editorBase, { ...latest, profile: normalizeAdmissionsProfile(latest.profile, user) }, user.id, trackedBase)
  if (prepared.changes.length && !(await confirmCorrections(prepared))) return { cancelled: true }
  if (!isActive()) return { cancelled: true }
  const saved = await saveProfile(prepared.snapshot.profile, { expectedRevision: prepared.snapshot.expectedRevision })
  if (!saved || typeof saved !== 'object') throw new Error('The server did not confirm your profile save. Your application has not been submitted.')
  if (!isActive()) return { cancelled: true }
  return { profile: prepared.snapshot.profile, savedProfile: normalizeAdmissionsProfile(saved, user) }
}
