# Base image can be defined at build time
ARG BUILD_FROM=python:3.9-slim
# Set default package manager type
ARG PKG_MANAGER=apt
FROM $BUILD_FROM
WORKDIR /app
RUN echo $PKG_MANAGER
RUN echo $BUILD_FROM
# Install ffmpeg based on package manager type
RUN if [ "$PKG_MANAGER" = "apt" ]; then \
        apt-get update && apt-get install -y ffmpeg; \
    elif [ "$PKG_MANAGER" = "apk" ]; then \
        apk add --no-cache ffmpeg; \
    else \
        echo "Unsupported package manager: $PKG_MANAGER"; \
        exit 1; \
    fi
COPY requirements.txt .
RUN pip install -r requirements.txt --break-system-packages
RUN mkdir -p /downloads

# Development: app directory will be mounted
# COPY app/ ./app/

# Default command (can be overridden by docker-compose)
CMD ["python", "app/main.py"]
