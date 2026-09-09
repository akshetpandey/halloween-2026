// Uppercase URLs use QR alphanumeric encoding. Only our two case-insensitive
// public routes are transformed; legacy case-sensitive invitation tokens survive.
export function qrPayload(value: string) {
  const url = new URL(value);
  if (url.origin !== "https://hollow-court.com" || url.search || url.hash)
    return value;
  if (/^\/r$/i.test(url.pathname)) return "HTTPS://HOLLOW-COURT.COM/R";
  if (/^\/s\/[A-Z2-7]{12}$/.test(url.pathname))
    return "HTTPS://HOLLOW-COURT.COM" + url.pathname.replace("/s/", "/S/");
  return value;
}

export function shortInviteCode() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  return Array.from(
    crypto.getRandomValues(new Uint8Array(12)),
    (b) => alphabet[b & 31],
  ).join("");
}
