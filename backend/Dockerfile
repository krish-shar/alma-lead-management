# Pinned to a stable Python (host may run newer); guarantees reproducible builds.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps: build tools occasionally needed by wheels; curl for the healthcheck.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first (layer cached unless requirements change).
COPY requirements.txt requirements-dev.txt ./
RUN pip install -r requirements-dev.txt

# Copy the application source.
COPY . .

EXPOSE 8000

# Default (production-style) command. docker-compose overrides this with --reload for dev.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
