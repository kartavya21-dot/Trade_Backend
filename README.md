# Customer Support Trade Admin Section

A real-time customer support chat application featuring an Admin/Employee dashboard, visitor queue management, row-level locking chat acceptance, unread badges, and WebSockets.

---

## 🛠️ Architecture

- **Backend**: FastAPI, SQLModel (Async PostgreSQL), WebSockets, JWT Authentication  
  - Runs independently on `http://localhost:8000`
- **Frontend**: React, Vite, Vanilla CSS + TailwindCSS  
  - Runs independently on `http://localhost:5173`

---

## 🚀 Running Backend & Frontend Individually

### Step 1: Start the Backend Server (FastAPI)

Open a terminal in the project root directory:

```bash
# 1. Activate the Python virtual environment (Windows PowerShell)
.venv\Scripts\Activate.ps1

# 2. Run Uvicorn dev server on port 8000
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- 🌐 **Backend URL**: `http://localhost:8000`
- 📑 **Swagger API Docs**: `http://localhost:8000/docs`
- ❤️ **Health Check**: `http://localhost:8000/health`

---

### Step 2: Start the Frontend Dev Server (Vite / React)

Open a **second** terminal window:

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies (if not already installed)
npm install

# 3. Start Vite dev server
npm run dev
```

- 🖥️ **Frontend App**: `http://localhost:5173`

> 💡 **Vite Proxy Config**: The frontend dev server is configured (`frontend/vite.config.js`) to automatically proxy all API requests (`/login`, `/conversations`, `/visitor`, `/chat`) and WebSockets (`/ws`) to `http://localhost:8000`.

---

## 🔑 Default Admin Credentials

Upon initial database startup, a default superuser account is automatically seeded:

- **Email**: `admin@trade.com`
- **Password**: `admin123`

---

## 📁 Project Structure

```
Trade Admin Section/
├── app/                        # FastAPI Backend Application
│   ├── auth/                   # JWT & OAuth2 Security Dependencies
│   ├── core/                   # Configuration & Environment Settings
│   ├── database/               # Async Engine & Session Connection
│   ├── models/                 # SQLModel Database Models (Employee, Visitor, Conversation, Message)
│   ├── routers/                # API Endpoints (Auth, Admin, Visitor, Conversations)
│   ├── schemas/                # Pydantic Schemas for Requests & Responses
│   ├── services/               # Business Logic & Database Operations
│   └── websocket/              # ConnectionManager & Real-Time Event Endpoints
│
├── frontend/                   # React + Vite Frontend Application
│   ├── src/
│   │   ├── components/         # React UI Components (Sidebar, ChatArea, VisitorDetails, VisitorChatWidget)
│   │   ├── App.jsx             # Main Dashboard Container & WebSocket Dispatcher
│   │   └── main.jsx            # Entry point
│   ├── vite.config.js          # Vite Dev Server & Proxy Rules
│   └── package.json            # Node Dependencies
│
├── VISITOR_CHAT_INTEGRATION_GUIDE.md  # Detailed Integration Guide for Customer Websites
├── README.md                   # Setup & Instructions
└── requirements.txt            # Python Dependencies
```
