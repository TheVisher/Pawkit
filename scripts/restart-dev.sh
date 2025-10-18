#!/bin/bash

echo "🔄 Restarting development server for better performance..."

# Kill existing Next.js processes
echo "Stopping existing Next.js processes..."
pkill -f "next dev" || true
pkill -f "next-server" || true

# Wait a moment for processes to fully stop
sleep 2

# Clear Next.js cache
echo "Clearing Next.js cache..."
rm -rf .next

# Clear node_modules cache if it exists
if [ -d "node_modules/.cache" ]; then
    echo "Clearing node_modules cache..."
    rm -rf node_modules/.cache
fi

# Start fresh development server
echo "Starting fresh development server..."
npm run dev
