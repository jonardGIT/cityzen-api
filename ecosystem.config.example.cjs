const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

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
