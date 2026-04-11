# User Creation API

## Endpoints

### Create User (Admin Only)
**POST** `/auth/users`

Creates a new user in DynamoDB. Requires admin role.

#### Request
```json
{
  "username": "newuser",
  "password": "SecurePassword123!",
  "fname": "John",
  "lname": "Doe",
  "email": "john@cityserve.local",
  "role": ["worker"]
}
```

#### Response (201 Created)
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "newuser",
  "fname": "John",
  "lname": "Doe",
  "email": "john@cityserve.local",
  "role": ["worker"],
  "message": "User newuser created successfully"
}
```

#### Error Cases
- **400 Bad Request** - Username already exists
- **401 Unauthorized** - No valid token provided
- **403 Forbidden** - User does not have admin role
- **500 Internal Server Error** - Database error

### Login (All Users)
**POST** `/auth/login`

Authenticates user with username and password.

#### Request
```json
{
  "username": "newuser",
  "password": "SecurePassword123!"
}
```

#### Response
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

#### Authentication Flow
1. Checks hardcoded users first (worker1, worker2, admin)
2. Then checks DynamoDB users table
3. Returns JWT token if credentials match
4. Token valid for 480 minutes (configurable)

### Get Current User
**GET** `/auth/me`

Requires valid JWT token in Authorization header.

#### Response
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "newuser",
  "fname": "John",
  "lname": "Doe",
  "email": "john@cityserve.local",
  "role": ["worker"]
}
```

#### Headers
```
Authorization: Bearer <access_token>
```

## Implementation Details

### Storage
- Users are stored in DynamoDB `cityserve-users` table
- Hash key: `user_id` (UUID string)
- Passwords are hashed using bcrypt
- Username must be unique across both hardcoded and DynamoDB users

### Password Security
- All passwords are hashed with bcrypt before storage
- Passwords are never returned in API responses
- Hashed passwords use the same CryptContext as seed_users.py

### Fallback Behavior
- If DynamoDB is unavailable, login and user creation fail gracefully
- The /me endpoint returns minimal user info if DynamoDB lookup fails
- Hardcoded users always work as a fallback

## Example Usage

### Create user with curl
```bash
# First, log in as admin
ADMIN_TOKEN=$(curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.access_token')

# Create new user
curl -X POST http://localhost:8000/auth/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "username": "newworker",
    "password": "NewPassword123!",
    "fname": "Jane",
    "lname": "Smith",
    "email": "jane@cityserve.local",
    "role": ["worker"]
  }'
```

### Login with new user
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"newworker","password":"NewPassword123!"}'
```

### Get user profile
```bash
curl -X GET http://localhost:8000/auth/me \
  -H "Authorization: Bearer <access_token>"
```
