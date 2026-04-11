# User Management Guide

This guide covers the complete user management system including creation, authentication, and authorization.

## Overview

The system supports three levels of user storage:

1. **Hardcoded Users** - Built-in demo accounts (loaded from `mock_users.json`)
2. **In-Memory Users** - Users created in current session (stored in `DB_USERS` dict)
3. **DynamoDB Users** - Persistent user storage (requires Terraform deployment)

All login and profile endpoints check all three sources, enabling seamless fallback.

## Default Users

### Demo Accounts (from mock_users.json)

```
Emma Brown (Admin)
  Username: emma_brown
  Password: Emma@2024!
  Role: admin

Alice Johnson (Worker)
  Username: alice_johnson
  Password: Alice@2024!
  Role: worker

Bob Smith (Worker)
  Username: bob_smith
  Password: Bob@2024!
  Role: worker

Carol Davis (Worker)
  Username: carol_davis
  Password: Carol@2024!
  Role: worker

David Wilson (Worker)
  Username: david_wilson
  Password: David@2024!
  Role: worker
```

## Creating New Users

### Via Frontend (Recommended for Testing)

1. **Login as admin** (emma_brown / Emma@2024!)
2. **Click "Manage Users"** or navigate to `/admin/users`
3. **Fill out user creation form**:
   - First Name
   - Last Name
   - Email
   - Username (unique)
   - Password
   - Role (worker or admin)
4. **Click "Create User"**
5. **Success message** will confirm user was created

### Via API (curl)

```bash
# Step 1: Get admin token
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"emma_brown","password":"Emma@2024!"}' \
  | jq -r '.access_token')

# Step 2: Create user
curl -X POST http://localhost:8000/auth/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "fname": "John",
    "lname": "Doe",
    "email": "john@cityserve.local",
    "username": "john_doe",
    "password": "SecurePassword123!",
    "role": ["worker"]
  }'
```

## Logging In

### Via Frontend

1. Go to **login page** (or navigate to `/login`)
2. Enter **username** and **password**
3. Click **Login**
4. Redirected to **dashboard** on success

### Via API

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"john_doe","password":"SecurePassword123!"}'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

## Fetching User Profile

```bash
# Get current user info
curl -X GET http://localhost:8000/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "user_id": "202d9bd8-0df2-4185-ab09-d13570f60ac6",
  "username": "john_doe",
  "fname": "John",
  "lname": "Doe",
  "email": "john@cityserve.local",
  "role": ["worker"]
}
```

## Local Development (Without DynamoDB)

### Running Locally

```bash
cd backend
export AWS_PROFILE=hackathon  # Use your configured AWS profile
python -m uvicorn app.main:app --reload
```

### What Works Without DynamoDB?

✅ **Works immediately:**
- Login with demo users
- Create new users
- Login with created users
- Fetch user profiles
- Access all protected endpoints

### Storage Behavior

- Users created in session stored in memory
- Users persist while backend is running
- On restart, only hardcoded users remain
- No AWS credentials required

## Production Deployment (With DynamoDB)

### Prerequisites

1. **Deploy infrastructure**:
   ```bash
   cd infra
   terraform apply
   ```

2. **Configure AWS credentials**:
   ```bash
   export AWS_PROFILE=your-profile
   # or
   export AWS_ACCESS_KEY_ID=xxx
   export AWS_SECRET_ACCESS_KEY=xxx
   ```

3. **Seed mock users** (optional):
   ```bash
   cd backend
   python seed_users.py
   ```

### What's Different in Production?

- Users persisted in DynamoDB (survive restarts)
- Users visible across multiple server instances
- Supports high concurrency
- Proper audit trail via DynamoDB versioning

## User Roles

### Worker Role
- ✅ View devices
- ✅ Intake devices
- ✅ Run device destruction procedures
- ✅ View compliance records
- ❌ Create users
- ❌ Manage permissions

### Admin Role
- ✅ View devices
- ✅ Intake devices
- ✅ Run device destruction procedures
- ✅ View compliance records
- ✅ **Create users**
- ✅ **Manage user permissions**

## API Endpoints

### Authentication

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/auth/login` | Login with credentials | No |
| POST | `/auth/logout` | Logout (client-side) | Yes |
| GET | `/auth/me` | Get current user profile | Yes |
| POST | `/auth/users` | Create new user | Yes (admin) |

### Authorization Patterns

```python
# Public endpoint
@app.get("/health")
def health():
    return {"status": "ok"}

# Any authenticated user
@app.get("/api/devices")
def devices(user: dict = Depends(get_current_user)):
    return {...}

# Admin only
@app.post("/auth/users")
def create_user(
    body: UserCreateRequest,
    user: dict = Depends(require_admin),
):
    return {...}
```

## Troubleshooting

### "Failed to create user"

**Cause**: Backend not running or unreachable

**Solution**:
```bash
# Ensure backend is running
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### "Invalid username or password"

**Cause**: Wrong credentials for existing user

**Solution**:
- Check spelling (case-sensitive)
- Verify user exists in demo users or was created
- Try logging in with `emma_brown` / `Emma@2024!`

### "Admin access required"

**Cause**: Non-admin user trying to create users

**Solution**:
- Login with admin account (emma_brown)
- Or ask an admin to create your account

### "Username already exists"

**Cause**: Username is taken

**Solution**:
- Use a different, unique username
- Check if you already created this user

## Security Notes

- Passwords are hashed with bcrypt before storage
- Passwords are never returned in API responses
- JWT tokens expire after 480 minutes (configurable)
- All protected endpoints require valid token
- CORS configured to allow localhost:5173 (Vite dev server)

## Files Modified

- `backend/app/auth.py` - Authentication and user creation logic
- `frontend/src/pages/AdminUsers.tsx` - User creation form
- `backend/seed_users.py` - Demo user data

## Next Steps

1. ✅ Test user creation and login locally
2. ✅ Deploy infrastructure with Terraform
3. ✅ Seed production users
4. ✅ Configure persistent DynamoDB storage
5. ✅ Set up user management UI in admin panel
