#!/bin/bash
export PATH="/opt/homebrew/bin:$PATH"
cd "$(dirname "$0")"

# Backend starten
node server/index.js &
BACKEND_PID=$!

# Kurz warten damit Backend bereit ist
sleep 1

# Vite Frontend starten (mit Proxy zu Backend:3002)
npx vite --port 3000

# Cleanup wenn Vite stoppt
kill $BACKEND_PID 2>/dev/null
