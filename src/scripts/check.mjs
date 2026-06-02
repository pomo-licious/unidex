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

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey
)

// Check 1: Can we connect with service role?
const { data: { users }, error: authError } =
  await supabase.auth.admin.listUsers()
console.log('Auth connection:', authError || 'OK')
console.log('Total users:', users?.length)

// Check 2: Demo user state
const demo = users?.find(u => u.email === 'demo@unidex.co.in')
console.log('Demo user:', {
  found: !!demo,
  id: demo?.id,
  email_confirmed: demo?.email_confirmed_at,
  last_sign_in: demo?.last_sign_in_at
})
