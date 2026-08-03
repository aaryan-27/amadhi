# Security Best Practices

## Application (implemented)

- **Headers** (`next.config.ts`): HSTS preload, X-Frame-Options SAMEORIGIN, nosniff, strict Referrer-Policy, locked-down Permissions-Policy. Cloudflare adds TLS 1.3 + WAF free ruleset.
- **Admin auth:** Auth.js credentials only surface with auth; bcrypt cost 12; JWT sessions capped at 8h; login attempts logged to ActivityLog; generic error messages (no user enumeration).
- **RBAC:** `canAccess(role, module)` enforced in middleware (cookie gate), the admin layout (session gate), **and every server action** (`requireRole`) — defence in depth; the UI hiding a module is never the only control.
- **Input:** Zod on every public endpoint; length caps server-side; Prisma parameterization everywhere (the one raw pg_trgm query uses positional parameters); admin-authored HTML is the only rich content rendered, and it never comes from public input.
- **Anti-spam without CAPTCHA vendors:** honeypot field + minimum dwell-time + per-IP sliding-window rate limits per endpoint; spam gets a fake success (no oracle).
- **Uploads (Cloudinary phase):** signed upload presets, MIME/type + size validation, no local file writes.
- **Secrets:** `.env` never committed; `AUTH_SECRET` rotated on compromise; DB URL local-socket only.

## VPS hardening (deployment guide covers commands)

- UFW: allow 22/80/443 only; SSH key-only + root login disabled; fail2ban on sshd + nginx auth
- `unattended-upgrades` for security patches
- Postgres bound to localhost; distinct app user with least privilege
- Nginx rate limiting zone on `/api/` as a second layer above the app limiter
- Nightly `pg_dump` (cron) → Cloudflare R2 (free) or `/var/backups/amadhi` + weekly Hostinger snapshot

## Restore runbook

1. `systemctl stop pm2-amadhi` (or `pm2 stop amadhi`)
2. `psql -U amadhi -c "DROP DATABASE amadhi; CREATE DATABASE amadhi;"`
3. `gunzip -c /var/backups/amadhi/amadhi-YYYY-MM-DD.sql.gz | psql -U amadhi amadhi`
4. `psql $DATABASE_URL -f prisma/postgres-fts.sql` (idempotent)
5. `pm2 restart amadhi` → smoke-test `/`, `/admin/login`, one POST to `/api/v1/leads`

## Incident basics

Admin password reset = update `AdminUser.passwordHash` via `npx tsx` one-liner with bcrypt; session invalidation = rotate `AUTH_SECRET` (kills all JWTs); suspicious lead flood = tighten Cloudflare WAF rule on `/api/v1/*` country/ASN.
