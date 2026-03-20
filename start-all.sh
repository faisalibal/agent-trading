#!/bin/bash
# Startup script for both Bot and Dashboard

echo "🚀 Starting AI Trading System..."
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Start Bot
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Starting Trading Bot..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$SCRIPT_DIR"
bash start-bot.sh
echo ""

# Wait a bit for bot to initialize
sleep 2

# Start Dashboard
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Starting Dashboard..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$SCRIPT_DIR/dashboard"
bash start-dashboard.sh
echo ""

# Show status
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All services started!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
pm2 status
echo ""
echo "🌐 Dashboard: http://localhost:3939"
echo ""
echo "📊 View all logs:"
echo "  pm2 logs"
echo ""
echo "🛑 Stop all services:"
echo "  pm2 stop all"
echo "  # or"
echo "  bash stop-all.sh"
