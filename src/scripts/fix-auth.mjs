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
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not found in environment')
  console.error('Please set: export SUPABASE_SERVICE_ROLE_KEY="your-key-here"')
  process.exit(1)
}

console.log('\n========== FIXING DEMO ACCOUNT AUTH ==========\n')
console.log('Supabase URL:', supabaseUrl)
console.log('Service role key: ***\n')

const supabase = createClient(supabaseUrl, serviceRoleKey)

try {
  // Step 1: find the user
  console.log('Step 1: Finding demo@unidex.co.in...')
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers()

  if (listErr) {
    console.error('✗ Failed to list users:', listErr)
    process.exit(1)
  }

  const demo = users.find(u => u.email === 'demo@unidex.co.in')

  if (!demo) {
    console.error('✗ User demo@unidex.co.in not found')
    console.log('Available users:', users.map(u => u.email).join(', '))
    process.exit(1)
  }

  console.log('✓ Found user:', demo.id)
  console.log('  Email:', demo.email)
  console.log('  Email confirmed at:', demo.email_confirmed_at || 'NOT CONFIRMED')
  console.log('  Created at:', demo.created_at)

  // Step 2: confirm email + reset password
  console.log('\nStep 2: Confirming email and setting password...')
  const { data, error } = await supabase.auth.admin.updateUserById(
    demo.id,
    {
      email_confirm: true,
      password: 'Unidex2026!'
    }
  )

  if (error) {
    console.error('✗ Update failed:', error)
    process.exit(1)
  }

  console.log('✓ User updated successfully')
  console.log('  Email confirmed at:', data?.user?.email_confirmed_at)
  console.log('  Last sign in at:', data?.user?.last_sign_in_at)

  console.log('\n========== DEMO ACCOUNT FIXED ==========\n')
  console.log('demo@unidex.co.in can now sign in with password: Unidex2026!')

} catch (err) {
  console.error('✗ Exception:', err.message)
  process.exit(1)
}
