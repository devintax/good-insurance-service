-- Initialize leads database for Good Insurance
CREATE DATABASE IF NOT EXISTS leads;
USE leads;

CREATE TABLE IF NOT EXISTS leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  vehicle_make VARCHAR(100),
  vehicle_model VARCHAR(100),
  vehicle_year INT,
  vin_number VARCHAR(50),
  coverage_type VARCHAR(100),
  has_current_insurance TINYINT(1) DEFAULT 0,
  coverage_start_date DATE,
  notes TEXT,
  source VARCHAR(100) DEFAULT 'web_quote_form',
  sync_status VARCHAR(50) DEFAULT 'pending',
  erpnext_lead_id VARCHAR(100),
  sync_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP NULL
);