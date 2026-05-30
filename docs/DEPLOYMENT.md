# DEPLOYMENT.md

Production deploy of scaffolded projects.

---

## Stack assumption

- Linux VPS (Ubuntu 22.04+ recommended)
- Node 20+
- PostgreSQL 16+
- Redis 7+
- Caddy 2+ (reverse proxy + auto-TLS)
- PM2 (process manager)
- pnpm 9+

---

## One-time server setup

```bash
# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# pnpm
sudo npm i -g pnpm@9 pm2

# Postgres
sudo apt install -y postgresql-16 redis-server

# Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

---

## Per-app deploy

```bash
# 1. Clone repo
sudo mkdir -p /var/www
cd /var/www
git clone <your-repo> {{projectSlug}}
cd {{projectSlug}}

# 2. Create production .env files
cp .env.production.example apps/api/.env
cp .env.production.example apps/web/.env
# edit both — fill DATABASE_URL, BETTER_AUTH_SECRET, STRIPE_*, CHAPA_*, FRONTEND_URL, etc.

# 3. Create Postgres DB
sudo -u postgres createdb {{projectSlug}}_prod
sudo -u postgres psql -c "CREATE USER {{projectSlug}} WITH PASSWORD '<strong-password>';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE {{projectSlug}}_prod TO {{projectSlug}};"

# 4. Install + build
pnpm install --frozen-lockfile
pnpm db:migrate deploy
pnpm db:seed
pnpm build

# 5. Start API via PM2
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup    # output systemd command — run it as root

# 6. Caddy
sudo cp Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

---

## Caddy

`Caddyfile` (already in template, tokenized to your domain):

```
{$DOMAIN} {
    handle /api/* {
        reverse_proxy 127.0.0.1:3000
    }
    handle {
        root * /var/www/{{projectSlug}}/apps/web/dist
        file_server
        try_files {path} /index.html
    }
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
    }
    encode gzip zstd
}
```

Set `DOMAIN` env var in `/etc/caddy/caddy.env` or hardcode the domain in Caddyfile.

Auto-renews TLS via Let's Encrypt.

---

## PM2

`ecosystem.config.cjs` — already configured. Single API process. Tune `instances` for clustering:

```js
{
  name: '{{projectSlug}}-api',
  cwd: './apps/api',
  script: 'dist/main.js',
  instances: 'max',     // change for clustering
  exec_mode: 'cluster', // for multi-process
  // ...
}
```

Useful commands:
```bash
pm2 status
pm2 logs {{projectSlug}}-api
pm2 restart {{projectSlug}}-api
pm2 reload {{projectSlug}}-api    # zero-downtime
pm2 monit                         # interactive
```

---

## Webhook URLs

After domain is live, configure in dashboards:

- **Stripe** — `https://app.example.com/api/billing/stripe/webhook` (events: `customer.subscription.*`, `invoice.*`, `payment_intent.*`)
- **Chapa** — `https://app.example.com/api/billing/chapa/webhook` (signed via `CHAPA_WEBHOOK_SECRET`)

---

## DB backups

```bash
# Daily backup cron — add to /etc/cron.daily/{{projectSlug}}-backup
#!/bin/bash
BACKUP_DIR=/var/backups/{{projectSlug}}
mkdir -p $BACKUP_DIR
sudo -u postgres pg_dump {{projectSlug}}_prod | gzip > $BACKUP_DIR/$(date +%F).sql.gz
find $BACKUP_DIR -mtime +30 -delete
```

For prod: ship to S3-compatible storage. Restic / rclone / pg_dump piped to `aws s3 cp -`.

---

## Health checks

API exposes `/health` (returns 200 with DB+Redis check). Use for:
- Caddy upstream healthcheck
- Uptime monitoring (UptimeRobot, Better Stack, etc.)
- Load balancer health probe (if behind one)

---

## Updating in place

```bash
cd /var/www/{{projectSlug}}
git pull
pnpm install --frozen-lockfile
pnpm db:migrate deploy
pnpm build
pm2 reload {{projectSlug}}-api    # zero-downtime
sudo systemctl reload caddy        # only if Caddyfile changed
```

---

## Docker option (alternative to PM2/Caddy)

Template ships a `Dockerfile` ready for use. Build:

```bash
docker build -t {{projectSlug}}:latest .
docker run -d --name {{projectSlug}} \
  --env-file apps/api/.env \
  -p 3000:3000 \
  {{projectSlug}}:latest
```

---

## Scaling

- **Horizontal** — clone the API process via PM2 cluster mode (`exec_mode: 'cluster', instances: 'max'`). Sticky sessions not required (Better Auth uses DB sessions).
- **DB** — Postgres replication / Neon / Supabase / RDS read replicas
- **Cache/Queue** — Redis Cluster or managed (Upstash)
- **Static** — `apps/web/dist` already optimized; serve via CDN if needed (Caddy + Cloudflare)
