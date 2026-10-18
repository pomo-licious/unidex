import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import LandingPage from '../src/pages/LandingPage'
import { FEATURED_NCR_COLLEGES } from '../src/data/featuredNcrColleges'
import { DELHI_NCR_COLLEGES } from '../src/data/delhiNcrColleges'
import { getCollegeImage } from '../src/data/collegeImages'

const html = () => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(LandingPage)))

describe('Delhi NCR homepage showcase', () => {
  it('resolves every featured link to an existing core Delhi NCR catalogue record', () => {
    expect(FEATURED_NCR_COLLEGES.every(featured => DELHI_NCR_COLLEGES.some(college => college.id === featured.id && college.region === 'Delhi NCR' && college.geographicScope === 'core'))).toBe(true)
  })
  it('shows IIT Delhi, MDI Gurgaon and FMS in the considered display order', () => {
    expect(FEATURED_NCR_COLLEGES.map(college => college.id)).toEqual(['ncr-iit-delhi-dms', 'ncr-mdi-gurgaon', 'ncr-fms-delhi'])
  })
  it('renders the featured campus links without needing a database response', () => {
    expect(FEATURED_NCR_COLLEGES.every(college => html().includes(`href="/college/${college.id}"`))).toBe(true)
  })
  it('keeps the out-of-region Ahmedabad campus out of the public homepage', () => {
    expect(html()).not.toContain('iim-ahmedabad')
  })
  it('has an authentic attributed local photo for each featured institution', () => {
    expect(FEATURED_NCR_COLLEGES.every(college => {
      const image = getCollegeImage(college)
      return image?.src.startsWith('/assets/colleges/') && image.credit && image.license && image.sourceUrl.startsWith('https://commons.wikimedia.org/wiki/File:')
    })).toBe(true)
  })
  it('retains the original FMS photograph', () => {
    expect(getCollegeImage(FEATURED_NCR_COLLEGES[2]).src).toBe('/assets/colleges/fms-delhi.webp')
  })
  it('keeps MDI native dimensions and provenance hash with the published asset', () => {
    const manifest = JSON.parse(readFileSync(new URL('../public/assets/colleges/manifest.json', import.meta.url), 'utf8'))
    const mdi = manifest.find(image => image.ids.includes('ncr-mdi-gurgaon'))
    const bytes = readFileSync(new URL(`../public${mdi.src}`, import.meta.url))
    expect([mdi.width, mdi.height, mdi.sha256]).toEqual([500, 158, createHash('sha256').update(bytes).digest('hex')])
  })
})
