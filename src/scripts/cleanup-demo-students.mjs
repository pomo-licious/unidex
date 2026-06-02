import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load .env file
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '../../.env')

const envContent = readFileSync(envPath, 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [key, value] = line.split('=')
    if (key && value) {
      envVars[key.trim()] = value.trim()
    }
  }
})

const supabaseUrl = envVars.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not set in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

console.log('\n========== CLEANING UP DEMO STUDENT RECORDS ==========\n')

try {
  // Step 1: Find all student rows for demo@unidex.co.in
  console.log('Step 1: Finding all student rows for demo@unidex.co.in...\n')

  const { data: allStudents, error: findErr } = await supabase
    .from('students')
    .select('id, name, email, user_id, created_at')
    .order('created_at', { ascending: true })

  if (findErr) {
    console.error('✗ Query failed:', findErr)
    process.exit(1)
  }

  // Filter to only rows for the demo user by joining with auth users
  // Since we can't do a direct auth join, we'll fetch all and show demo-related ones
  const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers()
  if (authErr) {
    console.error('✗ Auth query failed:', authErr)
    process.exit(1)
  }

  const demoUser = users.find(u => u.email === 'demo@unidex.co.in')
  if (!demoUser) {
    console.error('✗ Demo user not found')
    process.exit(1)
  }

  const demoStudents = allStudents.filter(s => s.user_id === demoUser.id)

  console.log(`Found ${demoStudents.length} student record(s) for demo@unidex.co.in:\n`)
  demoStudents.forEach(s => {
    console.log(`  ID: ${s.id}`)
    console.log(`  Name: ${s.name}`)
    console.log(`  Email: ${s.email}`)
    console.log(`  Created: ${s.created_at}`)
    console.log()
  })

  // Step 2: Delete all except Rohan Mehta
  if (demoStudents.length > 1) {
    console.log(`Step 2: Deleting ${demoStudents.length - 1} duplicate record(s), keeping Rohan Mehta...\n`)

    const { error: deleteErr, count } = await supabase
      .from('students')
      .delete()
      .eq('user_id', demoUser.id)
      .neq('name', 'Rohan Mehta')

    if (deleteErr) {
      console.error('✗ Delete failed:', deleteErr)
      process.exit(1)
    }

    console.log(`✓ Deleted ${count} record(s)\n`)
  } else {
    console.log('Step 2: Only one student record exists, no deletion needed\n')
  }

  // Step 3: Verify the remaining row
  console.log('Step 3: Verifying remaining record...\n')

  const { data: remaining, error: verifyErr } = await supabase
    .from('students')
    .select('id, name, email, user_id, academic_background')
    .eq('user_id', demoUser.id)
    .single()

  if (verifyErr) {
    console.error('✗ Verification failed:', verifyErr)
    process.exit(1)
  }

  console.log('✓ Remaining student record:')
  console.log(`  ID: ${remaining.id}`)
  console.log(`  Name: ${remaining.name}`)
  console.log(`  Email: ${remaining.email}`)
  console.log(`  Academic Background:`, remaining.academic_background)

  console.log('\n========== CLEANUP COMPLETE ==========\n')

} catch (err) {
  console.error('✗ Exception:', err.message)
  process.exit(1)
}
