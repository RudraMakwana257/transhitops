# Pre-Demo Checklist

Run this 30 minutes before every demo call:

## 1. Refresh demo data
  `flask seed-demo`
  → Confirm: "Demo Fleet Co created successfully"

## 2. Verify the stack is running
  `curl https://your-domain/api/health`
  → `{ "status": "ok", "database": "ok" }`

## 3. Test demo login
  Go to your landing page
  Click "Try Demo Account"  
  → Should auto-fill and log in
  → Dashboard should show vehicles, trips, KPI cards

## 4. Verify key flows work
  - [ ] Vehicles page loads with 8 vehicles
  - [ ] Trips page shows mix of statuses
  - [ ] Dashboard KPI cards show real numbers
  - [ ] AI chat responds (test: "How many vehicles do we have?")
  - [ ] Analytics charts render with data

## 5. Have these tabs open during demo
  - [ ] Landing page
  - [ ] Dashboard (logged in as demo)
  - [ ] Vehicles list
  - [ ] Active trip detail
  - [ ] Analytics page
  - [ ] Super Admin panel (to show company creation)

## 6. Common demo script
  1. Show landing page — "This is what your customers see"
  2. Click Try Demo — login automatically
  3. Walk through dashboard KPIs
  4. Show a vehicle → its health score
  5. Show an active trip → dispatch flow
  6. Show analytics → fuel trends
  7. Show AI chat — ask a fleet question
  8. Switch to Super Admin — show company creation
  9. "This is how we would set up your account today"
