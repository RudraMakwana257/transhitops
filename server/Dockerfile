# Stage 1: Builder
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt


# Stage 2: Final
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies (libpq needed for psycopg2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN addgroup --system appgroup && adduser --system --group appuser

# Copy installed packages from builder
COPY --from=builder /app/wheels /wheels
RUN pip install --no-cache /wheels/*

# Copy app code
COPY . .

# Set permissions
RUN mkdir -p /tmp && chmod 777 /tmp
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

EXPOSE 5000

# Use gunicorn as entrypoint
CMD ["gunicorn", "--config", "gunicorn.conf.py", "run:app"]
