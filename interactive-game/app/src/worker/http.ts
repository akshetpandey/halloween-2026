const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
// Vite emits an eight-character content hash in these public asset filenames.
const HASHED_ASSET =
  /^\/assets\/[^/]+-[\w-]{8}\.(?:js|css|webp|png|jpe?g|gif|svg|avif|ico|woff2?|ttf|otf)$/i;

export function httpsRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  if (url.protocol !== "http:" || LOOPBACK_HOSTS.has(url.hostname)) return null;
  url.protocol = "https:";
  // 308 preserves the method and body, including for API requests.
  return new Response(null, { status: 308, headers: { Location: url.href } });
}

export function responseHeaders(
  request: Request,
  response: Response,
): Response {
  // Keep the body streaming and preserve cookies, validators and range headers.
  const result = new Response(response.body, response);
  const headers = result.headers;
  const url = new URL(request.url);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "same-origin");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=(), payment=(), usb=()",
  );
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  );
  if (url.protocol === "https:" && !LOOPBACK_HOSTS.has(url.hostname)) {
    // Host-only: future subdomains are not committed to HSTS or preload.
    headers.set("Strict-Transport-Security", "max-age=31536000");
  }

  const type = headers.get("Content-Type")?.split(";")[0].trim().toLowerCase();
  const privateResponse =
    url.pathname.startsWith("/api/") || headers.has("Set-Cookie");
  if (privateResponse) {
    headers.set("Cache-Control", "private, no-store");
  } else if (
    !["GET", "HEAD"].includes(request.method) ||
    (!response.ok && response.status !== 304) ||
    !type ||
    type === "text/html" ||
    type === "application/xhtml+xml"
  ) {
    // A missing asset can resolve to SPA HTML, even at a hash-shaped URL.
    // A 304 without a content type is also kept conservative.
    headers.set("Cache-Control", "no-store");
  } else if (HASHED_ASSET.test(url.pathname)) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    headers.set("Cache-Control", "no-cache");
  }
  return result;
}
