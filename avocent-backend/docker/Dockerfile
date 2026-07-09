FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    redis-tools \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel && pip install -r requirements.txt

COPY . .

RUN chmod +x docker/entrypoint-web.sh docker/entrypoint-worker.sh docker/entrypoint-beat.sh
RUN addgroup --system app && adduser --system --ingroup app --home /app app
RUN chown -R app:app /app

USER app:app

EXPOSE 8000

CMD ["docker/entrypoint-web.sh"]
