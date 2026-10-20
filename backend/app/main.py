import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import auth, traffic, routes, roads, weather, accidents, trips, ml, analytics, sat_api
from app.database.init_db import init_database

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[FastAPI] Running startup procedures...")
    init_database()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Production-grade AI Traffic Prediction & Dynamic Route Optimization System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(traffic.router, prefix=settings.API_V1_STR)
app.include_router(routes.router, prefix=settings.API_V1_STR)
app.include_router(roads.router, prefix=settings.API_V1_STR)
app.include_router(weather.router, prefix=settings.API_V1_STR)
app.include_router(accidents.router, prefix=settings.API_V1_STR)
app.include_router(trips.router, prefix=settings.API_V1_STR)
app.include_router(ml.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
# Include Smart Traffic Finder (sat) features
app.include_router(sat_api.router)
app.include_router(sat_api.router, prefix=settings.API_V1_STR)

from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.responses import JSONResponse

@app.get("/")
@app.get(settings.API_V1_STR)
@app.get(f"{settings.API_V1_STR}/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "status": "operational",
        "version": "1.0.0",
        "docs": f"{settings.API_V1_STR}/docs",
        "api_prefix": settings.API_V1_STR
    }

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": True,
        "database": "connected"
    }

# Ensure Swagger docs & OpenAPI schemas are accessible under /api prefix for Vercel routing
@app.get("/api/docs", include_in_schema=False)
def api_docs():
    return get_swagger_ui_html(openapi_url="/api/openapi.json", title=f"{settings.PROJECT_NAME} - API Docs")

@app.get("/api/redoc", include_in_schema=False)
def api_redoc():
    return get_redoc_html(openapi_url="/api/openapi.json", title=f"{settings.PROJECT_NAME} - ReDoc")

@app.get("/api/openapi.json", include_in_schema=False)
def api_openapi():
    return JSONResponse(app.openapi())

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
