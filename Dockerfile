# Stage 1: Build the React frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend

# Install node dependencies
COPY frontend/package.json ./
RUN npm install

# Copy source and build files (excluding node_modules due to .dockerignore)
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the FastAPI backend and serve frontend
FROM python:3.11-slim
WORKDIR /app

# Ensure standard output and error streams are sent straight to terminal (unbuffered)
# This allows container logs to appear in real-time in Google Cloud Logging (Stackdriver)
ENV PYTHONUNBUFFERED=1

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy FastAPI backend code
COPY main.py .

# Copy built frontend from stage 1
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Expose port for Google Cloud Run (default is 8080)
EXPOSE 8080

# Environment variables
ENV PORT=8080
ENV HOST=0.0.0.0

# Start Uvicorn using exec to replace the shell process
# This ensures that Uvicorn runs as PID 1, allowing it to correctly receive
# SIGTERM and other termination signals for graceful shutdown on Cloud Run.
CMD ["sh", "-c", "exec uvicorn main:app --host $HOST --port $PORT"]
