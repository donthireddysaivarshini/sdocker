# ============================================================
# Saanidhyam Backend - Dockerfile
# Django REST Framework + Gunicorn + WhiteNoise
# ============================================================

# --- Stage 1: Build dependencies ---
FROM python:3.11-slim AS builder

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /build

# Install system dependencies required by psycopg2-binary and other packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies into a virtual env so we can copy them cleanly
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt


# --- Stage 2: Production image ---
FROM python:3.11-slim AS production

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Runtime dependency for PostgreSQL client libs
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 && \
    rm -rf /var/lib/apt/lists/*

# Create a non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app

# Copy installed Python packages from builder stage
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code (excluding items in .dockerignore)
COPY . .

# Create media directory (for user uploads) and set ownership
RUN mkdir -p /app/media /app/staticfiles && \
    chown -R appuser:appuser /app

# Collect static files (WhiteNoise serves them in production)
# We need a minimal .env for collectstatic to succeed.
# The real .env is provided at runtime via docker-compose or docker run.
RUN SECRET_KEY=temp-build-key-not-for-production \
    DJANGO_ENV=development \
    DEBUG=False \
    PGDATABASE=temp \
    PGUSER=temp \
    PGPASSWORD=temp \
    PGHOST=localhost \
    PGPORT=5432 \
    python manage.py collectstatic --noinput 2>/dev/null || true

RUN chown -R appuser:appuser /app/staticfiles

# Switch to non-root user
USER appuser

# Expose the backend port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/')" || exit 1

# Default command: run migrations then start gunicorn
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn -c gunicorn_config.py satoru_backend.wsgi:application"]
