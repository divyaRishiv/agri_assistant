# =============================
# Stage 1: Build React Frontend
# =============================
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build frontend
RUN npm run build


# =============================
# Stage 2: Build FastAPI Backend
# =============================
FROM python:3.11-slim

WORKDIR /app

# Prevent Python buffering
ENV PYTHONUNBUFFERED=1

# Install system dependencies if needed
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source files
COPY . .

# Copy built frontend from previous stage
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Cloud Run expects container to listen on PORT
ENV PORT=8080

# Expose Cloud Run port
EXPOSE 8080

# Start FastAPI application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
