# Production Service Runbook

This guide explains how to run the API properly in production and answers the practical server question directly.

If this API is deployed with the current CIRS dashboard, remember that browser auth reaches the API through the dashboard's same-origin `/api/auth/*` proxy. The API still owns `/api/v1/auth/*`, but the dashboard owns the browser cookies on its own origin.

## Short Answer

Yes, you can run the API in a server terminal for a first manual test.

No, you should not rely on an interactive terminal as the actual production runtime.

For real production, run the compiled server under a supervisor such as:

1. PM2
2. systemd
3. a container platform

## What You Actually Run In Production

You run the compiled JavaScript server:

```bash
node dist/server.js
```

This is what `npm start` runs for you.

You do not run:

```bash
npm run dev
```

in production.

## Standard Production Flow

### On the Server

```bash
cd /var/www/xypes-cirs-api
npm ci
npm run build:production
npm start
```

That is enough for a first manual validation.

After that, move to PM2 or systemd.

## PM2 Option

This repo already includes an example PM2 file: `ecosystem.config.example.cjs`.

### Typical PM2 Flow

1. Prepare your server env file.
2. Ensure the PM2 config points to the correct env file if needed.
3. Build the app.
4. Start PM2.

Example:

```bash
cd /var/www/xypes-cirs-api
npm ci
npm run build:production
pm2 start ecosystem.config.cjs --env production
pm2 save
```

Useful PM2 commands:

```bash
pm2 status
pm2 logs xypes-cirs-api
pm2 restart xypes-cirs-api
pm2 stop xypes-cirs-api
pm2 delete xypes-cirs-api
```

## systemd Option

Use this when you want the service managed directly by the OS.

### Example service file

Create `/etc/systemd/system/xypes-cirs-api.service`:

```ini
[Unit]
Description=Xypes CIRS API
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/xypes-cirs-api
EnvironmentFile=/var/www/xypes-cirs-api/.env
ExecStart=/usr/bin/node /var/www/xypes-cirs-api/dist/server.js
Restart=always
RestartSec=5
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

Then run:

```bash
sudo systemctl daemon-reload
sudo systemctl enable xypes-cirs-api
sudo systemctl start xypes-cirs-api
sudo systemctl status xypes-cirs-api
```

Useful systemd commands:

```bash
sudo systemctl restart xypes-cirs-api
sudo systemctl stop xypes-cirs-api
journalctl -u xypes-cirs-api -f
```

## When A Plain Server Terminal Is Acceptable

Use a plain terminal session only for:

1. first boot verification
2. quick diagnostics
3. confirming startup validation errors
4. confirming health and DB connectivity

Example:

```bash
cd /var/www/xypes-cirs-api
npm run build:production
npm start
```

Then test:

```bash
curl http://127.0.0.1:3000/api/v1/health
```

If that works, move the service under PM2 or systemd.

## What Must Exist Before Start

Before you start the production service, confirm:

1. `dist/server.js` exists.
2. The production env file is present.
3. The env file contains `API_KEYS` or `API_KEY`.
4. The env file contains `PASSWORD_RESET_DELIVERY_WEBHOOK_URL`.
5. The env file contains `PRIVACY_DPO_CONTACT_EMAIL`, `PRIVACY_BREACH_PLAYBOOK_VERSION`, and `PRIVACY_BREACH_NOTIFICATION_WINDOW_HOURS`.
6. The env file contains `DATA_RESIDENCY_MODE` and `DATA_PROCESSOR_INVENTORY_VERSION`.
7. The build was done with the intended `FEATURE_*` profile.
8. `CORS_ORIGIN` matches the real dashboard origin for this environment.

## Recommended Operator Workflow

1. SSH into the server.
2. Pull the release.
3. Run `npm ci`.
4. Run `npm run build:production`.
5. Start or restart with PM2 or systemd.
6. Run a health check.
7. Check logs.

## Minimum Health Verification

After service start, verify:

```bash
curl http://127.0.0.1:3000/api/v1/health
```

If you have a reverse proxy, also verify from the public path.

If the dashboard is part of the same release, also verify the full pair:

1. dashboard login succeeds through its `/api/auth/login` proxy
2. dashboard authenticated calls to `/api/auth/me` and `/api/users/capabilities` succeed
3. protected dashboard pages can load data through the API-backed proxy routes
