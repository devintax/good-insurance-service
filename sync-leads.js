import 'dotenv/config'

const PORT = process.env.PORT || '3005'
const ADMIN_API_KEY = process.env.ADMIN_API_KEY
const method = process.argv.includes('--status') ? 'GET' : 'POST'

if (!ADMIN_API_KEY) {
  console.error('ADMIN_API_KEY is required to use sync-leads.js')
  process.exit(1)
}

const response = await fetch(`http://127.0.0.1:${PORT}/api/sync`, {
  method,
  headers: { 'x-admin-key': ADMIN_API_KEY },
})

const body = await response.text()
console.log(body)

if (!response.ok) {
  process.exit(1)
}
