import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const colleges = [
  {
    name: 'IIM Ahmedabad',
    avg_lpa: 35,
    placement_median_lpa: 32,
    placement_highest_lpa: 120,
    placement_pct: 100,
    batch_size: 385,
    nirf_rank: 1,
    top_recruiters: ['McKinsey', 'BCG', 'Bain', 'Goldman Sachs', 'Amazon', 'Google', 'Flipkart', 'Hindustan Unilever', 'Aditya Birla', 'JP Morgan'],
    about: 'IIM Ahmedabad is India\'s premier management institution, ranked #1 by NIRF. Known for its rigorous curriculum and world-class faculty.',
  },
  {
    name: 'IIM Bangalore',
    avg_lpa: 33,
    placement_median_lpa: 30,
    placement_highest_lpa: 115,
    placement_pct: 100,
    batch_size: 405,
    nirf_rank: 2,
    top_recruiters: ['McKinsey', 'BCG', 'Microsoft', 'Amazon', 'Flipkart', 'Accenture', 'Deloitte', 'KPMG', 'EY', 'PwC'],
    about: 'IIM Bangalore is one of India\'s top business schools with a strong focus on innovation and entrepreneurship.',
  },
  {
    name: 'IIM Calcutta',
    avg_lpa: 32,
    placement_median_lpa: 29,
    placement_highest_lpa: 110,
    placement_pct: 100,
    batch_size: 460,
    nirf_rank: 3,
    top_recruiters: ['BCG', 'McKinsey', 'Amazon', 'Goldman Sachs', 'Deutsche Bank', 'Citibank', 'ITC', 'HUL', 'P&G', 'Nestle'],
    about: 'IIM Calcutta is India\'s second-oldest IIM with a strong alumni network and placement record.',
  },
  {
    name: 'IIM Lucknow',
    avg_lpa: 28,
    placement_median_lpa: 25,
    placement_highest_lpa: 85,
    placement_pct: 100,
    batch_size: 493,
    nirf_rank: 7,
    top_recruiters: ['Amazon', 'Flipkart', 'Deloitte', 'EY', 'KPMG', 'Accenture', 'ITC', 'HUL', 'Asian Paints', 'Dabur'],
    about: 'IIM Lucknow is known for its strong academics and vibrant campus life.',
  },
  {
    name: 'XLRI Jamshedpur',
    avg_lpa: 30,
    placement_median_lpa: 27,
    placement_highest_lpa: 95,
    placement_pct: 100,
    batch_size: 240,
    nirf_rank: 12,
    top_recruiters: ['Amazon', 'Microsoft', 'McKinsey', 'BCG', 'Tata Steel', 'JSW', 'Mahindra', 'HUL', 'ITC', 'Nestle'],
    about: 'XLRI Jamshedpur is a premier business school with a diverse and global student body.',
  },
  {
    name: 'ISB Hyderabad',
    avg_lpa: 34,
    placement_median_lpa: 31,
    placement_highest_lpa: 108,
    placement_pct: 98,
    batch_size: 900,
    nirf_rank: 5,
    top_recruiters: ['Amazon', 'Google', 'Microsoft', 'McKinsey', 'BCG', 'Bain', 'Goldman Sachs', 'JP Morgan', 'Sequoia', 'SoftBank'],
    about: 'ISB is India\'s premier postgraduate business school with strong international presence.',
  },
  {
    name: 'FMS Delhi',
    avg_lpa: 27,
    placement_median_lpa: 24,
    placement_highest_lpa: 72,
    placement_pct: 100,
    batch_size: 220,
    nirf_rank: 9,
    top_recruiters: ['Amazon', 'Flipkart', 'Deloitte', 'EY', 'ITC', 'HUL', 'Asian Paints', 'Maruti', 'Hero', 'Bajaj'],
    about: 'FMS Delhi is one of India\'s oldest business schools, part of Delhi University.',
  },
  {
    name: 'MDI Gurgaon',
    avg_lpa: 25,
    placement_median_lpa: 22,
    placement_highest_lpa: 65,
    placement_pct: 100,
    batch_size: 300,
    nirf_rank: 14,
    top_recruiters: ['Amazon', 'Deloitte', 'EY', 'KPMG', 'ITC', 'HUL', 'Nestle', 'P&G', 'Maruti', 'Hero'],
    about: 'MDI Gurgaon is a leading business school with strong corporate partnerships.',
  },
  {
    name: 'SPJIMR Mumbai',
    avg_lpa: 28,
    placement_median_lpa: 25,
    placement_highest_lpa: 80,
    placement_pct: 100,
    batch_size: 240,
    nirf_rank: 11,
    top_recruiters: ['Amazon', 'Google', 'McKinsey', 'BCG', 'Goldman Sachs', 'Aditya Birla', 'Mahindra', 'ITC', 'HUL', 'P&G'],
    about: 'SPJIMR is a premier business school in Mumbai with a strong focus on social responsibility.',
  },
  {
    name: 'IIT Bombay SJMSOM',
    avg_lpa: 26,
    placement_median_lpa: 23,
    placement_highest_lpa: 75,
    placement_pct: 100,
    batch_size: 120,
    nirf_rank: 8,
    top_recruiters: ['Amazon', 'Google', 'Microsoft', 'McKinsey', 'Goldman Sachs', 'JP Morgan', 'Flipkart', 'Ola', 'Paytm', 'Zomato'],
    about: 'SJMSOM at IIT Bombay is part of India\'s top engineering institute with excellent placements.',
  },
]

async function seedPlacements() {
  console.log('Starting placement data seed...')

  for (const college of colleges) {
    try {
      // First, get the college by name
      const { data: collegeData, error: fetchError } = await supabase
        .from('colleges')
        .select('id')
        .eq('name', college.name)
        .single()

      if (fetchError || !collegeData) {
        console.error(`College not found: ${college.name}`)
        continue
      }

      // Update the college with placement data
      const { error: updateError } = await supabase
        .from('colleges')
        .update({
          placement_avg_lpa: college.avg_lpa,
          placement_median_lpa: college.placement_median_lpa,
          placement_highest_lpa: college.placement_highest_lpa,
          placement_pct: college.placement_pct,
          batch_size: college.batch_size,
          nirf_rank: college.nirf_rank,
          top_recruiters: college.top_recruiters,
          about: college.about,
        })
        .eq('id', collegeData.id)

      if (updateError) {
        console.error(`Failed to update ${college.name}:`, updateError.message)
      } else {
        console.log(`✓ Updated ${college.name}`)
      }
    } catch (err) {
      console.error(`Error processing ${college.name}:`, err.message)
    }
  }

  console.log('Placement data seed complete!')
  process.exit(0)
}

seedPlacements().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
