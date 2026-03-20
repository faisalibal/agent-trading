module.exports = {
  apps: [
    {
      name: "trading-dashboard",
      script: "npm",
      args: "start",
      cwd: "/Users/xvp4g7fjfk/File/workplace/code/kadintek/agent-trading/dashboard",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3939,
      },
      error_file: "./logs/dashboard-error.log",
      out_file: "./logs/dashboard-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
