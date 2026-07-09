import 'dotenv/config'

const ERPNEXT_BASE = process.env.ERPNEXT_BASE_URL || process.env.ERPNEXT_URL

if (!ERPNEXT_BASE || !process.env.ERPNEXT_API_KEY || !process.env.ERPNEXT_API_SECRET) {
  console.error('ERPNext environment variables are required.')
  process.exit(1)
}

const response = await fetch(`${ERPNEXT_BASE}/api/resource/Lead`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `token ${process.env.ERPNEXT_API_KEY}:${process.env.ERPNEXT_API_SECRET}`,
    Accept: 'application/json',
  },
  body: JSON.stringify({
    lead_name: 'Test API Call',
    email_id: 'apitest2@test.com',
    mobile_no: '9876543210',
  }),
})

console.log('Status:', response.status)
console.log('Response:', await response.text())

if (!response.ok) {
  process.exit(1)
}
