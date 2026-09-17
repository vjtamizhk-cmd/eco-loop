# Use Python 3.11 slim for smaller image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for Pillow/qrcode
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libjpeg62-turbo-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .
COPY app/ app/
COPY alembic/ alembic/
COPY alembic.ini .

# Cloud Run sets PORT env variable (default 8080)
ENV PORT=8080

# Expose the port
EXPOSE ${PORT}

# Run the FastAPI application with uvicorn
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
