# Architecture Simplified - No Authentication

## Overview

The application has been simplified to remove all authentication requirements. Users now see the dashboard immediately upon opening the app, with no login page or user management.

## What Changed

### Backend Changes

**Removed:**
- `auth.py` router - no longer imported in `main.py`
- User management endpoints (`/auth/login`, `/auth/signup`, `/auth/me`, `/auth/users`)
- Authentication middleware from all API routes
- `get_current_user` dependency injection from all endpoints

**Updated:**
- All device routes (`/api/devices`, `/api/devices/{id}`, etc.) - now accept requests without authentication
- Dashboard endpoint (`/api/dashboard`) - no longer requires authentication
- Compliance endpoint (`/api/compliance/{id}`) - no longer requires authentication

**Impact on Data Model:**
- Removed `user_id` field from device records
- Updated `DeviceDetail` model to exclude `user_id`
- Devices no longer track which user created them

### Frontend Changes

**Removed:**
- Login page (`frontend/src/pages/Login.tsx`)
- Sign up page (`frontend/src/pages/SignUp.tsx`)
- `/login` and `/signup` routes
- JWT token storage and retrieval from localStorage
- JWT token inclusion in API request headers (Axios interceptor)
- Logout button from navigation
- User role check logic in Dashboard component
- "Manage Users" button from Dashboard header
- `worker_id` field references from DeviceDetail component

**Updated:**
- App routes - now only include: `/`, `/intake`, `/device/:id`, `/compliance/:id`
- API client (`client.ts`) - removed JWT token interceptor
- Layout component - removed logout functionality
- Dashboard component - removed user role/admin checks

**New Default Behavior:**
- App opens directly to Dashboard (no redirect to login)
- All navigation is available without authentication
- Device intake, detail view, and compliance records all accessible immediately

### Infrastructure Changes

**Terraform (infra/main.tf):**
- **Removed:**
  - `aws_dynamodb_table.users` resource - users table deleted
  - `local.users_table_name` - no longer needed
  - `USERS_TABLE_NAME` environment variable from Lambda
  - User table ARN from EC2 IAM policy
  - User table ARN from Lambda IAM policy

- **No Impact:**
  - Device table remains unchanged
  - Procedures table remains unchanged
  - S3 compliance bucket remains unchanged
  - Lambda function for PDF generation remains unchanged (no users to track)

## Database Impact

### What's Deleted
- DynamoDB `cityserve-users` table (or equivalent based on naming)
- All stored user records
- All user hashes, credentials, and profiles

### What Remains
- `devices` table (unchanged)
- `procedures` table (unchanged)
- Device records no longer include `user_id` field

## API Endpoints

### Still Available (Now Unauthenticated)
```
POST   /api/devices                  # Create device intake
GET    /api/devices                  # List all devices
GET    /api/devices/{device_id}      # Get device details
PATCH  /api/devices/{device_id}/step # Mark step complete
POST   /api/devices/{device_id}/complete # Complete device
GET    /api/procedures/{procedure_id} # Get procedure steps
GET    /api/dashboard                # Get dashboard stats
GET    /api/compliance/{device_id}   # Get compliance document
```

### Removed (Authentication Endpoints)
```
POST   /auth/login                   # REMOVED
POST   /auth/signup                  # REMOVED
POST   /auth/logout                  # REMOVED
GET    /auth/me                      # REMOVED
POST   /auth/users                   # REMOVED (admin user creation)
```

### Unchanged (Frozen API Contract)
```
GET    /health                       # Health check
GET    /api/integrations             # Service integrations
```

## Key Differences in Usage

### Before (With Auth)
1. User navigates to app
2. Redirected to login page
3. Enter username/password
4. Receive JWT token stored in localStorage
5. Access dashboard
6. Token included in all API requests
7. Logout button clears token and redirects to login

### After (No Auth)
1. User navigates to app
2. Dashboard loads immediately
3. Access all features without login
4. All API calls are unauthenticated (no Authorization header)
5. No logout functionality needed

## Security Implications

⚠️ **IMPORTANT:** This architecture has no authentication or authorization.

- **Anyone** with access to the app can view and interact with all devices
- **Anyone** can create device intake records
- **Anyone** can mark steps as complete
- **Anyone** can generate compliance documents
- No audit trail of who did what
- No admin vs worker role distinction

This is appropriate only for:
- Demo environments
- Development/testing
- Single-user deployments
- Environments behind additional security layers (VPN, IP whitelisting, etc.)

## Deployment Notes

### To Deploy
1. No code changes needed for unauthenticated operation
2. Run `terraform apply` to remove users table (if updating existing deployment)
3. Deploy frontend to CloudFront/S3
4. Deploy backend to EC2
5. Users will see dashboard immediately on page load

### Environment Variables
- `AWS_PROFILE` - Still needed for AWS credentials (DynamoDB, S3, Lambda)
- `ALLOWED_ORIGINS` - Still controls CORS
- `SERVICE_ENDPOINTS_JSON` - Still loads integration endpoints
- Removed: User/auth-related env variables

## Files Changed

### Backend
- `app/main.py` - Removed auth router import
- `app/models.py` - Removed user_id from DeviceDetail
- `app/routers/devices.py` - Removed auth dependencies
- `app/routers/compliance.py` - Removed auth dependencies

### Frontend
- `src/App.tsx` - Removed login/signup routes
- `src/api/client.ts` - Removed JWT interceptor
- `src/components/Layout.tsx` - Removed logout button
- `src/pages/Dashboard.tsx` - Removed user role checks

### Infrastructure
- `infra/main.tf` - Removed users table and references

## Testing

### Health Check
```bash
curl http://localhost:8000/health
# Should return: {"status":"ok","environment":"local"}
```

### Device List (No Auth Required)
```bash
curl http://localhost:8000/api/devices
# Should return: {"devices": []}
```

### Create Device (No Auth Required)
```bash
curl -X POST http://localhost:8000/api/devices \
  -H "Content-Type: application/json" \
  -d '{
    "chassis_serial": "ABC123",
    "device_type": "laptop_ssd",
    "make_model": "Dell XPS 13"
  }'
```

## Future Additions

If authentication needs to be re-added:
1. Restore `app/auth.py` from git history
2. Add back JWT interceptor in `client.ts`
3. Create login/signup pages
4. Add auth routes to `main.py`
5. Add `user_id` field back to device model
6. Restore users DynamoDB table in Terraform
7. Add user checks back to frontend routing

All the removed code is preserved in git history for reference.

## Related Documentation

- `PRODUCTION_DEPLOYMENT_FIX.md` - Previous authentication fix (now obsolete)
- `SIGNUP_FLOW.md` - User signup flow (now removed)
- `USER_MANAGEMENT_GUIDE.md` - User management (now removed)
