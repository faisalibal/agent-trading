module.exports = {
  apps: [
    {
      name: "trading-dashboard",
      script: "npm",
      args: "start",
      // cwd akan otomatis menggunakan directory tempat file ini berada
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
