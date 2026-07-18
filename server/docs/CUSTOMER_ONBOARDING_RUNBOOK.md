# New Customer Onboarding Runbook

## Before the Call
- [ ] Prepare demo account (`flask seed-demo`)
- [ ] Test login at your demo URL
- [ ] Have pricing ready

## When Customer Says Yes

### Step 1: Gather information
Collect from customer:
- Company name
- Admin name + email
- Phone number
- Number of vehicles
- Number of drivers
- Which plan (Starter/Professional/Enterprise)

### Step 2: Create company (5 minutes)
1. Login as Super Admin at [your-url]/login
2. Go to Admin → Companies → New Company
3. Fill in company details
4. Set vehicle/driver/user limits based on plan
5. Click Create

### Step 3: Assign plan
1. Go to company detail page
2. Click "Assign Plan"
3. Select appropriate plan
4. Confirm

### Step 4: Enable features
1. On company detail → Features tab
2. Enable modules they paid for
3. Disable modules not in their plan

### Step 5: Create admin user
1. On company detail → Users tab → Add User
2. Enter admin name + email
3. System generates temporary password
4. COPY THE PASSWORD — you will need to send it

### Step 6: Send welcome email (manual for now)
Send this email to the customer:

---
Subject: Your TransitOps Account is Ready

Hi [Name],

Your TransitOps fleet management account has been created.

Login URL: [your-app-url]/login
Email: [their-email]
Temporary Password: [generated-password]

Please change your password after first login.

If you need help getting started, reply to this email.

Best,
[Your name]
TransitOps
---

### Step 7: Follow up after 24 hours
- Check if they logged in (check `last_login_at` in DB)
- If not logged in: send a reminder
- If logged in: check onboarding checklist progress via:
  `GET /api/admin/companies/:id` → check user activity

## Troubleshooting

### Customer can't log in
- Check user `is_active = true` in admin panel
- Check company `is_active = true`
- Reset password via: `POST /api/auth/forgot-password`

### Customer sees no data  
- Normal for new accounts
- Onboarding checklist guides them
- Direct them to add vehicles first

### Customer locked out
- Go to Admin → Companies → find their company
- Find user → reset `failed_login_count` to 0
- Or: `flask shell` → `user.failed_login_count = 0; db.session.commit()`

## Checklist for First Week
- [ ] Customer logged in within 24 hours
- [ ] At least 1 vehicle added
- [ ] At least 1 driver added
- [ ] At least 1 trip created
- [ ] No 500 errors in logs for their company
