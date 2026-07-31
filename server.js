import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DIST_PATH = path.join(__dirname, 'dist')
const PORT = parseInt(process.env.PORT || '3005', 10)
const NODE_ENV = process.env.NODE_ENV || 'development'
const ERPNEXT_BASE = process.env.ERPNEXT_BASE_URL || process.env.ERPNEXT_URL || ''
const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN || 'https://gis.dfgworld.net'
const { Pool } = pg

const app = express()
app.set('trust proxy', true)

const pool = new Pool({
  host: process.env.PGHOST || process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.PG_PORT || '', 10) || 5432,
  user: process.env.PGUSER || process.env.PG_USER,
  password: process.env.PGPASSWORD || process.env.PG_PASSWORD,
  database: process.env.PGDATABASE || process.env.PG_DATABASE,
  max: 10,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
})

const leadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many submissions. Please try again later.' },
})

const apiDocsMarkdown = `# Good Insurance Service API

Good Insurance Service provides a public Delaware auto insurance quote intake endpoint and operational endpoints for authorized staff.

## Public endpoints

- \`GET /api/health\` - returns service, database, and ERPNext sync health.
- \`POST /api/leads\` - accepts quote intake submissions from the 6-step lead capture form.

## Protected endpoints

- \`GET /api/leads\`
- \`GET /api/sync\`
- \`POST /api/sync\`

Protected endpoints require the private \`x-admin-key\` header. Public OAuth/OIDC client registration is not available for this site.
`

const authMarkdown = `# Auth.md

## Agent Authentication

Good Insurance Service accepts public lead submissions through the website quote form and \`POST /api/leads\`.

Administrative APIs are private operational endpoints and are not available for third-party agent registration. They require a server-side \`x-admin-key\` shared only with authorized Good Insurance Service operators.

## Agent Registration

Public self-service registration is not available. Authorized integrations are approved out of band by Good Insurance Service.

Agents can discover public capabilities through:

- \`/.well-known/api-catalog\`
- \`/openapi.json\`
- \`/docs/api\`
- \`/.well-known/agent-skills/index.json\`

Do not submit real customer data when testing. Use clearly marked test leads.
`

const agentSkillDocs = {
  'submit-delaware-auto-insurance-lead': `# Submit Delaware Auto Insurance Lead

Use the Good Insurance Service quote form or \`POST /api/leads\` to submit a Delaware auto insurance quote request.

Required data includes applicant identity, contact details, driver details, insurance status, vehicle details, and driving history.
`,
  'check-service-health': `# Check Service Health

Use \`GET /api/health\` to confirm the quote capture service, database connection, and ERPNext configuration status.
`,
  'discover-api-catalog': `# Discover API Catalog

Use \`/.well-known/api-catalog\` to discover API descriptions, documentation, health/status endpoints, and authentication notes for Good Insurance Service.
`,
}

function absoluteUrl(pathname) {
  return new URL(pathname, PUBLIC_ORIGIN).toString()
}

function discoveryLinks() {
  return [
    `<${absoluteUrl('/.well-known/api-catalog')}>; rel="api-catalog"; type="application/linkset+json"`,
    `<${absoluteUrl('/openapi.json')}>; rel="service-desc"; type="application/vnd.oai.openapi+json"`,
    `<${absoluteUrl('/docs/api')}>; rel="service-doc"; type="text/markdown"`,
    `<${absoluteUrl('/api/health')}>; rel="status"; type="application/json"`,
    `<${absoluteUrl('/auth.md')}>; rel="authorization"; type="text/markdown"`,
    `<${absoluteUrl('/.well-known/oauth-protected-resource')}>; rel="oauth-protected-resource"; type="application/json"`,
    `<${absoluteUrl('/.well-known/agent-skills/index.json')}>; rel="service-desc"; type="application/json"`,
    `<${absoluteUrl('/.well-known/mcp/server-card.json')}>; rel="service-desc"; type="application/json"`,
  ].join(', ')
}

function setDiscoveryHeaders(res) {
  res.setHeader('Link', discoveryLinks())
}

function wantsMarkdown(req) {
  return String(req.get('accept') || '')
    .toLowerCase()
    .split(',')
    .some((value) => value.trim().startsWith('text/markdown'))
}

function markdownHome() {
  return `# Delaware Auto Insurance Quotes | Good Insurance Service

Good Insurance Service helps Delaware drivers compare practical auto insurance options for cars, trucks, SUVs, multi-vehicle households, current insurance changes, SR-22 needs, and new coverage.

## Service Area

Serving New Castle County, Kent County, Sussex County, Wilmington, Dover, Newark, Middletown, Georgetown, Rehoboth Beach, Lewes, and surrounding Delaware communities from 622 E. Basin Rd, Ste A, New Castle DE 19720.

## Contact

- Main phone: (302) 322-5515
- Text: (302) 648-7858
- WhatsApp: (302) 522-6002
- Email: gis@dfgbusiness.com

## Quote Intake

The website includes a secure 6-step auto insurance quote form covering personal details, household drivers, current insurance, vehicles, driving history, and final notes.

## Agent Discovery

- API catalog: ${absoluteUrl('/.well-known/api-catalog')}
- API docs: ${absoluteUrl('/docs/api')}
- OpenAPI description: ${absoluteUrl('/openapi.json')}
- Health endpoint: ${absoluteUrl('/api/health')}
- Authentication notes: ${absoluteUrl('/auth.md')}
`
}

function sendMarkdown(res, markdown) {
  const tokenEstimate = Math.ceil(markdown.split(/\s+/).filter(Boolean).length * 1.35)
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
  res.setHeader('x-markdown-tokens', String(tokenEstimate))
  res.setHeader('Cache-Control', 'public, max-age=3600')
  setDiscoveryHeaders(res)
  return res.send(markdown)
}

function openApiDocument() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Good Insurance Service Lead Capture API',
      version: '1.0.0',
      description: 'Public lead intake and operational health endpoints for Good Insurance Service.',
    },
    servers: [{ url: PUBLIC_ORIGIN }],
    paths: {
      '/api/health': {
        get: {
          summary: 'Check service health',
          responses: {
            200: {
              description: 'Service health status',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      db: { type: 'string' },
                      erpnext: { type: 'string' },
                      timestamp: { type: 'string', format: 'date-time' },
                      uptime_s: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/leads': {
        post: {
          summary: 'Submit an auto insurance quote request',
          description: 'Accepts the same payload submitted by the Good Insurance Service 6-step quote form.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: [
                    'first_name',
                    'last_name',
                    'email',
                    'phone_home',
                    'address',
                    'city',
                    'state',
                    'zip',
                    'drivers_license',
                    'date_of_birth',
                    'veh1_year',
                    'veh1_make',
                    'veh1_model',
                  ],
                  properties: {
                    first_name: { type: 'string' },
                    last_name: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    phone_home: { type: 'string' },
                    phone_cell_work: { type: 'string' },
                    address: { type: 'string' },
                    city: { type: 'string' },
                    state: { type: 'string' },
                    zip: { type: 'string' },
                    date_of_birth: { type: 'string', format: 'date' },
                    drivers_license: { type: 'string' },
                    drivers_in_household: { type: 'integer' },
                    coverage_type: { type: 'string', enum: ['full_coverage', 'liability'] },
                    veh1_year: { type: 'string' },
                    veh1_make: { type: 'string' },
                    veh1_model: { type: 'string' },
                    notes: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Lead accepted' },
            400: { description: 'Validation failed' },
            429: { description: 'Rate limited' },
          },
        },
        get: {
          summary: 'List recent leads',
          description: 'Private administrative endpoint requiring x-admin-key.',
          security: [{ AdminKey: [] }],
          responses: {
            200: { description: 'Lead list' },
            401: { description: 'Unauthorized' },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        AdminKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-admin-key',
        },
      },
    },
  }
}

function apiCatalogLinkset() {
  return {
    linkset: [
      {
        anchor: absoluteUrl('/api'),
        'service-desc': [{ href: absoluteUrl('/openapi.json'), type: 'application/vnd.oai.openapi+json' }],
        'service-doc': [{ href: absoluteUrl('/docs/api'), type: 'text/markdown' }],
        status: [{ href: absoluteUrl('/api/health'), type: 'application/json' }],
        authorization: [{ href: absoluteUrl('/auth.md'), type: 'text/markdown' }],
      },
    ],
  }
}

function agentSkillsIndex() {
  return {
    $schema: 'https://agentskills.io/schemas/agent-skills-index-v0.2.json',
    skills: Object.entries(agentSkillDocs).map(([name, body]) => ({
      name,
      type: 'markdown',
      description: body.split('\n\n')[1].replace(/\s+/g, ' ').trim(),
      url: absoluteUrl(`/.well-known/agent-skills/${name}.md`),
      sha256: crypto.createHash('sha256').update(body).digest('hex'),
    })),
  }
}

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))

function requireAdminKey(req, res, next) {
  const key = req.headers['x-admin-key']
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  return next()
}

function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next)
    } catch (error) {
      next(error)
    }
  }
}

function normalizeBoolean(value) {
  if (value === true || value === 1 || value === '1' || value === 'true' || value === 'yes') {
    return true
  }
  if (value === false || value === 0 || value === '0' || value === 'false' || value === 'no') {
    return false
  }
  return undefined
}

function dbBool(value) {
  const normalized = normalizeBoolean(value)
  return normalized === undefined ? null : normalized
}

function optionalString(value) {
  if (value === undefined || value === null || value === '') {
    return null
  }
  return String(value)
}

function optionalDate(value) {
  return optionalString(value)
}

function validateLeadPayload(body) {
  const errors = []
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const zipRegex = /^\d{5}$/
  const requiredStrings = [
    'first_name',
    'last_name',
    'email',
    'phone_home',
    'address',
    'city',
    'zip',
    'drivers_license',
    'date_of_birth',
    'veh1_year',
    'veh1_make',
    'veh1_model',
  ]

  for (const field of requiredStrings) {
    if (!body[field] || String(body[field]).trim() === '') {
      errors.push({ field, message: `${field} is required` })
    }
  }

  const enumChecks = {
    gender: ['male', 'female'],
    marital_status: ['single', 'married', 'divorced', 'separated', 'widow'],
    housing_status: ['rent', 'own', 'live_with_parents', 'other'],
    coverage_type: ['full_coverage', 'liability'],
  }

  for (const [field, allowed] of Object.entries(enumChecks)) {
    if (!allowed.includes(body[field])) {
      errors.push({ field, message: `${field} must be one of: ${allowed.join(', ')}` })
    }
  }

  for (const field of ['licensed_over_3yrs', 'has_current_insurance', 'has_lien_holder', 'has_violations']) {
    if (normalizeBoolean(body[field]) === undefined) {
      errors.push({ field, message: `${field} must be true or false` })
    }
  }

  if (body.email && !emailRegex.test(String(body.email))) {
    errors.push({ field: 'email', message: 'Enter a valid email address' })
  }

  if (body.zip && !zipRegex.test(String(body.zip))) {
    errors.push({ field: 'zip', message: 'Enter a valid 5-digit ZIP' })
  }

  for (const field of ['veh1_vin', 'veh2_vin', 'veh3_vin']) {
    if (body[field] && String(body[field]).length !== 17) {
      errors.push({ field, message: 'VIN must be exactly 17 characters' })
    }
  }

  const hasCurrentInsurance = normalizeBoolean(body.has_current_insurance)
  if (hasCurrentInsurance && !body.current_insurance_company) {
    errors.push({ field: 'current_insurance_company', message: 'Enter your current insurance company' })
  }

  const hasLienHolder = normalizeBoolean(body.has_lien_holder)
  if (hasLienHolder && !body.lien_holder_name) {
    errors.push({ field: 'lien_holder_name', message: 'Enter the lien holder name' })
  }

  const hasViolations = normalizeBoolean(body.has_violations)
  if (hasViolations && !body.violation_1_type) {
    errors.push({ field: 'violation_1_type', message: 'Describe the violation' })
  }

  const driversInHousehold = Number.parseInt(body.drivers_in_household || '1', 10)
  if (!Number.isInteger(driversInHousehold) || driversInHousehold < 1 || driversInHousehold > 10) {
    errors.push({ field: 'drivers_in_household', message: 'drivers_in_household must be between 1 and 10' })
  }

  return errors.length ? { valid: false, errors } : { valid: true }
}

function buildNotesBlock(data) {
  const lines = [
    '=== GIA Auto Insurance Quote Request ===',
    'Submitted: ' + new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }),
    '',
    '--- Personal ---',
    'Name:             ' + data.first_name + ' ' + data.last_name,
    'Gender:           ' + (data.gender || ''),
    'DOB:              ' + (data.date_of_birth || ''),
    'DL#:              ' + (data.drivers_license || ''),
    'Marital Status:   ' + (data.marital_status || ''),
    'Housing:          ' + (data.housing_status || ''),
    'Address:          ' + [data.address, data.city, data.state || 'DE', data.zip].filter(Boolean).join(', '),
    'Home Phone:       ' + (data.phone_home || ''),
    data.phone_cell_work ? 'Cell/Work:        ' + data.phone_cell_work : null,
    'Licensed 3+ yrs:  ' + (normalizeBoolean(data.licensed_over_3yrs) ? 'Yes' : 'No'),
    'Drivers in HH:    ' + (data.drivers_in_household || '1'),
    '',
    '--- Driver 2 ---',
    data.driver2_first_name
      ? 'Name:             ' + data.driver2_first_name + ' ' + (data.driver2_last_name || '')
      : 'Not provided',
    data.driver2_date_of_birth ? 'DOB:              ' + data.driver2_date_of_birth : null,
    data.driver2_drivers_license ? 'DL#:              ' + data.driver2_drivers_license : null,
    data.driver2_excluded !== undefined && data.driver2_excluded !== null
      ? 'Excluded:         ' + (normalizeBoolean(data.driver2_excluded) ? 'Yes' : 'No')
      : null,
    data.driver2_defensive_driving ? 'Defensive Course: ' + data.driver2_defensive_driving : null,
    '',
    '--- Insurance ---',
    'Has Current:      ' + (normalizeBoolean(data.has_current_insurance) ? 'Yes' : 'No'),
    data.current_insurance_company ? 'Company:          ' + data.current_insurance_company : null,
    'Coverage Type:    ' + (data.coverage_type || ''),
    'Has Lien Holder:  ' + (normalizeBoolean(data.has_lien_holder) ? 'Yes' : 'No'),
    data.lien_holder_name ? 'Lien Holder:      ' + data.lien_holder_name : null,
    '',
    '--- Vehicle 1 ---',
    [data.veh1_year, data.veh1_make, data.veh1_model].filter(Boolean).join(' '),
    data.veh1_vin ? 'VIN: ' + data.veh1_vin : null,
    data.veh1_body_type ? 'Body: ' + data.veh1_body_type : null,
    data.veh2_make ? '' : null,
    data.veh2_make ? '--- Vehicle 2 ---' : null,
    data.veh2_make ? [data.veh2_year, data.veh2_make, data.veh2_model].filter(Boolean).join(' ') : null,
    data.veh2_vin ? 'VIN: ' + data.veh2_vin : null,
    data.veh2_body_type ? 'Body: ' + data.veh2_body_type : null,
    data.veh3_make ? '' : null,
    data.veh3_make ? '--- Vehicle 3 ---' : null,
    data.veh3_make ? [data.veh3_year, data.veh3_make, data.veh3_model].filter(Boolean).join(' ') : null,
    data.veh3_vin ? 'VIN: ' + data.veh3_vin : null,
    data.veh3_body_type ? 'Body: ' + data.veh3_body_type : null,
    '',
    '--- Driving History ---',
    'Violations (3yr): ' + (normalizeBoolean(data.has_violations) ? 'Yes' : 'No'),
    data.violation_1_type ? '1. ' + data.violation_1_type + ' - ' + (data.violation_1_date || '') : null,
    data.violation_2_type ? '2. ' + data.violation_2_type + ' - ' + (data.violation_2_date || '') : null,
    data.violation_3_type ? '3. ' + data.violation_3_type + ' - ' + (data.violation_3_date || '') : null,
    data.referral_source ? '' : null,
    data.referral_source ? '--- Referral ---' : null,
    data.referral_source ? 'Heard from: ' + data.referral_source : null,
    data.notes ? '' : null,
    data.notes ? '--- Customer Notes ---' : null,
    data.notes || null,
  ]

  return lines.filter((line) => line !== null).join('\n')
}

function buildERPNextPayload(data) {
  return {
    lead_name: (data.first_name + ' ' + data.last_name).trim(),
    first_name: data.first_name,
    last_name: data.last_name,
    email_id: data.email,
    mobile_no: data.phone_home,
    phone: data.phone_cell_work || '',
    gender: data.gender === 'male' ? 'Male' : 'Female',
    city: data.city,
    state: data.state || 'DE',
    country: 'United States',
    source: data.referral_source ? 'Reference' : 'Web Site',
    status: 'Lead',
    lead_owner: process.env.ERPNEXT_LEAD_OWNER || undefined,
    notes: buildNotesBlock(data),
    custom_date_of_birth: data.date_of_birth || '',
    custom_drivers_license: data.drivers_license || '',
    custom_marital_status: data.marital_status || '',
    custom_housing_status: data.housing_status || '',
    custom_licensed_over_3yrs: normalizeBoolean(data.licensed_over_3yrs) ? 1 : 0,
    custom_drivers_in_household: parseInt(data.drivers_in_household || '1', 10) || 1,
    custom_coverage_type: data.coverage_type || '',
    custom_has_current_insurance: normalizeBoolean(data.has_current_insurance) ? 1 : 0,
    custom_insurance_company: data.current_insurance_company || '',
    custom_has_lien_holder: normalizeBoolean(data.has_lien_holder) ? 1 : 0,
    custom_lien_holder_name: data.lien_holder_name || '',
    custom_has_violations: normalizeBoolean(data.has_violations) ? 1 : 0,
    custom_veh1_year: data.veh1_year || '',
    custom_veh1_make: data.veh1_make || '',
    custom_veh1_model: data.veh1_model || '',
    custom_veh1_vin: data.veh1_vin || '',
    custom_veh1_body_type: data.veh1_body_type || '',
    custom_referral_source: data.referral_source || '',
  }
}

async function submitToERPNext(data, localId) {
  if (!ERPNEXT_BASE || !process.env.ERPNEXT_API_KEY || !process.env.ERPNEXT_API_SECRET) {
    console.warn('[erpnext] Not configured - skipping sync for lead', localId)
    return null
  }

  const response = await fetch(ERPNEXT_BASE + '/api/resource/Lead', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'token ' + process.env.ERPNEXT_API_KEY + ':' + process.env.ERPNEXT_API_SECRET,
      Accept: 'application/json',
    },
    body: JSON.stringify(buildERPNextPayload(data)),
    signal: AbortSignal.timeout(15000),
  })

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error('ERPNext returned non-JSON (status ' + response.status + ')')
  }

  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.message || result.exc_type || 'ERPNext error ' + response.status)
  }

  return result?.data?.name ?? null
}

function toLeadRecord(body) {
  const fullName = `${body.first_name || ''} ${body.last_name || ''}`.trim()
  return {
    full_name: fullName,
    first_name: body.first_name,
    last_name: body.last_name,
    gender: body.gender,
    date_of_birth: optionalDate(body.date_of_birth),
    drivers_license: body.drivers_license,
    email: body.email,
    phone: body.phone_home,
    phone_home: body.phone_home,
    phone_cell_work: optionalString(body.phone_cell_work),
    address: body.address,
    city: body.city,
    state: body.state || 'DE',
    zip: body.zip,
    marital_status: body.marital_status,
    housing_status: body.housing_status,
    licensed_over_3yrs: dbBool(body.licensed_over_3yrs),
    drivers_in_household: parseInt(body.drivers_in_household || '1', 10),
    driver2_first_name: optionalString(body.driver2_first_name),
    driver2_last_name: optionalString(body.driver2_last_name),
    driver2_date_of_birth: optionalDate(body.driver2_date_of_birth),
    driver2_drivers_license: optionalString(body.driver2_drivers_license),
    driver2_excluded: dbBool(body.driver2_excluded),
    driver2_defensive_driving: optionalString(body.driver2_defensive_driving),
    has_current_insurance: dbBool(body.has_current_insurance),
    current_insurance_company: optionalString(body.current_insurance_company),
    coverage_type: body.coverage_type,
    has_lien_holder: dbBool(body.has_lien_holder),
    lien_holder_name: optionalString(body.lien_holder_name),
    vehicle_make: body.veh1_make,
    vehicle_model: body.veh1_model,
    vehicle_year: body.veh1_year ? parseInt(body.veh1_year, 10) : null,
    vin_number: optionalString(body.veh1_vin),
    veh1_year: body.veh1_year,
    veh1_make: body.veh1_make,
    veh1_model: body.veh1_model,
    veh1_vin: optionalString(body.veh1_vin),
    veh1_body_type: optionalString(body.veh1_body_type),
    veh2_year: body.veh2_year ? parseInt(body.veh2_year, 10) : null,
    veh2_make: optionalString(body.veh2_make),
    veh2_model: optionalString(body.veh2_model),
    veh2_vin: optionalString(body.veh2_vin),
    veh2_body_type: optionalString(body.veh2_body_type),
    veh3_year: body.veh3_year ? parseInt(body.veh3_year, 10) : null,
    veh3_make: optionalString(body.veh3_make),
    veh3_model: optionalString(body.veh3_model),
    veh3_vin: optionalString(body.veh3_vin),
    veh3_body_type: optionalString(body.veh3_body_type),
    has_violations: dbBool(body.has_violations),
    violation_1_type: optionalString(body.violation_1_type),
    violation_1_date: optionalDate(body.violation_1_date),
    violation_2_type: optionalString(body.violation_2_type),
    violation_2_date: optionalDate(body.violation_2_date),
    violation_3_type: optionalString(body.violation_3_type),
    violation_3_date: optionalDate(body.violation_3_date),
    referral_source: optionalString(body.referral_source),
    notes: optionalString(body.notes),
    source: body.source || 'web_quote_form',
    date_of_inquiry: optionalString(body.date_of_inquiry),
    sync_status: 'pending',
    erpnext_lead_id: null,
    sync_error: null,
  }
}

const insertColumns = [
  'full_name',
  'first_name',
  'last_name',
  'gender',
  'date_of_birth',
  'drivers_license',
  'email',
  'phone',
  'phone_home',
  'phone_cell_work',
  'address',
  'city',
  'state',
  'zip',
  'marital_status',
  'housing_status',
  'licensed_over_3yrs',
  'drivers_in_household',
  'driver2_first_name',
  'driver2_last_name',
  'driver2_date_of_birth',
  'driver2_drivers_license',
  'driver2_excluded',
  'driver2_defensive_driving',
  'has_current_insurance',
  'current_insurance_company',
  'coverage_type',
  'has_lien_holder',
  'lien_holder_name',
  'vehicle_make',
  'vehicle_model',
  'vehicle_year',
  'vin_number',
  'veh1_year',
  'veh1_make',
  'veh1_model',
  'veh1_vin',
  'veh1_body_type',
  'veh2_year',
  'veh2_make',
  'veh2_model',
  'veh2_vin',
  'veh2_body_type',
  'veh3_year',
  'veh3_make',
  'veh3_model',
  'veh3_vin',
  'veh3_body_type',
  'has_violations',
  'violation_1_type',
  'violation_1_date',
  'violation_2_type',
  'violation_2_date',
  'violation_3_type',
  'violation_3_date',
  'referral_source',
  'notes',
  'source',
  'date_of_inquiry',
  'sync_status',
  'erpnext_lead_id',
  'sync_error',
]

async function insertLead(record) {
  const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ')
  const sql = `INSERT INTO leads (${insertColumns.join(', ')}) VALUES (${placeholders}) RETURNING id`
  const values = insertColumns.map((column) => record[column])
  const result = await pool.query(sql, values)
  return result.rows[0].id
}

function rowToLeadData(row) {
  return {
    ...row,
    licensed_over_3yrs: normalizeBoolean(row.licensed_over_3yrs),
    has_current_insurance: normalizeBoolean(row.has_current_insurance),
    has_lien_holder: normalizeBoolean(row.has_lien_holder),
    has_violations: normalizeBoolean(row.has_violations),
    driver2_excluded: normalizeBoolean(row.driver2_excluded),
  }
}

app.post(
  '/api/leads',
  leadLimiter,
  asyncHandler(async (req, res) => {
    if (req.body?.website && String(req.body.website).trim() !== '') {
      return res.status(200).json({ success: true })
    }

    const validation = validateLeadPayload(req.body || {})
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors })
    }

    const duplicates = await pool.query(
      "SELECT id FROM leads WHERE email = $1 AND created_at >= NOW() - INTERVAL '24 hours' LIMIT 1",
      [req.body.email],
    )
    if (duplicates.rows.length > 0) {
      return res.status(429).json({ success: false, error: 'Duplicate submission' })
    }

    const record = toLeadRecord(req.body)
    const leadId = await insertLead(record)

    let erpnextLeadId = null
    let syncError = null
    try {
      erpnextLeadId = await submitToERPNext(req.body, leadId)
      if (erpnextLeadId) {
        await pool.query("UPDATE leads SET sync_status = 'synced', erpnext_lead_id = $1, synced_at = NOW(), sync_error = NULL WHERE id = $2", [
          erpnextLeadId,
          leadId,
        ])
      } else {
        syncError = 'ERPNext not configured'
        await pool.query("UPDATE leads SET sync_status = 'pending', sync_error = $1 WHERE id = $2", [syncError, leadId])
      }
    } catch (error) {
      syncError = error.message || 'ERPNext sync failed'
      await pool.query("UPDATE leads SET sync_status = 'pending', sync_error = $1 WHERE id = $2", [
        syncError.substring(0, 500),
        leadId,
      ])
    }

    return res.status(200).json({
      success: true,
      leadId,
      message: 'Quote request submitted successfully',
      estimatedResponse: 'within 24 hours',
    })
  }),
)

app.get(
  '/api/leads',
  requireAdminKey,
  asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit || '25', 10), 1), 100)
    const offset = (page - 1) * limit
    const status = req.query.status && req.query.status !== 'all' ? String(req.query.status) : null
    const allowedStatuses = new Set(['pending', 'synced', 'failed'])
    const where = status && allowedStatuses.has(status) ? 'WHERE sync_status = $1' : ''
    const params = where ? [status] : []

    const countResult = await pool.query(`SELECT COUNT(*) AS total FROM leads ${where}`, params)
    const leadsResult = await pool.query(
      `SELECT id, full_name, email, phone_home, city, coverage_type, veh1_year, veh1_make, veh1_model, sync_status, erpnext_lead_id, created_at
       FROM leads ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    )

    return res.json({ leads: leadsResult.rows, total: Number(countResult.rows[0]?.total || 0), page, limit })
  }),
)

app.get(
  '/api/sync',
  requireAdminKey,
  asyncHandler(async (_req, res) => {
    const result = await pool.query('SELECT sync_status, COUNT(*) AS count FROM leads GROUP BY sync_status')
    const summary = { pending: 0, synced: 0, failed: 0, total: 0 }
    for (const row of result.rows) {
      const count = Number(row.count) || 0
      if (row.sync_status in summary) {
        summary[row.sync_status] = count
      }
      summary.total += count
    }
    return res.json(summary)
  }),
)

app.post(
  '/api/sync',
  requireAdminKey,
  asyncHandler(async (_req, res) => {
    const result = await pool.query(
      "SELECT * FROM leads WHERE sync_status IN ('pending', 'failed') ORDER BY created_at ASC LIMIT 50",
    )
    let succeeded = 0
    let failed = 0
    const errors = []

    for (const row of result.rows) {
      try {
        const erpnextLeadId = await submitToERPNext(rowToLeadData(row), row.id)
        if (erpnextLeadId) {
          await pool.query(
            "UPDATE leads SET sync_status = 'synced', erpnext_lead_id = $1, synced_at = NOW(), sync_error = NULL WHERE id = $2",
            [erpnextLeadId, row.id],
          )
          succeeded += 1
        } else {
          throw new Error('ERPNext not configured')
        }
      } catch (error) {
        const message = error.message || 'ERPNext sync failed'
        await pool.query("UPDATE leads SET sync_status = 'failed', sync_error = $1 WHERE id = $2", [
          message.substring(0, 500),
          row.id,
        ])
        failed += 1
        errors.push({ id: row.id, error: message })
      }
    }

    return res.json({ attempted: result.rows.length, succeeded, failed, errors })
  }),
)

app.get(
  '/api/health',
  asyncHandler(async (_req, res) => {
    let db = 'ok'
    try {
      await pool.query('SELECT 1')
    } catch (error) {
      console.warn('[health] database check failed:', error.message)
      db = 'error'
    }

    const erpnext =
      ERPNEXT_BASE && process.env.ERPNEXT_API_KEY && process.env.ERPNEXT_API_SECRET ? 'configured' : 'not_configured'

    return res.json({
      status: db === 'ok' ? 'ok' : 'degraded',
      db,
      erpnext,
      timestamp: new Date().toISOString(),
      uptime_s: Math.round(process.uptime()),
    })
  }),
)

app.get('/', (req, res, next) => {
  setDiscoveryHeaders(res)
  if (wantsMarkdown(req)) {
    return sendMarkdown(res, markdownHome())
  }

  const indexPath = path.join(DIST_PATH, 'index.html')
  if (fs.existsSync(indexPath)) {
    setDiscoveryHeaders(res)
    res.setHeader('Cache-Control', 'no-cache')
    return res.sendFile(indexPath)
  }

  return next()
})

app.get('/docs/api', (_req, res) => sendMarkdown(res, apiDocsMarkdown))

app.get('/auth.md', (_req, res) => sendMarkdown(res, authMarkdown))

app.get('/openapi.json', (_req, res) => {
  setDiscoveryHeaders(res)
  res.setHeader('Cache-Control', 'public, max-age=3600')
  return res.type('application/vnd.oai.openapi+json').json(openApiDocument())
})

app.get('/.well-known/api-catalog', (_req, res) => {
  setDiscoveryHeaders(res)
  res.setHeader('Cache-Control', 'public, max-age=3600')
  return res.type('application/linkset+json').send(JSON.stringify(apiCatalogLinkset()))
})

app.get('/.well-known/oauth-protected-resource', (_req, res) => {
  setDiscoveryHeaders(res)
  res.setHeader('Cache-Control', 'public, max-age=3600')
  return res.json({
    resource: PUBLIC_ORIGIN,
    scopes_supported: ['lead:create', 'lead:read', 'sync:read', 'sync:write'],
    bearer_methods_supported: ['header'],
    resource_documentation: absoluteUrl('/docs/api'),
    authorization_details_types_supported: ['api-key'],
    note:
      'Public OAuth/OIDC client registration is not available. Protected administrative APIs require a private x-admin-key issued out of band.',
  })
})

app.get('/.well-known/oauth-authorization-server', (_req, res) => {
  setDiscoveryHeaders(res)
  res.setHeader('Cache-Control', 'public, max-age=3600')
  return res.json({
    issuer: PUBLIC_ORIGIN,
    service_documentation: absoluteUrl('/auth.md'),
    grant_types_supported: [],
    response_types_supported: [],
    scopes_supported: ['lead:create', 'lead:read', 'sync:read', 'sync:write'],
    token_endpoint_auth_methods_supported: [],
    agent_auth: {
      registration_available: false,
      register_uri: null,
      supported_identity_types: [],
      credential_types: ['api-key'],
      instructions: absoluteUrl('/auth.md'),
      claim_urls: [],
      revocation_urls: [],
    },
  })
})

app.get('/.well-known/openid-configuration', (_req, res) => {
  setDiscoveryHeaders(res)
  res.setHeader('Cache-Control', 'public, max-age=3600')
  return res.json({
    issuer: PUBLIC_ORIGIN,
    service_documentation: absoluteUrl('/auth.md'),
    response_types_supported: [],
    subject_types_supported: [],
    id_token_signing_alg_values_supported: [],
    claims_supported: [],
    note: 'OpenID Connect login is not available for public agents on this lead capture site.',
  })
})

app.get('/.well-known/mcp/server-card.json', (_req, res) => {
  setDiscoveryHeaders(res)
  res.setHeader('Cache-Control', 'public, max-age=3600')
  return res.json({
    serverInfo: {
      name: 'Good Insurance Service Lead Capture',
      version: '1.0.0',
      description: 'Discovery metadata for the Good Insurance Service Delaware auto insurance lead capture site.',
    },
    transports: [],
    capabilities: {
      resources: [
        { name: 'API Catalog', uri: absoluteUrl('/.well-known/api-catalog') },
        { name: 'API Documentation', uri: absoluteUrl('/docs/api') },
        { name: 'OpenAPI Description', uri: absoluteUrl('/openapi.json') },
      ],
      tools: [],
    },
    note: 'No live MCP transport is exposed. Use the public API catalog and OpenAPI description for discovery.',
  })
})

app.get('/.well-known/agent-skills/index.json', (_req, res) => {
  setDiscoveryHeaders(res)
  res.setHeader('Cache-Control', 'public, max-age=3600')
  return res.json(agentSkillsIndex())
})

app.get('/.well-known/agent-skills/:skillName.md', (req, res) => {
  const body = agentSkillDocs[req.params.skillName]
  if (!body) {
    return res.status(404).type('text/plain').send('Agent skill not found')
  }
  return sendMarkdown(res, body)
})

app.use(
  express.static(DIST_PATH, {
    etag: true,
    maxAge: 0,
    setHeaders(res, servedPath) {
      const normalizedPath = servedPath.replaceAll('\\', '/')
      if (normalizedPath.includes('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        return
      }
      if (/\.(?:svg|png|jpg|jpeg|webp|ico|woff2?)$/i.test(normalizedPath)) {
        res.setHeader('Cache-Control', 'public, max-age=604800')
        return
      }
      if (/\.(?:xml|txt|webmanifest)$/i.test(normalizedPath)) {
        res.setHeader('Cache-Control', 'public, max-age=3600')
        return
      }
      res.setHeader('Cache-Control', 'no-cache')
    },
  }),
)

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' })
  }

  const indexPath = path.join(DIST_PATH, 'index.html')
  if (fs.existsSync(indexPath)) {
    res.setHeader('Cache-Control', 'no-cache')
    return res.sendFile(indexPath)
  }

  return next()
})

app.use((error, _req, res, _next) => {
  console.error('[server] route error:', error)
  const payload = {
    success: false,
    error: 'Internal server error',
  }
  if (NODE_ENV !== 'production') {
    payload.details = error.message
    payload.stack = error.stack
  }
  res.status(500).json(payload)
})

const server = app.listen(PORT, () => {
  console.log(`GIA Quote Capture server running on port ${PORT}`)
})
server.ref()
server.on('error', (error) => {
  console.error('[server] listen error:', error)
})
server.on('close', () => {
  console.warn('[server] listener closed')
})

process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandledRejection:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('[server] uncaughtException:', error)
  process.exit(1)
})
