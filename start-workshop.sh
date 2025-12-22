#!/bin/bash

# Casper x402 Workshop Startup Script
echo "🚀 Starting Casper x402 Workshop..."

# Function to cleanup processes on exit
cleanup() {
    echo "🛑 Shutting down workshop..."
    kill $SERVER_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Check if required directories exist
if [ ! -d "server" ]; then
    echo "❌ Server directory not found!"
    exit 1
fi

if [ ! -d "workshop-code" ]; then
    echo "❌ Workshop-code directory not found!"
    exit 1
fi

if [ ! -d "final-facilitator" ]; then
    echo "❌ Final-facilitator directory not found!"
    exit 1
fi

# Start the server (which will start the facilitator)
echo "📡 Starting server and facilitator..."
cd server
npm run dev &
SERVER_PID=$!
cd ..

# Wait for server to start
echo "⏳ Waiting for server to initialize..."
sleep 5

# Start the frontend
echo "🎨 Starting frontend..."
cd workshop-code
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Workshop is starting up!"
echo ""
echo "📋 Services:"
echo "   • Server: http://localhost:4402"
echo "   • Frontend: http://localhost:3000"
echo "   • Facilitator: http://localhost:8080"
echo ""
echo "🔗 Open http://localhost:3000 to access the workshop"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for processes
wait $SERVER_PID $FRONTEND_PID