from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .auth import router as auth_router
from .routers.devices import router as devices_router
from .routers.compliance import router as compliance_router

settings = get_settings()
app = FastAPI(title="CityServe Device Tracker", version="0.1.0")

origins = (
    ["*"]
    if settings.allowed_origins == "*"
    else [x.strip() for x in settings.allowed_origins.split(",") if x.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router,       prefix="/auth",  tags=["auth"])
app.include_router(devices_router,    prefix="/api",   tags=["devices"])
app.include_router(compliance_router, prefix="/api",   tags=["compliance"])


# ── Frozen baseline routes — DO NOT CHANGE RESPONSE SHAPES ───────────────────

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}


@app.get("/api/integrations")
def integrations() -> dict[str, dict[str, str]]:
    return {"services": settings.service_endpoints_json}
