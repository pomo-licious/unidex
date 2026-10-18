import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import CollegeResearch from '../src/components/CollegeResearch'
import { groupCollegeResearch, researchValue } from '../src/lib/admissionsCollegeResearch.js'

describe('Complete readable college research', () => {
  it('retains every imported research field, including previously unknown column names', () => {
    const research = { fields: { 'Fees — Published': '₹5 lakh, tuition only', 'Documents required': 'Degree certificate', 'Top recruiters': 'Example Ltd', 'New column from future research': 'Additional fact' } }
    expect(groupCollegeResearch(research).flatMap(group => group.fields).map(field => field.label).sort()).toEqual(Object.keys(research.fields).sort())
  })
  it('keeps each research field in only one section', () => {
    expect(groupCollegeResearch({ fields: { 'Application fee': '₹1,000' } }).flatMap(group => group.fields)).toHaveLength(1)
  })
  it('preserves a real zero value rather than marking it missing', () => {
    expect(researchValue(0)).toBe('0')
  })
  it('renders supplementary programme notes alongside the master research', () => {
    const markup = renderToStaticMarkup(createElement(CollegeResearch, { research: { fields: { Eligibility: 'Bachelor’s degree' }, supplementary: [{ sheet: 'Placement details', fields: { Cohort: '2024–26 · institute-wide outcome' } }] } }))
    expect(markup).toContain('2024–26 · institute-wide outcome')
  })
  it('turns valid source links into inspectable external references', () => {
    const markup = renderToStaticMarkup(createElement(CollegeResearch, { research: { fields: { Source: 'https://example.edu/prospectus.pdf' } } }))
    expect(markup).toContain('href="https://example.edu/prospectus.pdf"')
  })
  it('omits spreadsheet mechanics from primary and supplementary research while retaining useful fee and career explanations', () => {
    const markup = renderToStaticMarkup(createElement(CollegeResearch, { research: { fields: { 'Calculation low': 'C6*G6', 'Internal Student Tier': 'Internal tier judgement', 'Consolidated programme IDs': 'NCR-001', 'Fee estimate basis': 'Two published annual academic fees; accommodation excluded' }, supplementary: [{ sheet: 'Fee details', fields: { 'Programme 2 low formula': 'C6*G6', 'Programme-Aligned Career Paths — inference': 'Finance analyst; inferred pathway rather than a placement promise' } }] } }))
    expect({ formula: markup.includes('C6*G6'), internalTier: markup.includes('Internal tier judgement'), worksheetId: markup.includes('NCR-001'), feeBasis: markup.includes('Two published annual academic fees; accommodation excluded'), roleInference: markup.includes('Finance analyst; inferred pathway rather than a placement promise') }).toEqual({ formula: false, internalTier: false, worksheetId: false, feeBasis: true, roleInference: true })
  })
  it('labels scenario calculations as illustrations and explains that they do not promise future earnings', () => {
    const markup = renderToStaticMarkup(createElement(CollegeResearch, { research: { fields: { Programme: 'MBA' }, supplementary: [{ sheet: 'Career outlook', fields: { '3Y at 6% LPA': 12.3 } }] } }))
    expect({ illustrativeLabel: markup.includes('3-year illustration · 6% annual growth (LPA)'), caveat: markup.includes('these figures do not promise future earnings'), numericScenario: markup.includes('12.3') }).toEqual({ illustrativeLabel: true, caveat: true, numericScenario: true })
  })
})
