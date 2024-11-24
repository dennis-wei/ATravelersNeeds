#!/bin/bash
# Initialize the migrations directory if it doesn't exist
flask db init || true

# Run migrations
flask db migrate -m "Initial migration" || true
flask db upgrade

# Start gunicorn
exec gunicorn --bind 0.0.0.0:8000 \
    --workers 3 \
    --timeout 60 \
    --access-logfile - \
    --error-logfile - \
    application:application