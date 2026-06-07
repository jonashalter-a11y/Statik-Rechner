#!/bin/bash
export PATH="/opt/homebrew/bin:$PATH"
cd "$(dirname "$0")"

# Backend starten
PORT=3002 node server/index.js &
BACKEND_PID=$!

# Kurz warten damit Backend bereit ist
sleep 1

# Vite Frontend starten (mit Proxy zu Backend:3002)
npx vite --host localhost --port 5173 --strictPort

# Cleanup wenn Vite stoppt
kill $BACKEND_PID 2>/dev/null
