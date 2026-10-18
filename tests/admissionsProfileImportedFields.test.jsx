import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import AdmissionsProfileForm from '../src/components/AdmissionsProfileForm'

const importedExam = { full_name: 'Applicant', email: 'applicant@example.com', exam_scores: [{ exam: 'CAT', section_scores: { 'VARC percentile': 87.3, 'DILR scaled score': 26.4 } }] }
const renderExam = () => renderToStaticMarkup(createElement(AdmissionsProfileForm, { value: importedExam, onChange: () => {}, section: 'exams' }))

describe('editing imported exam sections', () => {
  it('shows a preserved custom percentile label rather than hiding the imported field', () => {
    expect(renderExam()).toContain('VARC percentile')
  })
  it('shows the AI-imported custom percentile in an editable number input', () => {
    expect(renderExam()).toMatch(/type="number"[^>]*value="87\.3"/)
  })
  it('preserves a scaled-score label independently from percentile fields', () => {
    expect(renderExam()).toContain('DILR scaled score')
  })
})
