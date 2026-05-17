FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV POETRY_VIRTUALENVS_CREATE=false

WORKDIR /app/backend

RUN pip install --no-cache-dir poetry==2.4.1

COPY backend/pyproject.toml ./
RUN poetry install --only main --no-root --no-interaction

COPY backend/ ./

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
