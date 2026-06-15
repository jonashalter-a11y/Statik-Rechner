#!/bin/bash
export PATH="/opt/homebrew/bin:$PATH"
cd "$(dirname "$0")"

# Vite Frontend starten
npx vite --host localhost --port 5173 --strictPort
