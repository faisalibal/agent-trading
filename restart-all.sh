#!/bin/bash
# Restart all trading services

echo "🔄 Restarting all services..."

pm2 restart crypto-bot 2>/dev/null
pm2 restart trading-dashboard 2>/dev/null

echo "✅ All services restarted!"
echo ""
echo "📊 Status:"
pm2 status
echo ""
echo "📊 View logs:"
echo "  pm2 logs"
