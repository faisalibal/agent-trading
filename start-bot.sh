#!/bin/bash
# Startup script for AI Trading Bot

echo "🤖 Starting AI Trading Bot..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start with PM2
pm2 start index.js --name "crypto-bot" \
    --time \
    --max-memory-restart 500M \
    --restart-delay 5000

echo "✅ Bot started successfully!"
echo ""
echo "📊 Monitor logs:"
echo "  pm2 logs crypto-bot"
echo ""
echo "🔍 Check status:"
echo "  pm2 status"
echo ""
echo "🛑 Stop bot:"
echo "  pm2 stop crypto-bot"
