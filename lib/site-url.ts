export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[seal] No NEXT_PUBLIC_SITE_URL or VERCEL_URL set in production. Share links will use localhost; set NEXT_PUBLIC_SITE_URL on your host.",
    );
  }
  return "http://localhost:3000";
}
