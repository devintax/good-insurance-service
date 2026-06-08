import http from 'http';
import https from 'https';
import mysql from 'mysql2/promise';
import pkg from 'pg';
const { Client } = pkg;

const ERPNEXT_URL = process.env.ERPNEXT_URL || 'https://erpnext.dfgworld.net';
const ERPNEXT_API_KEY = process.env.ERPNEXT_API_KEY || '';
const ERPNEXT_API_SECRET = process.env.ERPNEXT_API_SECRET || '';
const ERPNEXT_LEAD_OWNER = process.env.ERPNEXT_LEAD_OWNER || '';

// Database config - support both local (PostgreSQL) and Docker (MariaDB/MySQL)
const dbType = process.env.DB_TYPE || 'mysql';
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || (dbType === 'postgres' ? '5433' : '3306')),
  database: process.env.DB_NAME || 'leads',
  user: process.env.DB_USER || 'leadsadmin',
  password: process.env.DB_PASSWORD || 'leads123',
};

async function saveToDatabase(data) {
  try {
    if (dbType === 'postgres') {
      const client = new Client(dbConfig);
      await client.connect();
      
      const query = `
        INSERT INTO leads (
          full_name, email, phone, vehicle_make, vehicle_model, vehicle_year,
          vin_number, coverage_type, has_current_insurance, coverage_start_date,
          notes, source, sync_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, created_at
      `;
      
      const values = [
        data.fullName,
        data.email,
        data.phone,
        data.vehicleMake || null,
        data.vehicleModel || null,
        data.vehicleYear || null,
        data.vinNumber || null,
        data.coverageType || null,
        data.hasCurrentInsurance || false,
        data.coverageStartDate || null,
        data.notes || null,
        data.source || 'web_quote_form',
        'pending',
      ];
      
      const result = await client.query(query, values);
      console.log('Lead saved to PostgreSQL:', result.rows[0].id);
      await client.end();
      
      return { success: true, leadId: result.rows[0].id };
    } else {
      // MySQL/MariaDB
      const connection = await mysql.createConnection(dbConfig);
      
      const query = `
        INSERT INTO leads (
          full_name, email, phone, vehicle_make, vehicle_model, vehicle_year,
          vin_number, coverage_type, has_current_insurance, coverage_start_date,
          notes, source, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `;
      
      const values = [
        data.fullName,
        data.email,
        data.phone,
        data.vehicleMake || null,
        data.vehicleModel || null,
        data.vehicleYear || null,
        data.vinNumber || null,
        data.coverageType || null,
        data.hasCurrentInsurance ? 1 : 0,
        data.coverageStartDate || null,
        data.notes || null,
        data.source || 'web_quote_form',
      ];
      
      const [result] = await connection.execute(query, values);
      console.log('Lead saved to MySQL:', result.insertId);
      await connection.end();
      
      return { success: true, leadId: result.insertId };
    }
  } catch (error) {
    console.error('Database error:', error.message);
    return { success: false, error: error.message };
  }
}

async function sendToERPNext(data) {
  if (!ERPNEXT_API_KEY || !ERPNEXT_API_SECRET) {
    console.log('ERPNext credentials not configured. Skipping ERPNext submission.');
    return { success: false, error: 'ERPNext not configured' };
  }

  const timestamp = new Date().toISOString();
  
  const notes = `=== Auto Insurance Quote Request ===
Submitted: ${timestamp}

--- Vehicle ---
Year:  ${data.vehicleYear || 'N/A'}
Make:  ${data.vehicleMake || 'N/A'}
Model: ${data.vehicleModel || 'N/A'}
VIN:   ${data.vinNumber || 'Not provided'}

--- Coverage ---
Type:                ${data.coverageType || 'N/A'}
Has Current Policy: ${data.hasCurrentInsurance ? 'Yes' : 'No'}
Desired Start Date: ${data.coverageStartDate || 'Not specified'}

--- Customer Notes ---
${data.notes || 'No additional notes'}
`;

  const erpPayload = {
    lead_name: data.fullName,
    email_id: data.email,
    mobile_no: data.phone,
    source: 'Web Site',
    status: 'Lead',
    notes: notes,
    ...(ERPNEXT_LEAD_OWNER && { lead_owner: ERPNEXT_LEAD_OWNER }),
  };

  return new Promise((resolve, reject) => {
    const url = new URL('/api/resource/Lead', ERPNEXT_URL);
    
    const postData = JSON.stringify(erpPayload);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': ERPNEXT_API_KEY,
        'Secret-Key': ERPNEXT_API_SECRET,
      },
      timeout: 30000,
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          let response;
          try {
            response = JSON.parse(body);
          } catch (parseError) {
            // Response is not JSON
            console.error('ERPNext returned non-JSON:', body);
            if (res.statusCode === 403) {
              resolve({ success: false, error: 'ERPNext permission denied. Add Create permission on Lead doctype in ERPNext.' });
            } else {
              resolve({ success: false, error: 'ERPNext returned an error: ' + res.statusCode });
            }
            return;
          }
          
          if (res.statusCode >= 200 && res.statusCode < 300 && response.data) {
            console.log('Lead created in ERPNext:', response.data.name);
            resolve({ success: true, leadId: response.data.name });
          } else if (res.statusCode === 403) {
            console.error('ERPNext permission error: 403 Forbidden');
            resolve({ success: false, error: 'ERPNext permission denied. Add Create permission on Lead doctype in ERPNext.' });
          } else {
            console.error('ERPNext error:', response);
            let errorMsg = 'Failed to create lead in ERPNext';
            if (response && typeof response === 'object') {
              errorMsg = response.exception || response.message || errorMsg;
            }
            resolve({ success: false, error: errorMsg });
          }
        } catch (e) {
          console.error('Error processing ERPNext response:', e);
          resolve({ success: false, error: 'Invalid response from ERPNext' });
        }
      });
    });

    req.on('error', (e) => {
      console.error('ERPNext connection error:', e.message);
      resolve({ success: false, error: 'Failed to connect to ERPNext' });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'ERPNext request timed out' });
    });

    req.write(postData);
    req.end();
  });
}

async function handleLeadSubmission(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const data = JSON.parse(body);

      const { fullName, email, phone } = data;

      if (!fullName || !email || !phone) {
        res.writeHead(400);
        res.end(JSON.stringify({
          success: false,
          error: 'Missing required fields: fullName, email, and phone are required'
        }));
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: 'Invalid email format' }));
        return;
      }

      console.log('Processing lead for:', fullName, email);

      const dbResult = await saveToDatabase(data);
      
      if (!dbResult.success) {
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: 'Failed to save lead to database' }));
        return;
      }

      const erpResult = await sendToERPNext(data);

      res.writeHead(201);
      res.end(JSON.stringify({
        success: true,
        leadId: dbResult.leadId,
        erpNextSuccess: erpResult.success,
        erpNextError: erpResult.error || null,
        message: 'Quote request submitted successfully',
        estimatedResponse: 'within 24 hours',
        createdAt: new Date().toISOString()
      }));

    } catch (error) {
      console.error('Error processing lead:', error);

      res.writeHead(500);
      res.end(JSON.stringify({
        success: false,
        error: 'Failed to process quote request. Please try again later.'
      }));
    }
  });
}

async function handleGetLeads(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405);
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  try {
    if (dbType === 'postgres') {
      const client = new Client(dbConfig);
      await client.connect();
      const result = await client.query('SELECT * FROM leads ORDER BY created_at DESC');
      await client.end();
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, leads: result.rows }));
    } else {
      const connection = await mysql.createConnection(dbConfig);
      const [rows] = await connection.execute('SELECT * FROM leads ORDER BY created_at DESC');
      await connection.end();
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, leads: rows }));
    }
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ success: false, error: 'Failed to fetch leads' }));
  }
}

async function handleGetSyncStatus(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405);
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  try {
    let result, pendingResult;
    
    if (dbType === 'postgres') {
      const client = new Client(dbConfig);
      await client.connect();
      result = await client.query(`
        SELECT sync_status, COUNT(*) as count FROM leads GROUP BY sync_status
      `);
      pendingResult = await client.query(
        "SELECT * FROM leads WHERE sync_status = 'pending' ORDER BY created_at DESC"
      );
      await client.end();
    } else {
      const connection = await mysql.createConnection(dbConfig);
      const [summaryRows] = await connection.execute(
        'SELECT sync_status, COUNT(*) as count FROM leads GROUP BY sync_status'
      );
      const [pendingRows] = await connection.execute(
        "SELECT * FROM leads WHERE sync_status = 'pending' ORDER BY created_at DESC"
      );
      result = { rows: summaryRows };
      pendingResult = { rows: pendingRows };
      await connection.end();
    }
    
    res.writeHead(200);
    res.end(JSON.stringify({ 
      success: true, 
      summary: result.rows,
      pendingLeads: pendingResult.rows
    }));
  } catch (error) {
    console.error('Error fetching sync status:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ success: false, error: 'Failed to fetch sync status: ' + error.message }));
  }
}

async function handleSyncToERPNext(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  try {
    let pendingResult;
    
    if (dbType === 'postgres') {
      const client = new Client(dbConfig);
      await client.connect();
      const result = await client.query(
        "SELECT * FROM leads WHERE sync_status = 'pending' ORDER BY created_at ASC"
      );
      pendingResult = result.rows;
    } else {
      const connection = await mysql.createConnection(dbConfig);
      const [rows] = await connection.execute(
        "SELECT * FROM leads WHERE sync_status = 'pending' ORDER BY created_at ASC"
      );
      pendingResult = rows;
      await connection.end();
    }
    
    const pendingLeads = pendingResult;
    let successCount = 0;
    let failCount = 0;
    
    for (const lead of pendingLeads) {
      const erpResult = await sendToERPNext({
        fullName: lead.full_name,
        email: lead.email,
        phone: lead.phone,
        vehicleMake: lead.vehicle_make,
        vehicleModel: lead.vehicle_model,
        vehicleYear: lead.vehicle_year,
        vinNumber: lead.vin_number,
        coverageType: lead.coverage_type,
        hasCurrentInsurance: lead.has_current_insurance,
        coverageStartDate: lead.coverage_start_date,
        notes: lead.notes,
        created_at: lead.created_at
      });
      
      if (erpResult.success) {
        if (dbType === 'postgres') {
          const client = new Client(dbConfig);
          await client.connect();
          await client.query(
            "UPDATE leads SET sync_status = 'synced', erpnext_lead_id = $1, synced_at = NOW() WHERE id = $2",
            [erpResult.leadId, lead.id]
          );
          await client.end();
        } else {
          const connection = await mysql.createConnection(dbConfig);
          await connection.execute(
            "UPDATE leads SET sync_status = 'synced', erpnext_lead_id = ?, synced_at = NOW() WHERE id = ?",
            [erpResult.leadId, lead.id]
          );
          await connection.end();
        }
        successCount++;
      } else {
        const errorMsg = erpResult.error ? erpResult.error.substring(0, 500) : 'Unknown error';
        if (erpResult.httpStatus === 403) {
          if (dbType === 'postgres') {
            const client = new Client(dbConfig);
            await client.connect();
            await client.query(
              "UPDATE leads SET sync_status = 'permission_denied', sync_error = $1 WHERE id = $2",
              ['ERPNext permission denied - add Create permission on Lead doctype', lead.id]
            );
            await client.end();
          } else {
            const connection = await mysql.createConnection(dbConfig);
            await connection.execute(
              "UPDATE leads SET sync_status = 'permission_denied', sync_error = ? WHERE id = ?",
              ['ERPNext permission denied - add Create permission on Lead doctype', lead.id]
            );
            await connection.end();
          }
        } else {
          if (dbType === 'postgres') {
            const client = new Client(dbConfig);
            await client.connect();
            await client.query(
              "UPDATE leads SET sync_status = 'failed', sync_error = $1 WHERE id = $2",
              [errorMsg, lead.id]
            );
            await client.end();
          } else {
            const connection = await mysql.createConnection(dbConfig);
            await connection.execute(
              "UPDATE leads SET sync_status = 'failed', sync_error = ? WHERE id = ?",
              [errorMsg, lead.id]
            );
            await connection.end();
          }
        }
        failCount++;
      }
    }
    
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      synced: successCount,
      failed: failCount,
      message: `Synced ${successCount} lead(s), ${failCount} failed`
    }));
    
  } catch (error) {
    console.error('Error during sync:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ success: false, error: 'Sync failed: ' + error.message }));
  }
}

async function handleHealthCheck(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405);
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  let dbConnected = false;
  try {
    if (dbType === 'postgres') {
      const client = new Client(dbConfig);
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      dbConnected = true;
    } else {
      const connection = await mysql.createConnection(dbConfig);
      await connection.execute('SELECT 1');
      await connection.end();
      dbConnected = true;
    }
  } catch (e) {
    dbConnected = false;
  }
  
  res.writeHead(200);
  res.end(JSON.stringify({
    status: dbConnected ? 'healthy' : 'unhealthy',
    database: dbConnected ? 'connected' : 'disconnected',
    erpnext: (ERPNEXT_API_KEY && ERPNEXT_API_SECRET) ? 'configured' : 'not configured',
    timestamp: new Date().toISOString()
  }));
}

const server = http.createServer((req, res) => {
  // Add CORS headers to all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = req.url;

  if (url === '/api/leads' && req.method === 'POST') {
    handleLeadSubmission(req, res);
  } else if (url === '/api/leads' && req.method === 'GET') {
    handleGetLeads(req, res);
  } else if (url === '/api/health' && req.method === 'GET') {
    handleHealthCheck(req, res);
  } else if (url === '/api/test' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', message: 'API is working' }));
  } else if (url === '/api/sync' && req.method === 'GET') {
    handleGetSyncStatus(req, res);
  } else if (url === '/api/sync' && req.method === 'POST') {
    handleSyncToERPNext(req, res);
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found', endpoints: ['POST /api/leads', 'GET /api/leads', 'GET /api/health', 'GET /api/test'] }));
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Database: ${dbType === 'postgres' ? 'PostgreSQL' : 'MySQL/MariaDB'} on ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  console.log(`ERPNext URL: ${ERPNEXT_URL}`);
  console.log(`ERPNext configured: ${!!(ERPNEXT_API_KEY && ERPNEXT_API_SECRET)}`);
  console.log(``);
  console.log(`API Endpoints:`);
  console.log(`  POST /api/leads    - Submit new lead`);
  console.log(`  GET  /api/leads    - Get all leads (admin)`);
  console.log(`  GET  /api/sync     - Check sync status`);
  console.log(`  POST /api/sync    - Sync pending leads to ERPNext`);
  console.log(`  GET  /api/health   - Health check`);
});