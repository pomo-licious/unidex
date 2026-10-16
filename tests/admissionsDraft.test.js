import { describe, expect, it } from 'vitest'
import { createWriteQueue, mergeDraftProfile } from '../src/lib/admissionsDraft'

describe('draft and reviewed profile reconciliation', () => {
  it('keeps freshly reviewed canonical marks over an older draft', () => {
    const base = { academic_10th: { percentage: 80 } }
    expect(mergeDraftProfile({ academic_10th: { percentage: 91 } }, { academic_10th: { percentage: 85 } }, base).academic_10th.percentage).toBe(91)
  })
  it('preserves a draft-only edit when the canonical field has not changed', () => {
    expect(mergeDraftProfile({ phone: '' }, { phone: '+91 9876543210' }, { phone: '' }).phone).toBe('+91 9876543210')
  })
  it('combines independent changes within an academic record', () => {
    const base = { academic_graduation: { college: 'Original College', percentage: 80 } }
    const current = { academic_graduation: { college: 'Corrected College', percentage: 80 } }
    const draft = { academic_graduation: { college: 'Original College', percentage: 82 } }
    expect(mergeDraftProfile(current, draft, base)).toEqual({ academic_graduation: { college: 'Corrected College', percentage: 82 } })
  })
  it('keeps the canonical exam array if a new OCR-reviewed exam was added', () => {
    const base = { exam_scores: [{ exam: 'CAT', percentile: 90 }] }
    const current = { exam_scores: [{ exam: 'CAT', percentile: 90 }, { exam: 'GMAT', total_score: 645 }] }
    const draft = { exam_scores: [{ exam: 'CAT', percentile: 92 }] }
    expect(mergeDraftProfile(current, draft, base).exam_scores).toEqual(current.exam_scores)
  })
  it('keeps draft exam edits when canonical exams are semantically unchanged after JSONB key ordering', () => {
    const base = { exam_scores: [{ exam: 'CAT', percentile: 90, year: 2026 }] }
    const current = { exam_scores: [{ year: 2026, percentile: 90, exam: 'CAT' }] }
    const draft = { exam_scores: [{ exam: 'CAT', percentile: 92, year: 2026 }] }
    expect(mergeDraftProfile(current, draft, base).exam_scores[0].percentile).toBe(92)
  })
  it('uses the canonical profile for a legacy draft without a reconciliation base', () => {
    expect(mergeDraftProfile({ full_name: 'Correct name' }, { full_name: 'Stale name' }, null).full_name).toBe('Correct name')
  })
})

describe('ordered workspace writes', () => {
  it('does not start a later save until the earlier save finishes', async () => {
    const enqueue = createWriteQueue(), events = []
    let finish
    const pending = new Promise(resolve => { finish = resolve })
    const first = enqueue(async () => { events.push('autosave:start'); await pending; events.push('autosave:end') })
    const second = enqueue(async () => { events.push('receipt:start') })
    await Promise.resolve()
    finish()
    await Promise.all([first, second])
    expect(events).toEqual(['autosave:start', 'autosave:end', 'receipt:start'])
  })
  it('allows the next save to complete after an earlier save rejects', async () => {
    const enqueue = createWriteQueue()
    const failed = enqueue(async () => { throw new Error('Offline') })
    const recovered = enqueue(async () => 'Saved receipt')
    await failed.catch(() => {})
    expect(await recovered).toBe('Saved receipt')
  })
})
