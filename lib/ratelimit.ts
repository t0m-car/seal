// Per-process; replace with Upstash Redis or Vercel KV for multi-instance deployments.
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const SWEEP_EVERY = 100;

const recentRequests = new Map<string, number[]>();
let sinceSweep = 0;

function sweep(now: number) {
  for (const [key, timestamps] of recentRequests) {
    const valid = timestamps.filter((t) => now - t < WINDOW_MS);
    if (valid.length === 0) {
      recentRequests.delete(key);
    } else if (valid.length !== timestamps.length) {
      recentRequests.set(key, valid);
    }
  }
}

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  if (++sinceSweep >= SWEEP_EVERY) {
    sinceSweep = 0;
    sweep(now);
  }

  const previous = recentRequests.get(ip) ?? [];
  const withinWindow = previous.filter((t) => now - t < WINDOW_MS);

  if (withinWindow.length >= MAX_REQUESTS_PER_WINDOW) {
    recentRequests.set(ip, withinWindow);
    return false;
  }

  withinWindow.push(now);
  recentRequests.set(ip, withinWindow);
  return true;
}
