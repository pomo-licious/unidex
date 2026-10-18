import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import { createEmptyProfile, getProfileProgress, validateAdmissionsProfile } from '../src/lib/admissionsProfile'
import { getProfileSectionForPath } from '../src/lib/admissionsProfileSections'

const source = readFileSync(new URL('../src/components/AdmissionsProfileForm.jsx', import.meta.url), 'utf8')
const helpers = source.slice(source.indexOf('function numberOrNull('), source.indexOf('\nfunction ProfessionalQualifications('))
const formStart = source.indexOf('export default function AdmissionsProfileForm(')
const formEnd = source.indexOf('\n  return <Container', formStart)
if (formStart < 0 || formEnd < 0 || !helpers.includes('function serialize(')) throw new Error('Update the form action harness for the component structure.')
const actions = `${source.slice(formStart, formEnd).replace('export default ', '')}\n return {submit, saveError, saved, dirty, active}; }`
const base = { ...createEmptyProfile(), full_name: 'Synthetic Applicant', email: 'applicant@example.invalid' }

// Use the real submit and serialization functions. Deterministic state hooks
// let this verify save boundaries without a browser or authenticated records.
function harness(value) {
  const hooks = []
  let cursor = 0
  const onSave = vi.fn(async next => next)
  const scope = {
    createEmptyProfile, getProfileProgress, validateAdmissionsProfile, getProfileSectionForPath,
    SECTIONS: ['personal', 'academics', 'exams', 'work', 'preferences'].map(id => ({ id })),
    useState(initial) {
      const index = cursor++
      if (!(index in hooks)) hooks[index] = typeof initial === 'function' ? initial() : initial
      return [hooks[index], next => { hooks[index] = typeof next === 'function' ? next(hooks[index]) : next }]
    },
  }
  vm.runInNewContext(`${helpers}\n${actions}\nglobalThis.renderForm=AdmissionsProfileForm`, scope)
  const test = { onSave, render() { cursor = 0; test.actions = scope.renderForm({ value, onChange: () => {}, onSave, section: 'academics', guided: true }); return test.actions } }
  test.render()
  return test
}
const event = () => ({ preventDefault() {}, nativeEvent: { submitter: { value: 'continue' } } })

describe('qualification form save boundaries', () => {
  it('rejects an invalid typed mark before invoking the profile save', async () => {
    const test = harness({ ...base, professional_qualifications: [{ qualification: 'CA', percentage: true }] })
    await test.actions.submit(event()); test.render()
    expect({ saves: test.onSave.mock.calls.length, section: test.actions.active, error: test.actions.saveError }).toEqual({ saves: 0, section: 1, error: 'Enter a valid percentage.' })
  })
  it('saves a partial AI draft even when an experienced applicant has not added annual CTC yet', async () => {
    const test = harness({ ...base, total_work_experience_months: 36, professional_qualifications: [{ qualification: 'CA', institution: 'ICAI', percentage: '64.5', completion_year: '2024' }] })
    await test.actions.submit(event()); test.render()
    expect({ saves: test.onSave.mock.calls.length, percentage: test.onSave.mock.calls[0]?.[0].professional_qualifications[0].percentage, ctc: test.onSave.mock.calls[0]?.[0].last_drawn_ctc, saved: test.actions.saved }).toEqual({ saves: 1, percentage: 64.5, ctc: null, saved: true })
  })
  it('does not discard the entered qualification when the server save fails', async () => {
    const value = { ...base, professional_qualifications: [{ qualification: 'CA', institution: 'ICAI' }] }
    const test = harness(value)
    test.onSave.mockRejectedValueOnce(new Error('Connection interrupted'))
    await test.actions.submit(event()); test.render()
    expect({ institution: value.professional_qualifications[0].institution, error: test.actions.saveError, saved: test.actions.saved }).toEqual({ institution: 'ICAI', error: 'Connection interrupted', saved: false })
  })
})
