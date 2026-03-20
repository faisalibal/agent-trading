#!/bin/bash
# Startup script for Trading Dashboard

echo "📊 Starting Trading Dashboard..."

# Check if we're in dashboard directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from dashboard directory!"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build if .next doesn't exist
if [ ! -d ".next" ]; then
    echo "🔨 Building dashboard..."
    npm run build
fi

# Start with PM2 using ecosystem config
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js
else
    # Fallback to manual start
    pm2 start npm --name "trading-dashboard" -- start
fi

echo "✅ Dashboard started successfully!"
echo ""
echo "🌐 Access dashboard at: http://localhost:3939"
echo ""
echo "📊 Monitor logs:"
echo "  pm2 logs trading-dashboard"
echo ""
echo "🔍 Check status:"
echo "  pm2 status"
echo ""
echo "🛑 Stop dashboard:"
echo "  pm2 stop trading-dashboard"
