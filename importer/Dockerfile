FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    TZ=America/Sao_Paulo

WORKDIR /app

COPY importer/requirements.txt ./requirements.txt
RUN pip install -r requirements.txt

COPY importer/importador.py ./importador.py

# Roda uma vez ao subir e depois todo dia no RUN_AT_HOUR (padrao 06:00).
CMD ["python", "importador.py", "--loop"]
