/**
 * Best-effort in-memory rate limiter. On serverless platforms each
 * function instance has its own memory, so this does not guarantee a
 * hard global limit — but it stops a single abusive client hammering a
 * single warm instance, which is the realistic threat for this app's
 * scale. For stricter guarantees, back this with a shared store
 * (e.g. Upstash Redis) later.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}
