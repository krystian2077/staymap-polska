FROM python:3.12-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    binutils \
    libproj-dev \
    gdal-bin \
    libgdal-dev \
    libmagic1 \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

ENV GDAL_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu/libgdal.so

WORKDIR /app

COPY backend/requirements/ /tmp/requirements/
RUN pip install --no-cache-dir -r /tmp/requirements/production.txt

COPY backend/ /app/

EXPOSE 8000

CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
