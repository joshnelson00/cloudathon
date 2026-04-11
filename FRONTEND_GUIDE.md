# Frontend Architecture Guide

## Overview

The CityServe Device Destruction frontend is a React 18 application built with TypeScript, Vite, and Tailwind CSS. It provides a complete user interface for managing NIST SP 800-88 compliant device destruction workflows.

## Technology Stack

- **Framework:** React 18 + TypeScript
- **Routing:** React Router v6
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios (in `src/api/client.ts`)
- **Build Tool:** Vite
- **Development Server:** Hot Module Replacement (HMR)

## Project Structure

```
frontend/src/
├── App.tsx                    # Main router and private route wrapper
├── main.tsx                   # Entry point
├── index.css                  # Global styles
├── api/
│   └── client.ts             # Axios instance with API base URL config
├── components/
│   └── Layout.tsx            # Navigation, header, logout
└── pages/
    ├── Login.tsx             # /login - Authentication
    ├── Dashboard.tsx         # / - System overview and stats
    ├── DeviceIntake.tsx      # /intake - Register new device
    ├── DeviceDetail.tsx      # /device/:id - Guided procedure steps
    └── ComplianceRecord.tsx  # /compliance/:id - Destruction certificate
```

## Page Routes

| Route | Component | Auth Required | Purpose |
|-------|-----------|---|---|
| `/login` | Login | No | Username/password authentication, JWT token storage |
| `/` | Dashboard | Yes | View system statistics, recent devices, and device list |
| `/intake` | DeviceIntake | Yes | Register new device for destruction |
| `/device/:id` | DeviceDetail | Yes | Step-by-step guided NIST procedure |
| `/compliance/:id` | ComplianceRecord | Yes | View and download destruction certificate |

## Authentication Flow

1. User logs in on `/login` page
2. Frontend sends POST to `/auth/login` with username/password
3. Backend returns JWT token
4. Token stored in `localStorage` under key `token`
5. All API requests include token in `Authorization: Bearer <token>` header
6. Private routes (`<PrivateRoute>`) check for token before rendering
7. On 401 response, user is redirected to `/login`
8. Logout button clears token and navigates to `/login`

## API Integration

All API calls go through `src/api/client.ts`:

```typescript
import { api } from "../api/client"

// GET request
const response = await api.get("/api/devices")

// POST request
const response = await api.post("/api/devices", {
  chassis_serial: "...",
  device_type: "...",
  chassis_make_model: "..."
})

// PATCH request
await api.patch(`/api/devices/${id}/step`, {
  step_id: "...",
  confirmed: true,
  input_data: { ... }
})
```

The client automatically includes the JWT token in all requests via an interceptor.

## Component Patterns

### Layout Component

Wraps all authenticated pages with navigation:

```tsx
<Layout>
  <h1>Page Content</h1>
</Layout>
```

Props:
- `children: ReactNode` - Page content
- `showNav?: boolean` - Show/hide navigation (default: true)

### Form Handling

Forms use React `useState` for state management:

```tsx
const [formData, setFormData] = useState({ field: "" })
const [loading, setLoading] = useState(false)
const [error, setError] = useState("")

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  try {
    await api.post("/api/endpoint", formData)
  } catch (err: any) {
    setError(err.response?.data?.detail || "Error message")
  }
}
```

### Error Handling

- API errors are caught and displayed in error messages
- Loading states prevent duplicate submissions
- 401 errors automatically redirect to login (handled by PrivateRoute)

## Styling with Tailwind

All pages use Tailwind CSS utilities. Common patterns:

```tsx
// Card
<div className="bg-white rounded-lg border border-gray-200 p-6">

// Button
<button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">

// Grid
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">

// Status Badge
<span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-800">
```

## Data Flow

### Dashboard
1. Load dashboard stats and device list on mount
2. Display counts and live feed of recent devices
3. User can click "View" to navigate to device detail page

### Device Intake
1. User fills form with serial, type, make/model
2. Submit POST to `/api/devices`
3. Backend creates DynamoDB record, returns device_id
4. Navigate to `/device/:id`

### Device Detail (Guided Procedure)
1. Load device and its steps from `/api/devices/:id`
2. Display current and completed steps
3. User confirms each step by clicking "Confirm Step"
4. PATCH `/api/devices/:id/step` with step data
5. When all steps complete, "Generate Certificate" button enables
6. Click button to POST `/api/devices/:id/complete`
7. Navigate to `/compliance/:id`

### Compliance Record
1. Load compliance data from `/api/compliance/:id`
2. Display certificate details
3. User can download PDF from `compliance_doc_url`
4. Links back to intake or dashboard

## Development Workflow

### Run Development Server
```bash
cd frontend
npm run dev
# Server runs at http://localhost:5173
# Vite proxies /api and /health to http://localhost:8000 (see vite.config.js)
```

### Build for Production
```bash
cd frontend
npm run build
# Output: frontend/dist/
# This is deployed to S3 and served via CloudFront
```

### Type Checking
```bash
npm run type-check  # TypeScript validation
```

## Notes for Backend Integration

1. **Device Steps:** The DeviceDetail page expects `steps` array in device response. Each step needs:
   - `step_id`: Unique identifier (e.g., "drive_details", "boot_detect")
   - `description`: Human-readable step name
   - `completed`: Boolean flag
   - `timestamp`: ISO timestamp when completed (optional)

2. **API Response Format:** All endpoints should return consistent JSON:
   ```json
   { "device_id": "...", "status": "...", ... }
   ```
   Not wrapped in a `data` key unless documented.

3. **Error Handling:** Backend should return errors as:
   ```json
   { "detail": "Human-readable error message" }
   ```

4. **Form Validation:** Input validation happens on frontend (basic HTML5) and backend (recommended). Frontend displays error messages from backend's `detail` field.

## Future Enhancements

- Add dark mode toggle
- Implement batch operations
- Add PDF preview before download
- Add barcode/QR code scanning for device intake
- Implement real-time device status updates via WebSocket
- Add admin role with additional features
- Add worker performance metrics to dashboard

## Troubleshooting

| Issue | Solution |
|-------|----------|
| API returns 401 | Token expired or invalid. Redirected to login automatically. |
| CORS errors | Ensure vite.config.js proxy is configured correctly. |
| Styling not applied | Check Tailwind build is running. Check class names are correct. |
| Device not loading | Check API endpoint returns device with `steps` array. |
| Form submission hangs | Check backend endpoint and network in browser DevTools. |

---

**Stack Version:** `lean-mvp-ec2-s3-cf-1.0`  
**Last Updated:** 2026-04-10
