import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import CollegeImage from '../src/components/CollegeImage'
import { hasCollegePhoto } from '../src/data/collegeImages'

const college = { id: 'ncr-fms-delhi', name: 'FMS Delhi' }
const renderImage = collegeHref => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(CollegeImage, { college, collegeHref })))

describe('campus photograph navigation', () => {
  it('preserves the selected programme when a student opens the campus photo', () => {
    expect(renderImage('/college/ncr-fms-delhi?programme=programme-ncr-001')).toContain('href="/college/ncr-fms-delhi?programme=programme-ncr-001"')
  })
  it('continues to support homepage college links without a programme query', () => {
    expect(renderImage('/college/ncr-fms-delhi')).toContain('href="/college/ncr-fms-delhi"')
  })
  it.each([
    'https://example.com/college/ncr-fms-delhi',
    '//example.com/college/ncr-fms-delhi',
    '/college/../profile',
    '/college/ncr-fms-delhi?redirect=https://example.com',
    '/college/ncr-fms-delhi?programme=programme-ncr-001&redirect=/profile',
    '/college/ncr-fms-delhi?programme=a&programme=b',
    '/college/ncr-fms-delhi?programme=',
    '/college/ncr-fms-delhi?programme=%2Fprofile',
    '/college/ncr-fms-delhi?programme=programme-ncr-001#extra',
  ])('does not turn an unsupported destination into a photo link: %s', destination => {
    expect(renderImage(destination)).not.toContain('aria-label="Explore FMS Delhi"')
  })
  it('identifies an audited campus image for discovery ordering', () => {
    expect(hasCollegePhoto(college)).toBe(true)
  })
  it('does not treat an arbitrary external image as verified campus photography', () => {
    expect(hasCollegePhoto({ id: 'unknown', name: 'Unknown college', image_url: 'https://example.edu/campus.jpg' })).toBe(false)
  })
})
