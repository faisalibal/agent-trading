# 🚀 Deployment Guide

Panduan lengkap untuk deploy dan menjalankan AI Trading Bot + Dashboard.

---

## 📋 Prerequisites

1. **Node.js** v18+ installed
2. **PM2** installed globally: `npm install -g pm2`
3. **Git** untuk clone/pull code
4. **.env** file configured (copy from `.env.example`)

---

## 🎯 Quick Start

### **Option 1: Start All Services (Recommended)**

```bash
# Make scripts executable (first time only)
chmod +x *.sh
chmod +x dashboard/*.sh

# Start bot + dashboard
./start-all.sh
```

### **Option 2: Start Individually**

```bash
# Start bot only
./start-bot.sh

# Start dashboard only
cd dashboard
./start-dashboard.sh
```

---

## 📦 First Time Setup

```bash
# 1. Clone repository
git clone <your-repo-url>
cd agent-trading

# 2. Configure environment
cp .env.example .env
nano .env
# Fill in:
# - BINANCE_API_KEY
# - BINANCE_API_SECRET
# - GEMINI_API_KEY
# - TELEGRAM_BOT_TOKEN (optional)

# 3. Install bot dependencies
npm install

# 4. Install dashboard dependencies
cd dashboard
npm install
npm run build
cd ..

# 5. Start all services
./start-all.sh

# 6. Save PM2 config (auto-start on reboot)
pm2 save
pm2 startup
# Copy-paste the command shown and run it
```

---

## 🔧 Management Commands

### **Start Services**
```bash
./start-all.sh              # Start bot + dashboard
./start-bot.sh              # Start bot only
cd dashboard && ./start-dashboard.sh  # Start dashboard only
```

### **Stop Services**
```bash
./stop-all.sh               # Stop all
pm2 stop crypto-bot         # Stop bot only
pm2 stop trading-dashboard  # Stop dashboard only
```

### **Restart Services**
```bash
./restart-all.sh            # Restart all
pm2 restart crypto-bot      # Restart bot only
pm2 restart trading-dashboard  # Restart dashboard only
```

### **View Logs**
```bash
pm2 logs                    # All logs (live)
pm2 logs crypto-bot         # Bot logs only
pm2 logs trading-dashboard  # Dashboard logs only
pm2 logs --lines 100        # Last 100 lines
```

### **Monitor**
```bash
pm2 status                  # Service status
pm2 monit                   # Real-time monitor
```

### **Delete Services**
```bash
pm2 delete crypto-bot
pm2 delete trading-dashboard
pm2 delete all              # Delete all
```

---

## 🔄 Update & Redeploy

```bash
# Pull latest code
git pull origin main

# Update bot
npm install
pm2 restart crypto-bot

# Update dashboard
cd dashboard
npm install
npm run build
pm2 restart trading-dashboard
cd ..

# Or use restart script
./restart-all.sh
```

---

## 🌐 Access Dashboard

- **Local**: http://localhost:3939
- **Server**: http://your-server-ip:3939
- **With Nginx**: https://tradeagent.yourdomain.com

---

## 🔒 Security Setup (Production)

### **1. Firewall**
```bash
# Allow only from specific IP
sudo ufw allow from YOUR_IP to any port 3939

# Or block public access (use Nginx reverse proxy)
sudo ufw deny 3939
```

### **2. Nginx Reverse Proxy** (Recommended)

See `dashboard/nginx-config-example.conf` for configuration.

```bash
# On Nginx server
sudo nano /etc/nginx/sites-available/tradeagent
# Paste config and update proxy_pass IP

sudo ln -s /etc/nginx/sites-available/tradeagent /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### **3. Basic Authentication**
```bash
# On Nginx server
sudo htpasswd -c /etc/nginx/.htpasswd admin
# Enter password

# Add to Nginx config:
# auth_basic "Trading Dashboard";
# auth_basic_user_file /etc/nginx/.htpasswd;
```

---

## 🐛 Troubleshooting

### **Bot not starting**
```bash
# Check logs
pm2 logs crypto-bot --lines 50

# Common issues:
# - Missing .env file
# - Invalid API keys
# - Network issues
```

### **Dashboard not showing data**
```bash
# Check if bot is running
pm2 status

# Check dashboard logs
pm2 logs trading-dashboard --lines 50

# Test API endpoints
curl http://localhost:3939/api/debug
curl http://localhost:3939/api/logs?date=2026-03-20
```

### **SAPI endpoint errors**
```bash
# Make sure you pulled latest code with SAPI fix
git pull origin main
pm2 restart crypto-bot
```

### **Logs not showing**
```bash
# Check logs directory exists
ls -la logs/

# Check LOGS_PATH in ecosystem.config.js
cat dashboard/ecosystem.config.js | grep LOGS_PATH

# Set absolute path if needed
pm2 delete trading-dashboard
cd dashboard
LOGS_PATH=/full/path/to/logs pm2 start npm --name "trading-dashboard" -- start
```

---

## 📊 PM2 Auto-Start on Reboot

```bash
# Save current PM2 processes
pm2 save

# Generate startup script
pm2 startup

# Copy-paste the command shown and run it
# Example: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u youruser --hp /home/youruser

# Test by rebooting
sudo reboot

# After reboot, check services
pm2 status
```

---

## 📝 Service Names

- **Bot**: `crypto-bot`
- **Dashboard**: `trading-dashboard`

Use these names with PM2 commands:
```bash
pm2 logs crypto-bot
pm2 restart trading-dashboard
pm2 stop crypto-bot
```

---

## ✅ Health Check

```bash
# Check all services running
pm2 status

# Should show:
# ┌─────┬──────────────────────┬─────────┬─────────┬──────────┐
# │ id  │ name                 │ status  │ cpu     │ memory   │
# ├─────┼──────────────────────┼─────────┼─────────┼──────────┤
# │ 0   │ crypto-bot           │ online  │ 0%      │ 120mb    │
# │ 1   │ trading-dashboard    │ online  │ 0%      │ 80mb     │
# └─────┴──────────────────────┴─────────┴─────────┴──────────┘

# Test dashboard
curl -I http://localhost:3939
# Should return: HTTP/1.1 200 OK

# Test bot is trading
tail -f logs/$(date +%Y-%m-%d).log
```

---

## 🆘 Support

If you encounter issues:

1. Check PM2 logs: `pm2 logs --lines 100`
2. Check bot logs: `cat logs/$(date +%Y-%m-%d).log`
3. Verify .env configuration
4. Ensure API keys are valid
5. Check network connectivity to Binance

---

**Happy Trading! 🚀📈**
