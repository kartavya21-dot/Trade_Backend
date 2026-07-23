# ==========================================
# Stage 1: Build React Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /build

# Install dependencies first (leverage caching)
COPY frontend/package.json frontend/package-lock.json* ./frontend/
WORKDIR /build/frontend
RUN npm ci

# Copy source and build
COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Python FastAPI Backend
# ==========================================
FROM python:3.11-slim
WORKDIR /workspace

# Install system dependencies (e.g. build-essential if needed for bcrypt)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python packages
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy FastAPI application code
COPY app/ ./app/
COPY alembic.ini ./alembic.ini
COPY alembic/ ./alembic/

# Copy React build artifacts from Stage 1
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

# Expose port (FastAPI default, Railway overrides via PORT environment variable)
EXPOSE 8000

# Script to run migrations and start server
CMD ["sh", "-c", "alembic upgrade head || true && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
