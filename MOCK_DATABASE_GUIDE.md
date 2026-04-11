# Mock Database Guide

## Overview

The application now uses a **mock file-based database** instead of DynamoDB for local development and demos. This eliminates the need for AWS credentials or deployed infrastructure while maintaining the same API interface.

## Architecture

### Database Abstraction Layer

The `mock_db.py` module provides a DynamoDB-compatible interface using JSON files:

```
app/
├── db.py              # Database access layer (supports both real & mock)
├── mock_db.py         # Mock database implementation using JSON files
├── config.py          # Configuration (use_mock_db flag)
└── (routes, models, etc.)

data/
├── cityserve-devices.json      # Device records
├── cityserve-procedures.json   # Sanitization procedures (read-only seed)
└── cityserve-users.json        # User storage (empty, for compatibility)
```

### How It Works

1. **Configuration** (`config.py`):
   - `use_mock_db: bool = True` - Enable/disable mock database
   - Default is `True` for demo environments

2. **Database Access** (`db.py`):
   - `get_devices_table()` - Returns mock or real DynamoDB table
   - `get_procedures_table()` - Returns mock or real DynamoDB table
   - Smart routing based on `use_mock_db` setting

3. **Mock Implementation** (`mock_db.py`):
   - `MockTable` class mimics DynamoDB Table interface
   - Supports: `get_item()`, `put_item()`, `update_item()`, `scan()`, `query()`, `delete_item()`
   - Stores data in JSON files with automatic serialization

## Data Schema

### Devices Table (cityserve-devices.json)

```json
{
  "device-id-1": {
    "device_id": "550e8400-e29b-41d4-a716-446655440000",
    "chassis_serial": "ABC123",
    "device_type": "laptop_ssd",
    "make_model": "Dell XPS 13",
    "intake_timestamp": "2026-04-11T02:30:00Z",
    "status": "intake",
    "procedure_id": "sata_ssd_secure_erase_v1",
    "steps_completed": [],
    "comp_doc": null,
    "wipe_result": null
  }
}
```

### Procedures Table (cityserve-procedures.json)

```json
{
  "hdd_purge_v1": {
    "procedure_id": "hdd_purge_v1",
    "device_type": "laptop_hdd",
    "nist_method": "Purge",
    "nist_technique": "Overwrite",
    "label": "HDD — Single-Pass Overwrite (NIST Purge)",
    "steps": [
      {
        "id": "hdd_1",
        "instruction": "Power on the device...",
        "requires_confirmation": true,
        "input_fields": null
      },
      ...
    ]
  },
  "sata_ssd_secure_erase_v1": { ... },
  "nvme_ssd_format_v1": { ... },
  "tablet_factory_reset_v1": { ... },
  "external_hdd_purge_v1": { ... },
  "external_ssd_purge_v1": { ... },
  "no_storage_clear_v1": { ... }
}
```

## Setup

### 1. Enable Mock Database (Default)

The mock database is **enabled by default**. No configuration needed.

To verify, check `backend/.env`:
```bash
cat backend/.env
# Should show:
# USE_MOCK_DB=true
# (or omit it - defaults to true)
```

### 2. Create Seed Data

Run the seed script once:

```bash
cd backend
python seed_mock_db.py
```

This creates:
- `data/cityserve-devices.json` - Empty devices list
- `data/cityserve-procedures.json` - 7 NIST procedures
- `data/cityserve-users.json` - Empty for compatibility

### 3. Run the Backend

```bash
cd backend
source .venv/bin/activate
python -m uvicorn app.main:app --reload
```

The backend will:
- Load mock database on startup
- Create JSON files if they don't exist
- Use file-based storage for all operations
- Require no AWS credentials

## API Operations

All endpoints work identically with mock or real database:

### Create Device
```bash
curl -X POST http://localhost:8000/api/devices \
  -H "Content-Type: application/json" \
  -d '{
    "chassis_serial": "ABC123",
    "device_type": "laptop_ssd",
    "make_model": "Dell XPS 13"
  }'
```

### List Devices
```bash
curl http://localhost:8000/api/devices
# Returns: {"devices": [...]}
```

### Get Device
```bash
curl http://localhost:8000/api/devices/{device_id}
# Returns device details
```

### Get Procedure
```bash
curl http://localhost:8000/api/procedures/hdd_purge_v1
# Returns procedure with all steps and input fields
```

### Update Device Step
```bash
curl -X PATCH http://localhost:8000/api/devices/{device_id}/step \
  -H "Content-Type: application/json" \
  -d '{
    "step_id": "hdd_1",
    "confirmed": true,
    "notes": "Device powered on and HDD detected"
  }'
```

### Complete Device
```bash
curl -X POST http://localhost:8000/api/devices/{device_id}/complete
# Generates PDF certificate and marks device as documented
```

## File Format Examples

### Creating a Device

When you POST a new device:
```json
POST /api/devices
{
  "chassis_serial": "XYZ789",
  "device_type": "laptop_hdd",
  "make_model": "HP Pavilion"
}
```

The mock database adds it to `data/cityserve-devices.json`:
```json
{
  "550e8400-e29b-41d4-a716-446655440001": {
    "device_id": "550e8400-e29b-41d4-a716-446655440001",
    "chassis_serial": "XYZ789",
    "device_type": "laptop_hdd",
    "make_model": "HP Pavilion",
    "intake_timestamp": "2026-04-11T02:45:00Z",
    "status": "intake",
    "procedure_id": "hdd_purge_v1",
    "steps_completed": [],
    "comp_doc": null,
    "wipe_result": null
  }
}
```

### Completing Steps

When you PATCH a step:
```json
PATCH /api/devices/{device_id}/step
{
  "step_id": "hdd_1",
  "confirmed": true,
  "notes": ""
}
```

The device updates to `status: "in_progress"` and adds to `steps_completed`:
```json
{
  "steps_completed": [
    {
      "step_id": "hdd_1",
      "confirmed": true,
      "notes": "",
      "timestamp": "2026-04-11T02:46:00Z"
    }
  ]
}
```

## Switching Between Mock and Real Database

### Use Mock (Default - Demo/Development)
```bash
# In backend/.env or environment:
USE_MOCK_DB=true

# Or let it default
```

### Use Real DynamoDB (Production)
```bash
# In backend/.env:
USE_MOCK_DB=false
AWS_REGION=us-west-1
```

Then:
1. Ensure Terraform tables are deployed
2. Set AWS credentials (AWS_PROFILE, AWS_ACCESS_KEY_ID, etc.)
3. Start backend

The code automatically switches based on the config setting.

## Limitations

The mock database is **for demo purposes only**:

- ✅ Supports all CRUD operations
- ✅ Persists data to JSON files
- ✅ No AWS credentials needed
- ✅ Works completely offline
- ❌ Not thread-safe (single-threaded demo only)
- ❌ No indexes or query optimization
- ❌ Files overwritten on server restart if data changed
- ❌ No backup or versioning
- ❌ Not suitable for production use

## Data Persistence

### Location
All data is stored in the `data/` directory:
```
backend/
└── data/
    ├── cityserve-devices.json
    ├── cityserve-procedures.json
    └── cityserve-users.json
```

### Persistence
- Data is persisted immediately when created/updated
- Files are human-readable JSON
- Can be edited directly if needed
- Files are NOT in .gitignore (can be version controlled for test data)

### Resetting Data

To start fresh:
```bash
# Delete the data files
rm -rf backend/data/

# Re-run seed script
cd backend
python seed_mock_db.py
```

## Migration to Production

When ready to deploy to production:

1. **Set configuration**:
   ```bash
   # Update .env for production
   USE_MOCK_DB=false
   AWS_REGION=us-west-1
   ```

2. **Deploy infrastructure**:
   ```bash
   cd infra
   terraform apply
   # This creates DynamoDB tables
   ```

3. **Seed production data**:
   ```bash
   cd backend
   python seed_procedures.py  # Seeds real DynamoDB
   ```

4. **Start backend** with AWS credentials:
   ```bash
   export AWS_PROFILE=your-profile
   python -m uvicorn app.main:app --reload
   ```

The application will automatically use the real DynamoDB tables instead of JSON files.

## Debugging

### Check which database is active

```python
from app.config import get_settings
from app.db import _get_db_backend

settings = get_settings()
print(f"Use mock DB: {settings.use_mock_db}")

db = _get_db_backend()
print(f"Database backend: {type(db).__name__}")
```

### View stored data

Open the JSON files directly:
```bash
cat backend/data/cityserve-devices.json | python -m json.tool
cat backend/data/cityserve-procedures.json | python -m json.tool
```

### Inspect mock database internals

```python
from app.db import get_devices_table

table = get_devices_table()
print(f"Table file: {table.file_path}")
print(f"Data directory: {table.data_dir}")
```

## Files Modified

### New Files
- `backend/app/mock_db.py` - Mock database implementation
- `backend/seed_mock_db.py` - Demo data seed script
- `backend/data/cityserve-devices.json` - Demo devices (empty)
- `backend/data/cityserve-procedures.json` - All NIST procedures
- `backend/data/cityserve-users.json` - Empty for compatibility

### Modified Files
- `backend/app/db.py` - Added mock database support
- `backend/app/config.py` - Added `use_mock_db` configuration
- `infra/main.tf` - Removed DynamoDB resources

## Testing

The mock database has been tested with:

✅ Creating devices
✅ Listing devices
✅ Getting device details
✅ Getting procedures
✅ Creating devices with all device types
✅ Dashboard stats
✅ File persistence

## Support

For issues with the mock database:

1. Verify `USE_MOCK_DB=true` in config
2. Check that `data/` directory exists
3. Review JSON file format (should be valid JSON)
4. Check file permissions (`data/` should be writable)
5. Review backend logs for error messages

## Next Steps

1. Run the seed script: `python seed_mock_db.py`
2. Start the backend: `python -m uvicorn app.main:app --reload`
3. Test the frontend at `http://localhost:5173`
4. Create devices via the UI and check `data/cityserve-devices.json` updates
