#!/bin/sh
echo "Starting Saboteur WebSocket Server on port 4000..."
node /app/server/index.js &

echo "Starting Nginx on port 80..."
exec nginx -g "daemon off;"
