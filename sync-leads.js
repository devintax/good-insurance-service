import pkg from 'pg';
import https from 'https';

const { Client } = pkg;

const dbConfig = {
  host: 'localhost',
  port: 5433,
  database: 'leads',
  user: 'leadsadmin',
  password: 'leads123',
};

const ERPNEXT_URL = process.env.ERPNEXT_URL || 'https://erpnext.dfgworld.net';
const ERPNEXT_API_KEY = process.env.ERPNEXT_API_KEY || '';
const ERPNEXT_API_SECRET = process.env.ERPNEXT_API_SECRET || '';

console.log('=======================================');
console.log('ERPNext Lead Sync Tool');
console.log('=======================================');
console.log(`URL: ${ERPNEXT_URL}`);
console.log(`API Key: ${ERPNEXT_API_KEY ? 'Configured ✓' : 'NOT CONFIGURED ✗'}`);
console.log('---------------------------------------\n');

async function sendToERPNext(lead) {
  if (!ERPNEXT_API_KEY || !ERPNEXT_API_SECRET) {
    return { success: false, error: 'ERPNext credentials not configured' };
  }

  const timestamp = new Date(lead.created_at).toISOString();
  
  const notes = `=== Auto Insurance Quote Request ===
Submitted: ${timestamp}

--- Vehicle ---
Year:  ${lead.vehicle_year || 'N/A'}
Make:  ${lead.vehicle_make || 'N/A'}
Model: ${lead.vehicle_model || 'N/A'}
VIN:   ${lead.vin_number || 'Not provided'}

--- Coverage ---
Type:                ${lead.coverage_type || 'N/A'}
Has Current Policy: ${lead.has_current_insurance ? 'Yes' : 'No'}
Desired Start Date: ${lead.coverage_start_date || 'Not specified'}

--- Customer Notes ---
${lead.notes || 'No additional notes'}
`;

  const erpPayload = {
    lead_name: lead.full_name,
    email_id: lead.email,
    mobile_no: lead.phone,
    source: 'Web Site',
    status: 'Lead',
    notes: notes,
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
          const response = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300 && response.data) {
            console.log(`  ✓ Lead created in ERPNext: ${response.data.name}`);
            resolve({ success: true, leadId: response.data.name });
          } else if (res.statusCode === 403) {
            console.log(`  ✗ PERMISSION DENIED (403): Your ERPNext user lacks Create permission on Lead doctype.`);
            console.log(`    → Fix: Go to ERPNext → Settings → Roles → Permission Manager → Lead → Add Create permission`);
            resolve({ success: false, error: 'ERPNext permission denied - add Create permission on Lead doctype', httpStatus: 403 });
          } else if (res.statusCode === 500 && body.includes('TypeError')) {
            console.log(`  ✗ SERVER ERROR (500): ERPNext returned an error`);
            console.log(`    → This usually means the Lead doctype fields don't exist or there's a server issue`);
            resolve({ success: false, error: 'ERPNext server error - check ERPNext logs', httpStatus: 500 });
          } else {
            console.log(`  ✗ ERPNext error (${res.statusCode}):`, response.message || response.exception || body.substring(0, 100));
            resolve({ success: false, error: response.message || `HTTP ${res.statusCode}`, httpStatus: res.statusCode });
          }
        } catch (e) {
          console.log(`  ✗ Failed to parse ERPNext response:`, e.message);
          resolve({ success: false, error: 'Invalid response from ERPNext' });
        }
      });
    });

    req.on('error', (e) => {
      console.log(`  ✗ Connection error:`, e.message);
      resolve({ success: false, error: e.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Request timed out' });
    });

    req.write(postData);
    req.end();
  });
}

async function syncPendingLeads() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    
    // Get all pending leads
    const result = await client.query(
      "SELECT * FROM leads WHERE sync_status = 'pending' ORDER BY created_at ASC"
    );
    
    const pendingLeads = result.rows;
    
    console.log(`Found ${pendingLeads.length} pending lead(s) to sync\n`);
    
    if (pendingLeads.length === 0) {
      console.log('No pending leads to sync.');
      return;
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (const lead of pendingLeads) {
      console.log(`Syncing lead #${lead.id}: ${lead.full_name} (${lead.email})`);
      
      const result = await sendToERPNext(lead);
      
      if (result.success) {
        // Update lead as synced
        await client.query(
          "UPDATE leads SET sync_status = 'synced', erpnext_lead_id = $1, synced_at = NOW() WHERE id = $2",
          [result.leadId, lead.id]
        );
        successCount++;
      } else {
        // Check if it's a permission error (403)
        if (result.httpStatus === 403) {
          await client.query(
            "UPDATE leads SET sync_status = 'permission_denied', sync_error = $1 WHERE id = $2",
            ['ERPNext permission denied - please add Create permission on Lead doctype', lead.id]
          );
        } else {
          await client.query(
            "UPDATE leads SET sync_status = 'failed', sync_error = $1 WHERE id = $2",
            [result.error.substring(0, 500), lead.id]
          );
        }
        failCount++;
      }
      
      console.log('');
    }
    
    console.log('---------------------------------------');
    console.log(`Sync complete: ${successCount} synced, ${failCount} failed`);
    console.log('---------------------------------------');
    
    // Show summary
    console.log('\nLead Status Summary:');
    const statusResult = await client.query(
      "SELECT sync_status, COUNT(*) as count FROM leads GROUP BY sync_status"
    );
    statusResult.rows.forEach(row => {
      console.log(`  ${row.sync_status}: ${row.count}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

// Check if --status flag is passed
if (process.argv.includes('--status')) {
  (async () => {
    const client = new Client(dbConfig);
    try {
      await client.connect();
      const result = await client.query(
        "SELECT id, full_name, email, vehicle_make, sync_status, erpnext_lead_id, created_at, synced_at FROM leads ORDER BY created_at DESC LIMIT 20"
      );
      
      console.log('\nLead Status Report:');
      console.log('===================\n');
      
      result.rows.forEach(lead => {
        const status = lead.sync_status === 'synced' ? '✓ SYNCED' : 
                       lead.sync_status === 'pending' ? '⏳ PENDING' : 
                       lead.sync_status === 'failed' ? '✗ FAILED' : 
                       lead.sync_status === 'permission_denied' ? '🚫 PERMISSION DENIED' : lead.sync_status;
        
        console.log(`Lead #${lead.id}: ${lead.full_name}`);
        console.log(`  Email: ${lead.email}`);
        console.log(`  Vehicle: ${lead.vehicle_make || 'N/A'}`);
        console.log(`  Status: ${status}`);
        if (lead.erpnext_lead_id) console.log(`  ERPNext ID: ${lead.erpnext_lead_id}`);
        console.log(`  Created: ${lead.created_at}`);
        if (lead.synced_at) console.log(`  Synced: ${lead.synced_at}`);
        console.log('');
      });
    } finally {
      await client.end();
    }
  })();
} else {
  syncPendingLeads();
}