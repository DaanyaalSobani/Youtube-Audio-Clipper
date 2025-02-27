# Base image can be defined at build time
ARG BUILD_FROM=python:3.9-slim
# Set default package manager type
ARG PKG_MANAGER=apt
FROM $BUILD_FROM
WORKDIR /app

# Re-declare ARGs after FROM to make them available
ARG PKG_MANAGER
ARG BUILD_FROM

# Debug information properly passing the ARGs to shell
RUN echo "========== DEBUG INFO =========="
RUN echo "PKG_MANAGER value: ${PKG_MANAGER}"
RUN echo "Which command exists:"
RUN which apt-get || echo "apt-get not found"
RUN which apk || echo "apk not found"
RUN echo "==============================="
# Install ffmpeg based on package manager type
RUN echo "About to check PKG_MANAGER: ${PKG_MANAGER}" && \
    if [ "${PKG_MANAGER}" = "apt" ]; then \
        echo "USING APT PACKAGE MANAGER"; \
        apt-get update && apt-get install -y ffmpeg; \
    elif [ "${PKG_MANAGER}" = "apk" ]; then \
        echo "USING APK PACKAGE MANAGER"; \
        apk add --no-cache ffmpeg; \
    else \
        echo "UNSUPPORTED PACKAGE MANAGER: ${PKG_MANAGER}"; \
        exit 1; \
    fi
COPY requirements.txt .
RUN pip install -r requirements.txt --break-system-packages
RUN mkdir -p /downloads

# Development: app directory will be mounted
# COPY app/ ./app/

# Default command (can be overridden by docker-compose)
CMD ["python", "app/main.py"]
