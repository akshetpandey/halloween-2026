export function cameraDiscoveryEnabled(
  env: Pick<Env, "PREVIEW" | "CAMERA_DISCOVERY">,
) {
  return env.PREVIEW === "true" || env.CAMERA_DISCOVERY === "true";
}

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
