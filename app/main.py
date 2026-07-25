import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.core.config import settings
from app.database.connection import async_session_maker
from app.services.employee import EmployeeService
from app.schemas.employee import EmployeeCreate
from app.models.employee import EmployeeRole
from app.routers import auth_router, admin_router, visitor_router, conversations_router
from app.websocket.endpoints import router as ws_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern lifespan event handler for startup (seeding) and shutdown tasks"""
    # Auto-create database tables
    from app.database.connection import engine
    from sqlmodel import SQLModel
    try:
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
        print("Database tables initialized successfully.")
    except Exception as e:
        print(f"Warning: Could not auto-create database tables: {e}")

    # Seed default admin user if database is empty
    async with async_session_maker() as db:
        admin_email = settings.FIRST_SUPERUSER_EMAIL
        admin = await EmployeeService.get_by_email(db, admin_email)
        if not admin:
            try:
                schema = EmployeeCreate(
                    name="System Admin",
                    email=admin_email,
                    password=settings.FIRST_SUPERUSER_PASSWORD,
                    role=EmployeeRole.ADMIN
                )
                await EmployeeService.create(db, schema)
                print(f"==================================================")
                print(f"DATABASE SEEDED: Created admin '{admin_email}'")
                print(f"==================================================")
            except Exception as e:
                print(f"Failed to seed database: {e}")
    yield

app = FastAPI(
    title="Customer Support Chat Backend",
    description="Production-grade API and WebSockets server for customer support chats.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for developer workflows
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://superstock.pro", "https://trade-web-app.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register REST Routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(visitor_router)
app.include_router(conversations_router)

# Register WebSocket Router
app.include_router(ws_router)

@app.get("/health")
async def health_check():
    """Simple API health check endpoint"""
    return {"status": "healthy", "service": "support-chat-backend"}

# Mount React static frontend if it exists
frontend_dist_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")

if os.path.exists(frontend_dist_dir):
    # Mount build static assets directly
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist_dir, "assets")), name="assets")

    # Serve React dashboard index.html for root admin panel routes
    @app.get("/admin/{path:path}")
    async def serve_admin_spa_routes(path: str):
        asset_file = os.path.join(frontend_dist_dir, path)
        if path and os.path.exists(asset_file) and os.path.isfile(asset_file):
            return FileResponse(asset_file)
        return FileResponse(os.path.join(frontend_dist_dir, "index.html"))

    @app.get("/admin")
    async def serve_admin_root():
        return FileResponse(os.path.join(frontend_dist_dir, "index.html"))
else:
    @app.get("/admin")
    async def no_frontend_warning():
        return {
            "message": "Admin frontend build not found. Please navigate to the /frontend folder and run 'npm run build' first."
        }
