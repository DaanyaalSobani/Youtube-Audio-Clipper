ARG BUILD_FROM=python:3.9-slim
FROM $BUILD_FROM
WORKDIR /app
RUN python --version
RUN pip --version
RUN if command -v apt-get >/dev/null 2>&1; then \
        apt-get update && apt-get install -y ffmpeg; \
    else \
        apk add --no-cache ffmpeg; \
    fi
COPY requirements.txt .
RUN pip install -r requirements.txt
RUN mkdir -p /downloads
COPY app/ ./app/
CMD ["python", "app/main.py"]
