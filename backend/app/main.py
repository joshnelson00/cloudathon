import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers.devices import router as devices_router
from .routers.compliance import router as compliance_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("cityserve")

settings = get_settings()
app = FastAPI(title="CityServe Device Tracker", version="0.1.0")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000)
    logger.info(
        "%s %s → %d (%dms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    response.headers["X-Response-Time"] = f"{duration_ms}ms"
    return response

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

app.include_router(devices_router,    prefix="/api",   tags=["devices"])
app.include_router(compliance_router, prefix="/api",   tags=["compliance"])


# ── Frozen baseline routes — DO NOT CHANGE RESPONSE SHAPES ───────────────────

@app.get("/health")
def health() -> dict:
    from .db import get_devices_table
    db_status = "ok"
    try:
        get_devices_table().scan()
    except Exception:
        db_status = "unavailable"

    overall = "ok" if db_status == "ok" else "degraded"
    return {
        "status": overall,
        "environment": settings.environment,
        "db": db_status,
    }


@app.get("/api/integrations")
def integrations() -> dict[str, dict[str, str]]:
    return {"services": settings.service_endpoints_json}
