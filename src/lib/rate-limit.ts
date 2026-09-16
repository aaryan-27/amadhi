/**
 * In-memory sliding-window rate limiter — sufficient for a single-VPS
 * deployment (one Node process under PM2). Swap for Redis if clustering.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  // opportunistic cleanup
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t > windowMs)) buckets.delete(k);
    }
  }
  return true;
}

/**
 * Identify the caller for rate limiting.
 *
 * Order matters, because only one of these headers is trustworthy and which
 * one depends on the deployment:
 *
 * - `x-real-ip` is set by our own Nginx from `$remote_addr`, the actual TCP
 *   peer, which a caller cannot forge. Vercel sets it too.
 * - `x-forwarded-for` is only safe where the platform overwrites it (Vercel).
 *   Behind Nginx, `$proxy_add_x_forwarded_for` *appends* to whatever the client
 *   sent, so its first entry is attacker-controlled — trusting it would let
 *   anyone past the 8/min cap on the lead form just by sending a header.
 *
 * So prefer x-real-ip and treat x-forwarded-for as the fallback. On a VPS this
 * matters more than it did on Vercel: one long-lived process means the limiter
 * actually enforces a global cap rather than a per-instance one.
 *
 * If Cloudflare is ever put in front, add `set_real_ip_from` for its ranges and
 * `real_ip_header CF-Connecting-IP` in Nginx — otherwise every visitor arrives
 * as Cloudflare's IP and shares a single bucket.
 */
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "unknown";
}
