# Droplet Deploy Setup

This repository includes a GitHub Actions workflow at `.github/workflows/deploy.yml` that can deploy the API to a Linux droplet over SSH.

## What the workflow expects

The deploy job reads three GitHub repository secrets:

- `DROPLET_HOST`: the droplet public IP address or DNS name
- `DROPLET_USER`: the Linux user that GitHub Actions should SSH as
- `DROPLET_SSH_KEY`: the SSH private key content for that user

The workflow passes those values to `appleboy/ssh-action` as:

- `host: ${{ env.DEPLOY_HOST }}`
- `username: ${{ env.DEPLOY_USER }}`
- `key: ${{ env.DEPLOY_KEY }}`

## Private key vs public key

`DROPLET_SSH_KEY` must contain the private key, not the public key.

Use the full private key block in the GitHub secret, for example:

```text
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

The matching public key belongs on the droplet in the target user's `~/.ssh/authorized_keys` file.

Do not store the `.pub` file in `DROPLET_SSH_KEY`.

## Recommended setup

Create a dedicated deploy key instead of reusing a personal workstation SSH key.

1. Generate a new key pair locally:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/xypes-droplet-deploy
```

2. Show the public key:

```bash
cat ~/.ssh/xypes-droplet-deploy.pub
```

3. Add that public key to the deploy user's `~/.ssh/authorized_keys` on the droplet.

4. Add these GitHub repository secrets:

- `DROPLET_HOST`: example `203.0.113.10` or `api.example.com`
- `DROPLET_USER`: example `root` or a dedicated deploy user such as `deploy`
- `DROPLET_SSH_KEY`: the full contents of `~/.ssh/xypes-droplet-deploy`

## GitHub repository settings

In GitHub, add the secrets under:

`Settings` -> `Secrets and variables` -> `Actions`

The workflow will print this message when any required secret is missing:

```text
Skipping droplet deploy because DROPLET_HOST, DROPLET_USER, or DROPLET_SSH_KEY is not configured in this repository.
```

## Current repository guard

The current workflow is still gated by `github.repository == 'Xypes13/xypes-cityzen-api'`.

If this repository should deploy from `Xypes13/xypes-cirs-api`, update the repository guard in `.github/workflows/deploy.yml` so it matches this repository name. Otherwise the deploy job will never run here even when the secrets are configured.

## Droplet assumptions in the current script

The current SSH deploy script assumes:

- the app lives at `/var/www/xypes-cirs-api`
- PM2 is installed on the droplet
- `ecosystem.config.cjs` exists already or can be copied from `ecosystem.config.example.cjs`
- the droplet can run `npm ci`
- the checked-out branch is `main`

The script resets the server copy to `origin/main`, removes stale tracked and untracked files while preserving local env and PM2 config files, validates `dist/server.js`, and restarts PM2.
