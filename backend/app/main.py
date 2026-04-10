from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings

settings = get_settings()
app = FastAPI(title="Hackathon API", version="0.1.0")

origins = ["*"] if settings.allowed_origins == "*" else [x.strip() for x in settings.allowed_origins.split(",") if x.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}


@app.get("/api/integrations")
def integrations() -> dict[str, dict[str, str]]:
    # Placeholder response so future services can be connected without breaking contract.
    return {"services": settings.service_endpoints_json}
