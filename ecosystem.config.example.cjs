const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Production env files should keep these trust-layer baseline defaults visible for partner-LGU rollout:
// PUBLIC_CASE_LOOKUP_RATE_LIMIT_WINDOW_MS=600000
// PUBLIC_CASE_LOOKUP_RATE_LIMIT_MAX_REQUESTS=20
// INCIDENT_CASE_TOKEN_TTL_DAYS=30
// PUBLIC_CASE_LOOKUP_RATE_LIMIT_ENABLED=true
const envFile = process.env.PM2_ENV_FILE || '.env';
const envPath = path.resolve(__dirname, envFile);
const fileEnv = fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath, 'utf8')) : {};

module.exports = {
  apps: [
    {
      name: 'xypes-cirs-api',
      cwd: '/var/www/xypes-cirs-api',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        ENV_FILE: envFile,
      },
      env_production: {
        ...fileEnv,
        NODE_ENV: 'production',
        ENV_FILE: envFile,
      },
    },
  ],
};
