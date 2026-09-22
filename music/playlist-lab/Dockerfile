FROM python:3.12-slim

WORKDIR /app
COPY requirements-hosted.txt .
RUN pip install --no-cache-dir -r requirements-hosted.txt
COPY lab.py access_auth.py review.html player.js batches.js ./
RUN useradd --system --uid 10001 --create-home playlist
USER playlist
EXPOSE 8765
CMD ["python", "lab.py", "--state", "/data", "serve"]
