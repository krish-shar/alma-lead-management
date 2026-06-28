"""FastAPI application entrypoint.

Wires CORS (scoped to the frontend origin, allowing the Authorization header for the
authenticated dashboard calls) and mounts the API routers.
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import routes_health, routes_leads
from app.core.config import settings

logging.basicConfig(level=logging.INFO)

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],  # includes Authorization for the dashboard's Bearer calls
)

app.include_router(routes_health.router)
app.include_router(routes_leads.router)


@app.get("/")
def root() -> dict:
    return {"service": settings.app_name, "docs": "/docs", "health": "/api/health"}
