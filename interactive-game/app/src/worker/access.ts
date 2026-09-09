export function previewEnabled(
  url: string,
  enabled: string,
  previewHost: string,
) {
  const { hostname, protocol } = new URL(url);
  const local =
    protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
  return enabled === "true" && (hostname === previewHost || local);
}
