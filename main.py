import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from app.database import engine, Base, SessionLocal
from app.seed_data import seed_database
from app.generate_assets import generate_evidence_images
from app.routers import (
    auth_router, citizen_router, collector_router,
    admin_router, detection_router
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure evidence assets exist
    try:
        generate_evidence_images()
    except Exception as e:
        print("Asset generation note:", e)

    # Initialize DB schemas
    Base.metadata.create_all(bind=engine)
    # Seed initial mock data
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title="Eco Loop API",
    description="Smart Waste Management, CCTV Littering Penalty Tracking & Citizen Rewards Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for open API access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files
static_dir = os.path.join(os.path.dirname(__file__), "app", "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Templates
templates_dir = os.path.join(os.path.dirname(__file__), "app", "templates")
os.makedirs(templates_dir, exist_ok=True)
templates = Jinja2Templates(directory=templates_dir)

# Include Routers
app.include_router(auth_router.router)
app.include_router(citizen_router.router)
app.include_router(collector_router.router)
app.include_router(admin_router.router)
app.include_router(admin_router.credit_router)
app.include_router(detection_router.router)

@app.get("/", response_class=HTMLResponse)
async def serve_home(request: Request):
    """Serve the primary Eco Loop single-page application."""
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"google_client_id": os.getenv("GOOGLE_CLIENT_ID", "")}
    )

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": "Eco Loop",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting Eco Loop Server on http://localhost:{port} ...")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

