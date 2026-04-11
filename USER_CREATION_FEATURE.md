# User Creation Feature — Scaffolded (Not Implemented)

## Overview
Added backend endpoint and frontend UI for creating new users. Both are in place and ready for implementation.

## Backend Implementation Status

### ✅ Endpoint Created
```
POST /auth/users (admin only)
Request: UserCreateRequest { username, password, role }
Response: UserCreateResponse { username, role, message }
```

### ✅ Models Defined
**Request Model** — `backend/app/models.py`
```python
class UserCreateRequest(BaseModel):
    username: str
    password: str
    role: str = "worker"  # Default role
```

**Response Model** — `backend/app/models.py`
```python
class UserCreateResponse(BaseModel):
    username: str
    role: str
    message: str
```

### ❌ Implementation TODO
**File:** `backend/app/auth.py` (lines 89-103)

```python
@router.post("/auth/users", response_model=UserCreateResponse)
def create_user(
    body: UserCreateRequest,
    user: dict = Depends(require_admin),  # Admin only
):
    """
    TODO: Implement by:
    1. Validate username not already in USERS dict
    2. Hash password: pwd_context.hash(body.password)
    3. Add to USERS dict:
       USERS[body.username] = {
           "username": body.username,
           "role": body.role,
           "hashed_password": hashed_password
       }
    4. Return UserCreateResponse
    """
    raise HTTPException(status_code=501, detail="Not implemented")
```

### Current Behavior
- ✅ Endpoint is reachable
- ✅ Requires admin authentication
- ✅ Returns 501 Not Implemented

## Frontend Implementation Status

### ✅ Page Created
**File:** `frontend/src/pages/AdminUsers.tsx`

Features:
- Form with fields: username, password, role dropdown
- Success/error messages
- Submit button that calls `POST /auth/users`
- Link to return to dashboard

### ✅ Route Configured
**File:** `frontend/src/App.tsx`

```tsx
<Route path="/admin/users" element={...} />
```

Private route (requires authentication)

### ✅ Dashboard Button Added
**File:** `frontend/src/pages/Dashboard.tsx`

Features:
- "Manage Users" button (purple)
- Only visible to admin users
- Navigates to `/admin/users`
- Fetches user role from `/auth/me` endpoint

### ❌ Currently
- ✅ Form captures user input
- ✅ Submits to `/auth/users` endpoint
- ❌ Will fail with 501 until backend is implemented
- ✅ Shows error message on failure

## Implementation Checklist

### Backend (30 seconds to implement)

```python
@router.post("/auth/users", response_model=UserCreateResponse)
def create_user(
    body: UserCreateRequest,
    user: dict = Depends(require_admin),
):
    # 1. Check if username exists
    if body.username in USERS:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # 2. Hash password
    hashed_password = pwd_context.hash(body.password)
    
    # 3. Add to USERS dict
    USERS[body.username] = {
        "username": body.username,
        "role": body.role,
        "hashed_password": hashed_password,
    }
    
    # 4. Return response
    return UserCreateResponse(
        username=body.username,
        role=body.role,
        message=f"User '{body.username}' created successfully"
    )
```

### Frontend
- No changes needed — already implemented correctly
- Will work automatically once backend is done

## Testing the Feature

### 1. Login as Admin
```bash
username: admin
password: admin123
```

### 2. Navigate to User Management
- Click "Manage Users" button on dashboard
- Or go to `/admin/users` directly

### 3. Create User (Once Implemented)
```
Username: worker3
Password: newpassword123
Role: Worker
Click "Create User"
```

### 4. Verify
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=worker3&password=newpassword123"

# Should return JWT token
```

## Architecture Notes

### Why This Design?

**Hardcoded USERS dict:**
- Hackathon scope doesn't need persistent user storage
- In-memory is fast for testing
- No database schema needed

**Admin-only endpoint:**
- Only admins can create users
- Prevents workers from creating accounts
- Uses `require_admin` dependency

**Role-based access:**
- Workers: Can destroy devices
- Admins: Can manage users and workers
- Extensible for future role types

### Production Considerations

If moving to production, would need:
1. **Persistent storage** → DynamoDB table for users
2. **User validation** → Email verification, password complexity
3. **Audit logging** → Track who created which users
4. **Rate limiting** → Prevent account creation spam
5. **Password reset** → Forgot password flow

## Files Modified

1. **backend/app/models.py** — Added UserCreateRequest, UserCreateResponse
2. **backend/app/auth.py** — Added `/auth/users` endpoint (stub)
3. **frontend/src/pages/AdminUsers.tsx** — New page (complete)
4. **frontend/src/App.tsx** — Added /admin/users route
5. **frontend/src/pages/Dashboard.tsx** — Added admin button and role detection

## Git Commit
- `459be82` — feat: add user creation endpoint and admin UI (not yet implemented)
- Pushed to `origin/dev`

## Next Steps

1. **Implement backend** (30 seconds of coding)
2. **Test end-to-end** (login as admin, create user, verify login with new user)
3. **Merge to main** when ready for deployment
4. **Deploy via terraform-deploy workflow**

## Current Status
🟡 **Ready for implementation** — All scaffolding complete, implementation straightforward
