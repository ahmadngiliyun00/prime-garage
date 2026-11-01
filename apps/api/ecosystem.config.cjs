// PM2 process file (docs/DEPLOYMENT.md). Run from apps/api: pm2 startOrReload ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'prime-garage-api',
      script: 'dist/main.js',
      cwd: __dirname,
      exec_mode: 'fork', // single instance, see ADR-005
      instances: 1,
      env: { NODE_ENV: 'production' },
      max_memory_restart: '512M',
      time: true,
    },
    {
      name: 'prime-garage-worker',
      script: 'dist/worker.js',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1, // MUST stay 1 so the daily cron never runs twice
      env: { NODE_ENV: 'production' },
      max_memory_restart: '256M',
      time: true,
    },
  ],
};
