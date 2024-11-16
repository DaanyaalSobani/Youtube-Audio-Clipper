ARG BUILD_FROM=python:3.9-slim
FROM $BUILD_FROM
WORKDIR /app
RUN apt-get update && apt-get install -y ffmpeg
COPY requirements.txt youtube.cookies ./
RUN pip install -r requirements.txt
RUN mkdir -p /downloads
COPY app/ ./app/
CMD ["python", "app/main.py"]
