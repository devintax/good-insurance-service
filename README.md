# Good Insurance Agency - Lead Generation Page

A professional lead capture page for auto insurance quotes that integrates with ERPNext CRM.

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure ERPNext Credentials

Copy `.env.example` to `.env` and fill in your ERPNext credentials:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# ERPNext URL
ERPNEXT_URL=https://erpnext.dfgworld.net

# Get these from ERPNext: Settings → Users → Your User → API Access → Generate Keys
ERPNEXT_API_KEY=your_api_key_here
ERPNEXT_API_SECRET=your_api_secret_here

# Optional: Auto-assign leads to a broker
# ERPNEXT_LEAD_OWNER=broker@dfgbusiness.com

# Frontend API URL (use full URL including protocol)
# For local development: http://localhost:3000
VITE_API_URL=http://localhost:3000
```

### 3. Generate ERPNext API Keys

1. Log in to **https://erpnext.dfgworld.net** as an Administrator
2. Go to **Settings → Users → [your user] → API Access**
3. Click **Generate Keys**
4. Copy the **API Key** and **API Secret** to your `.env` file

### 4. Ensure ERPNext Has Lead Permissions

The API user must have **Create** permission on the **Lead** doctype:
- Go to **Setup → Roles → [role] → Role Permissions Manager**
- Find the **Lead** doctype and ensure Create is checked

### 5. Run the Application

**Development mode:**
```bash
pnpm dev
```

This starts the frontend at http://localhost:5173

**Production build:**
```bash
pnpm build
```

The built files will be in the `dist/` folder.

## Deployment

### Option A: Deploy Frontend Only (Static Hosting)

If you deploy to a static host (Netlify, Vercel, etc.), you'll need a separate server for the API:

1. Build the frontend: `pnpm build`
2. Deploy the `dist/` folder to your static host
3. Set `VITE_API_URL` to your API server URL
4. Deploy the server separately (e.g., to Render, Heroku, or your own server)

### Option B: Full Deployment

Deploy both frontend and server together:

1. Build: `pnpm build`
2. The server in `server.js` handles API requests
3. Point your domain to the server, which serves both the API and static files

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ERPNEXT_URL` | Your ERPNext instance URL |
| `ERPNEXT_API_KEY` | API key from ERPNext |
| `ERPNEXT_API_SECRET` | API secret from ERPNext |
| `ERPNEXT_LEAD_OWNER` | Optional - broker email to auto-assign leads |
| `VITE_API_URL` | Frontend uses this to submit leads |
| `PORT` | Server port (default: 3000) |

## How It Works

1. Customer fills out the insurance quote form
2. Form data is submitted to the API (`/api/leads`)
3. Server formats the data and creates a Lead in ERPNext
4. Customer sees a success message
5. Your brokers can follow up with the lead in ERPNext CRM

## Custom Fields (Optional)

To add custom vehicle fields to ERPNext Lead doctype:

1. Go to ERPNext → Customise Form → Lead
2. Add these fields:

| Label | Field Name | Type |
|-------|------------|------|
| Vehicle Make | custom_vehicle_make | Data |
| Vehicle Model | custom_vehicle_model | Data |
| Vehicle Year | custom_vehicle_year | Int |
| VIN Number | custom_vin_number | Data |
| Coverage Type | custom_coverage_type | Select |
| Has Current Insurance | custom_has_insurance | Check |
| Coverage Start Date | custom_start_date | Date |

Then update `server.js` to include these fields in the `erpPayload`.

## License

MIT