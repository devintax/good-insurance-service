import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
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
const { Pool } = pg

const app = express()

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
