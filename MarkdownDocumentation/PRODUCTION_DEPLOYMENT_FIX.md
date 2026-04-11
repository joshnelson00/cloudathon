# Production Deployment Authentication Fix

## Problem

When the frontend is deployed via CloudFront (production), API requests fail with:
```
Failed to fetch user role: AxiosError: Request failed with status code 401
```

This happens because:
1. Frontend is on CloudFront CDN (e.g., `https://d18zmfqsb3gmjk.cloudfront.net/`)
2. Frontend defaults to `http://localhost:8000` for backend
3. CloudFront can't reach `localhost:8000` (that's only on the EC2 machine)
4. Even if it could, the JWT token wasn't being sent in requests

## Solution

The frontend now automatically detects the backend URL and includes JWT tokens:

### Smart API URL Detection

The frontend uses this priority:
1. **Environment Variable**: `VITE_API_URL` if explicitly set
2. **Local Development**: `http://localhost:8000` if running on localhost
3. **Production**: `https://{same-hostname}:8000` if deployed

### Automatic JWT Token Inclusion

All API requests now automatically include the JWT token from localStorage in the `Authorization` header.

## For Local Development

Everything works as before:
```bash
cd backend
export AWS_PROFILE=hackathon
python -m uvicorn app.main:app --reload

cd frontend
npm run dev
```

Frontend will detect `localhost` and use `http://localhost:8000`.

## For Production Deployment

### Option 1: Frontend and Backend on Same EC2 Instance (Recommended)

1. **Deploy frontend to CloudFront** (pointing to S3 bucket)
2. **Backend runs on EC2** on port 8000
3. **Frontend automatically detects**: `https://{ec2-hostname}:8000`
4. **EC2 security group** must allow port 8000 (should already be open for SSH)

This works because:
- Frontend at `https://d18zmfqsb3gmjk.cloudfront.net/` (CloudFront CDN)
- Backend at `https://ec2-hostname:8000` (same EC2 instance)
- Frontend auto-detects and connects to port 8000 on the same server

### Option 2: Explicit API URL via Environment Variable

If your backend is on a different server:

```bash
# During frontend build/deployment
export VITE_API_URL=https://api.your-domain.com:8000
npm run build

# Then deploy the built files to S3/CloudFront
```

### Option 3: Override at Runtime

Update the frontend environment to include:
```env
VITE_API_URL=https://your-backend-url:8000
```

## How to Test the Fix

### Local Testing
```bash
# Terminal 1: Start backend
cd backend
export AWS_PROFILE=hackathon
python -m uvicorn app.main:app --reload

# Terminal 2: Start frontend
cd frontend
npm run dev

# Browser: Visit http://localhost:5173
# Should work normally
```

### Production Testing

1. **Login with test credentials**:
   - Username: `emma_brown`
   - Password: `Emma@2024!`

2. **Create account** via signup page

3. **Try device intake**:
   - Navigate to "Device Intake" or `/intake`
   - Should NOT see "Not authenticated" error
   - Should see device intake form

4. **Check network requests**:
   - Open DevTools → Network tab
   - All requests should include `Authorization: Bearer <token>` header
   - All requests should hit the correct backend URL (not localhost:8000)

## Files Changed

### frontend/src/api/client.ts
- Smart URL detection based on environment
- Auto JWT token inclusion in all requests
- Support for both local and production scenarios

## How It Works

### URL Detection Flow
```
1. Check VITE_API_URL env var
   ↓ (if set, use it)
   
2. Check if running on localhost
   ↓ (if yes, use http://localhost:8000)
   
3. Get current hostname and use :8000
   ↓ (e.g., https://ec2-hostname:8000)
```

### JWT Token Flow
```
1. User logs in
   ↓ (token stored in localStorage)

2. All axios requests
   ↓ (interceptor adds Authorization header)

3. Backend receives request
   ↓ (with Authorization: Bearer <token>)

4. Request authenticated ✓
```

## Common Issues and Solutions

### Issue: "Not authenticated" (401) errors

**Cause**: Frontend not sending JWT token or wrong backend URL

**Solution**:
1. Open DevTools → Network tab
2. Check API request URLs:
   - Should NOT be `http://localhost:8000` from production
   - Should be `https://{hostname}:8000`
3. Check request headers:
   - Should have `Authorization: Bearer <token>`
   - If missing, token may not be in localStorage

### Issue: CORS errors

**Cause**: Backend CORS settings don't allow CloudFront origin

**Solution**:
```bash
# Update backend/.env
ALLOWED_ORIGINS=https://d18zmfqsb3gmjk.cloudfront.net
# or use wildcard (less secure)
ALLOWED_ORIGINS=*
```

### Issue: Can't reach backend on EC2

**Cause**: Security group doesn't allow port 8000

**Solution**:
```bash
# In terraform infra/main.tf
# Ensure security group allows port 8000
# (should already be configured)

# Or manually:
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 8000 \
  --cidr 0.0.0.0/0
```

### Issue: Still getting "Not authenticated"

**Debug steps**:
1. Check if you're logged in (token in localStorage)
2. Check browser console for API URL being used
3. Check DevTools Network tab for actual request URL
4. Verify backend is running and accessible
5. Try logging out and logging back in

## Recent Changes

Commit: `47eea3a fix: smart API URL detection and auto JWT inclusion`

- Automatic backend URL detection
- JWT token auto-inclusion in all requests
- Support for both local and production
- Removed hardcoded localhost references

## Next Steps

1. **Test locally** with both backend and frontend running
2. **Deploy frontend** to CloudFront
3. **Verify backend** is accessible on EC2 at port 8000
4. **Test production** by logging in from the CloudFront URL
5. **Monitor** for any 401 errors in production

## Production Checklist

- [ ] Frontend deployed to CloudFront
- [ ] Backend running on EC2 port 8000
- [ ] Security group allows port 8000
- [ ] CORS configured for CloudFront origin (or * if acceptable)
- [ ] Test login works
- [ ] Test device intake works
- [ ] No 401 "Not authenticated" errors
- [ ] All API requests include Authorization header
- [ ] Monitor browser console for errors
