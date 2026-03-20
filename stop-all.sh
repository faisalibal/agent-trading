#!/bin/bash
# Stop all trading services

echo "🛑 Stopping all services..."

pm2 stop crypto-bot 2>/dev/null
pm2 stop trading-dashboard 2>/dev/null

echo "✅ All services stopped!"
echo ""
echo "📊 Status:"
pm2 status
