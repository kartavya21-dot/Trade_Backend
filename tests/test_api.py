import pytest
import uuid
from fastapi.testclient import TestClient
from sqlmodel import create_engine, Session
from app.main import app
from app.database.connection import get_db
from app.models import Employee, EmployeeRole, Visitor, Conversation, Message, metadata
from app.core.security import get_password_hash

from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession

# Synchronous engine for setup/teardown in standard sync fixtures
SYNC_DATABASE_URL = "sqlite:///test_temp.db"
sync_engine = create_engine(SYNC_DATABASE_URL, connect_args={"check_same_thread": False})

# Asynchronous engine for API runtime endpoints
ASYNC_DATABASE_URL = "sqlite+aiosqlite:///test_temp.db"
async_engine = create_async_engine(ASYNC_DATABASE_URL, connect_args={"check_same_thread": False})

# Dependency override helper (injects AsyncSession)
async def override_get_db():
    async with AsyncSession(async_engine) as session:
        yield session

# Override db dependency in main app
app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(name="session", scope="function", autouse=True)
def session_fixture():
    """Create a fresh database structure for each test run synchronously"""
    metadata.create_all(sync_engine)
    with Session(sync_engine) as session:
        yield session
    metadata.drop_all(sync_engine)

@pytest.fixture(name="client")
def client_fixture():
    """Get fastapi test client"""
    return TestClient(app)

@pytest.fixture(name="admin_token")
def admin_token_fixture(session, client):
    """Seed an admin employee and return a valid JWT token"""
    admin = Employee(
        name="Test Admin",
        email="admin@test.com",
        password_hash=get_password_hash("adminpass123"),
        role=EmployeeRole.ADMIN,
        active=True
    )
    session.add(admin)
    session.commit()
    session.refresh(admin)

    # Login to get token
    response = client.post(
        "/login",
        json={"email": "admin@test.com", "password": "adminpass123"}
    )
    return response.json()["access_token"]

@pytest.fixture(name="employee_token")
def employee_token_fixture(session, client):
    """Seed a regular employee and return a valid JWT token"""
    emp = Employee(
        name="Test Employee",
        email="employee@test.com",
        password_hash=get_password_hash("emppass123"),
        role=EmployeeRole.EMPLOYEE,
        active=True
    )
    session.add(emp)
    session.commit()
    session.refresh(emp)

    # Login to get token
    response = client.post(
        "/login",
        json={"email": "employee@test.com", "password": "emppass123"}
    )
    return response.json()["access_token"]


# ==========================================
# AUTHENTICATION TESTS
# ==========================================

def test_login_success(session, client):
    """Test successful credentials login"""
    # Seed employee
    emp = Employee(
        name="John Doe",
        email="john@doe.com",
        password_hash=get_password_hash("secret123"),
        role=EmployeeRole.EMPLOYEE,
        active=True
    )
    session.add(emp)
    session.commit()

    response = client.post(
        "/login",
        json={"email": "john@doe.com", "password": "secret123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "EMPLOYEE"
    assert data["employee_name"] == "John Doe"

def test_login_invalid_password(session, client):
    """Test login with wrong password"""
    emp = Employee(
        name="John Doe",
        email="john@doe.com",
        password_hash=get_password_hash("secret123"),
        role=EmployeeRole.EMPLOYEE,
        active=True
    )
    session.add(emp)
    session.commit()

    response = client.post(
        "/login",
        json={"email": "john@doe.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


# ==========================================
# VISITOR FLOW TESTS
# ==========================================

def test_start_chat_new_visitor(client):
    """Test starting a chat session as a brand new visitor (empty uuid)"""
    response = client.post(
        "/chat/start",
        json={"name": "Alice", "email": "alice@gmail.com"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "conversation_id" in data
    assert "visitor_uuid" in data
    assert data["display_name"] == "Alice"

def test_start_chat_reuse_visitor_uuid(client):
    """Test visitor re-engaging with their persistent localStorage UUID"""
    # First request to get UUID
    res1 = client.post("/chat/start", json={"name": "Alice"})
    uuid_str = res1.json()["visitor_uuid"]

    # Second request with the same UUID
    res2 = client.post("/chat/start", json={"uuid": uuid_str, "phone": "123456"})
    assert res2.status_code == 200
    data = res2.json()
    assert data["visitor_uuid"] == uuid_str
    assert data["display_name"] == "Alice" # Reuse name


# ==========================================
# ADMIN & EMPLOYEE CRUD TESTS
# ==========================================

def test_list_employees_unauthorized(client):
    """Test that unauthorized users cannot list employee accounts"""
    response = client.get("/employees")
    assert response.status_code == 401

def test_list_employees_forbidden_for_employee(client, employee_token):
    """Test that regular employees cannot list employee accounts"""
    response = client.get(
        "/employees",
        headers={"Authorization": f"Bearer {employee_token}"}
    )
    assert response.status_code == 403

def test_admin_create_employee_success(client, admin_token):
    """Test that Admin can successfully create a new employee account"""
    response = client.post(
        "/employees",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Operator Bob",
            "email": "bob@support.com",
            "password": "bobpassword123",
            "role": "EMPLOYEE"
        }
      )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Operator Bob"
    assert data["email"] == "bob@support.com"
    assert data["role"] == "EMPLOYEE"
    assert data["active"] is True
