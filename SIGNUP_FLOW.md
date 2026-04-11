# Self-Service User Signup Flow

## Overview

The application now supports self-service user registration. Users can create accounts directly from the login page without requiring an admin to set them up first.

## User Flow

### 1. Start at Login Page
- Navigate to `/login` (default route)
- See login form and "Create New Account" button

### 2. Click "Create New Account"
- Navigates to `/signup`
- Displays account creation form

### 3. Fill Out Registration Form
Required fields:
- **First Name** - User's first name
- **Last Name** - User's last name  
- **Email** - Valid email address
- **Username** - Unique username for login
- **Password** - Minimum 8 characters
- **Confirm Password** - Must match password field

### 4. Submit Form
- Frontend validates:
  - Passwords match
  - Password is at least 8 characters
- Backend validates:
  - Username is unique (not taken)
  - All fields are provided

### 5. Account Created
- User assigned "worker" role by default
- Account stored (in memory for local dev, DynamoDB for production)
- Success message displayed
- Automatically redirected to login page

### 6. Login with New Account
- Return to login page
- Enter username and password
- Receive JWT token
- Access dashboard and all features

## API Endpoints

### POST /auth/signup
Self-service user registration (no authentication required)

**Request:**
```json
{
  "fname": "John",
  "lname": "Doe",
  "email": "john@cityserve.local",
  "username": "john_doe",
  "password": "SecurePassword123!",
  "role": ["worker"]  // Ignored - always creates worker accounts
}
```

**Response (201 Created):**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "john_doe",
  "fname": "John",
  "lname": "Doe",
  "email": "john@cityserve.local",
  "role": ["worker"],
  "message": "Account created successfully! You can now login. (stored locally)"
}
```

**Error Cases:**
- `400 Bad Request` - Username already exists
- `400 Bad Request` - Missing required fields
- `500 Internal Server Error` - Database error

## Security Features

### Password Security
- Passwords must be at least 8 characters
- Passwords are hashed with bcrypt before storage
- Passwords never returned in API responses
- Password confirmation prevents typos

### Account Restrictions
- Self-signup creates "worker" role accounts only
- Cannot create admin accounts through signup
- Admin accounts must be created by existing admins
- All accounts validated for uniqueness

### Data Validation
- Email format validation
- Username uniqueness check
- Password strength requirements
- Form field validation (frontend)
- Backend validation (API level)

## User Roles

### Worker (Self-Signup Default)
✅ Access dashboard
✅ View devices
✅ Intake devices
✅ Run destruction procedures
✅ View compliance records
❌ Create users
❌ Manage permissions

### Admin (Admin-Only)
✅ All worker features
✅ Create new users
✅ Manage user permissions
❌ Self-signup (must be created by admin)

## Storage Backends

### Local Development (No DynamoDB)
- Users stored in in-memory `DB_USERS` dictionary
- Persist while backend is running
- Reset on server restart
- No AWS credentials required

### Production (With DynamoDB)
- Users stored in DynamoDB `cityserve-users` table
- Persist across server restarts
- Support for multiple server instances
- Automatic backup and versioning

## Testing the Signup Flow

### Frontend Testing
```bash
# 1. Navigate to localhost:5173/login
# 2. Click "Create New Account"
# 3. Fill out form
# 4. Submit
# 5. Redirected to login
# 6. Login with new credentials
# 7. Access dashboard
```

### API Testing
```bash
# Create account
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fname": "John",
    "lname": "Doe",
    "email": "john@cityserve.local",
    "username": "john_doe",
    "password": "SecurePassword123!",
    "role": ["worker"]
  }'

# Login with new account
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"john_doe","password":"SecurePassword123!"}'
```

## Admin User Creation

For admins creating users (with elevated permissions):

1. Login as admin
2. Navigate to `/admin/users`
3. Fill out user creation form
4. Set role (worker or admin)
5. User created

Admin-created users:
- Can be assigned any role
- Require admin authentication
- Visible in user management interface
- Can be modified/deleted by admins

## Troubleshooting

### "Username already exists"
- Choose a different username
- Check if account was already created

### "Passwords do not match"
- Ensure both password fields match exactly
- Check for spaces or typos

### "Password must be at least 8 characters"
- Increase password length
- Ensure no whitespace issues

### "Account created but can't login"
- Double-check username and password
- Ensure backend is running
- Check browser console for errors

### "Signup page not found"
- Ensure frontend is running
- Check URL is exactly `/signup`
- Verify routing is configured

## Files Modified

### Frontend
- `src/pages/SignUp.tsx` - New signup page component
- `src/pages/Login.tsx` - Updated to link to signup
- `src/App.tsx` - Added /signup route

### Backend
- `app/auth.py` - Added POST /auth/signup endpoint

### Documentation
- `SIGNUP_FLOW.md` - This file

## Recent Commits

```
77da034 feat: add self-service user signup flow
```

## Next Steps

- ✅ Test signup flow locally
- ✅ Deploy to production with DynamoDB
- ❓ Add email verification (optional)
- ❓ Add password reset flow (optional)
- ❓ Add account activation (optional)
- ❓ Add user profile management (optional)
