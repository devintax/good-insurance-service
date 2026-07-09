// Database setup script for Good Insurance Agency Leads (InsForge/PostgreSQL)

require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const pg = require('pg');

const { Pool } = pg;

async function setupDatabase() {
  const pool = new Pool({
    host: process.env.PGHOST || process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PGPORT || process.env.PG_PORT || '', 10) || 5432,
    user: process.env.PGUSER || process.env.PG_USER,
    password: process.env.PGPASSWORD || process.env.PG_PASSWORD,
    database: process.env.PGDATABASE || process.env.PG_DATABASE,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    const migrationPath = path.join(__dirname, 'migrations', '001_expand_leads_schema.pg.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying PostgreSQL leads migration...');
    await pool.query(sql);

    const { rows: columns } = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'leads'
      ORDER BY ordinal_position
    `);

    console.log('\nLeads table structure:');
    console.log('------------------------');
    columns.forEach((col) => {
      console.log(`${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? '[nullable]' : '[required]'}`);
    });

    console.log('\nDatabase setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();
