# Deployment Guide

This template ships with a guarded VPS deployment runner:

```bash
pnpm deploy staging --dry-run
pnpm deploy production --confirm-production
```

The runner is intentionally conservative. It refuses production deploys without explicit confirmation, runs `pnpm deploy:check` before release, copies the current working tree to a timestamped remote release directory, links shared environment files, installs dependencies, builds, backs up the database, runs `prisma migrate deploy`, reloads PM2, performs a health check, and rolls back the `current` symlink if the health check fails.

`pnpm readiness:smoke` runs a deterministic local dry-run of the deploy, backup, and restore scripts. It is included in `pnpm deploy:check` so release tooling breaks before a real VPS or database is involved.

## Configure The Deploy Host

Create an environment file on the machine that runs deploys:

```bash
cp .env.deploy.example .env.deploy.production
```

Set at minimum:

```bash
DEPLOY_HOST=your-vps.example.com
DEPLOY_USER=deploy
DEPLOY_PATH=/var/www/{{projectSlug}}
DEPLOY_PM2_APP={{projectSlug}}-api
DEPLOY_HEALTH_URL=http://127.0.0.1:3000/health
```

The remote server keeps runtime secrets outside release folders:

```text
/var/www/{{projectSlug}}/
  current -> releases/<release-id>
  releases/
  shared/
    apps/api/.env
    apps/web/.env
    backups/
```

Put production runtime env files in `shared/apps/api/.env` and `shared/apps/web/.env`. The deploy runner symlinks them into each release.

## Dry Run

Always dry-run a new target first:

```bash
pnpm deploy staging --dry-run
```

Dry run prints local, SSH, and rsync commands without executing them. It still checks the local git state and branch when git metadata is available.

## Production Deploy

Production deploys require confirmation:

```bash
pnpm deploy production --confirm-production
```

Use `DEPLOY_CONFIRM_PRODUCTION=1` only in CI after the workflow already gates who can trigger production.

## Rollback Behavior

The deploy runner records the previous `current` symlink before activating a release. If the post-reload health check fails, it restores the previous symlink and reloads PM2 again. Manual rollback is the same operation:

```bash
ssh deploy@your-vps.example.com
cd /var/www/{{projectSlug}}
ln -sfn "$(ls -dt releases/* | sed -n '2p')" current
cd current
pm2 reload {{projectSlug}}-api --update-env
```

## Useful Options

```bash
pnpm deploy staging --skip-checks
pnpm deploy staging --skip-backup
pnpm deploy staging --skip-migrate
pnpm deploy staging --skip-health-check
```

Only use skip flags during incident recovery or when another controlled system already performed that step.
