# Deployment Guide — Hostinger KVM VPS (Ubuntu 22.04)

Target: `amadhi.com` on one VPS (2 vCPU / 8 GB). Stack: Ubuntu → PostgreSQL 16 → Node 20 LTS → Nginx → PM2 → Certbot → Cloudflare → GitHub Actions.

## 1. Base server

```bash
adduser deploy && usermod -aG sudo deploy
# SSH key-only:
sed -i 's/#\?PasswordAuthentication yes/PasswordAuthentication no/; s/#\?PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config && systemctl restart ssh
apt update && apt upgrade -y
apt install -y ufw fail2ban unattended-upgrades nginx
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable
dpkg-reconfigure -plow unattended-upgrades
```

## 2. PostgreSQL 16

```bash
apt install -y postgresql-16 postgresql-contrib-16
sudo -u postgres psql <<SQL
CREATE USER amadhi WITH PASSWORD '<strong-password>';
CREATE DATABASE amadhi OWNER amadhi;
SQL
```
Tune `/etc/postgresql/16/main/postgresql.conf`: `shared_buffers=1GB`, `effective_cache_size=3GB`, `listen_addresses='localhost'`.

## 3. Node + app

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs
npm i -g pm2
# as deploy:
git clone git@github.com:<org>/amadhi.git /home/deploy/amadhi && cd /home/deploy/amadhi
cp prisma/schema.postgres.prisma prisma/schema.prisma   # switch to Postgres schema
cat > .env <<EOF
DATABASE_URL="postgresql://amadhi:<pw>@localhost:5432/amadhi"
AUTH_SECRET="$(openssl rand -base64 32)"
ADMIN_SEED_PASSWORD="<initial-admin-password>"
SEARCH_ENGINE="postgres"
NEXT_PUBLIC_SITE_URL="https://www.amadhi.com"
EOF
npm ci
npx prisma db push        # or prisma migrate deploy once migrations are baselined
psql "$DATABASE_URL" -f prisma/postgres-fts.sql
npx prisma db seed        # first deploy only
npm run build
pm2 start npm --name amadhi -- start && pm2 save && pm2 startup
```

## 4. Nginx + TLS

`/etc/nginx/sites-available/amadhi`:
```nginx
server {
  server_name amadhi.com www.amadhi.com;
  location /_next/static/ { proxy_pass http://127.0.0.1:3000; expires max; add_header Cache-Control "public, immutable"; }
  location /api/ { limit_req zone=api burst=20 nodelay; proxy_pass http://127.0.0.1:3000; }
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
}
```
Add in `nginx.conf` http block: `limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;` then:
```bash
ln -s /etc/nginx/sites-available/amadhi /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx
apt install -y certbot python3-certbot-nginx
certbot --nginx -d amadhi.com -d www.amadhi.com
```

## 5. Cloudflare (free)

Nameservers → Cloudflare; A records (proxied) for `@` and `www`; SSL mode **Full (strict)**; enable Brotli, HTTP/3, Always Use HTTPS; WAF managed free ruleset ON; cache rule: bypass `/admin*` and `/api*`.

## 6. GitHub Actions CI/CD (`.github/workflows/deploy.yml`)

```yaml
name: Deploy
on: { push: { branches: [main] } }
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci && npm run lint
      - name: Deploy over SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: deploy
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /home/deploy/amadhi
            git pull --ff-only
            npm ci
            npx prisma migrate deploy
            npm run build
            pm2 reload amadhi
```

## 7. Backups & monitoring

```bash
# /etc/cron.d/amadhi-backup — nightly 02:30 IST
30 2 * * * deploy pg_dump "$DATABASE_URL" | gzip > /var/backups/amadhi/amadhi-$(date +\%F).sql.gz && find /var/backups/amadhi -mtime +14 -delete
# optional: rclone copy /var/backups/amadhi r2:amadhi-backups  (Cloudflare R2 free 10GB)
```
Weekly Hostinger snapshot from hPanel. UptimeRobot monitor on `https://amadhi.com` (5-min interval, free). Restore runbook: `docs/07-security.md`.

## 8. Go-live checklist

DNS proxied ✓ · TLS Full-strict ✓ · seed admin password changed ✓ · GA4/GTM/Clarity IDs entered in Admin → Settings ✓ · Search Console verified + sitemap submitted ✓ · test lead → WhatsApp round-trip ✓ · backup cron has produced one restorable dump ✓
