FROM --platform=linux/amd64 python:3.12-slim

WORKDIR /app

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Add environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV FLASK_APP=application.py

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Make the startup script executable
RUN chmod +x start.sh

EXPOSE 8000

CMD ["./start.sh"]