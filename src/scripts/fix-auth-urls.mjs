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

const PROJECT_ID = 'siheziegpnrfjgzubjrk'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not set in environment')
  process.exit(1)
}

console.log('\n========== UPDATING SUPABASE AUTH URLS ==========\n')
console.log('Project ID:', PROJECT_ID)
console.log('Service key: ***\n')

const response = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_ID}/config/auth`,
  {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      site_url: 'https://biz-sable.vercel.app',
      additional_redirect_urls: [
        'https://biz-sable.vercel.app',
        'https://biz-sable.vercel.app/tracker',
        'http://localhost:3000',
        'http://localhost:5173'
      ]
    })
  }
)

const result = await response.json()
console.log('Auth config updated:')
console.log(JSON.stringify(result, null, 2))

if (!response.ok) {
  console.error('\nERROR: Failed to update auth config')
  process.exit(1)
}

console.log('\n========== AUTH URLS CONFIGURED ==========\n')
