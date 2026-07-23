from app.routers.auth import router as auth_router
from app.routers.admin import router as admin_router
from app.routers.visitor import router as visitor_router
from app.routers.conversations import router as conversations_router

__all__ = [
    "auth_router",
    "admin_router",
    "visitor_router",
    "conversations_router",
]
