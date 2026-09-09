import { it, expect } from "vitest";
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from "jose";
import { verifyHostToken, requireHost } from "../src/worker/host-access";
import { recoveryPhrase, normalizePhrase } from "../src/worker/admin";
const env = {
  ACCESS_TEAM_DOMAIN: "https://test.cloudflareaccess.com",
  ACCESS_AUD: "test-app",
  HOST_EMAIL: "host@example.test",
} as Env;
it("verifies Access signatures, application audience, issuer, expiry and allowed email", async () => {
  const pair = await generateKeyPair("RS256"),
    other = await generateKeyPair("RS256");
  const jwk = await exportJWK(pair.publicKey);
  jwk.kid = "test";
  const keys = createLocalJWKSet({ keys: [jwk] });
  const sign = (changes: Record<string, unknown> = {}, wrongKey = false) =>
    new SignJWT({
      email: env.HOST_EMAIL,
      type: "app",
      sub: "host-sub",
      iss: env.ACCESS_TEAM_DOMAIN,
      aud: env.ACCESS_AUD,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 600,
      ...changes,
    })
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .sign(wrongKey ? other.privateKey : pair.privateKey);
  expect(await verifyHostToken(await sign(), env, keys)).toMatch(
    /^[a-f0-9]{64}$/,
  );
  for (const change of [
    { email: "stranger@example.test" },
    { aud: "other-app" },
    { iss: "https://evil.example" },
    { exp: 1 },
    { type: "org" },
    { email: null },
    { exp: null },
  ]) {
    await expect(
      verifyHostToken(await sign(change), env, keys),
    ).rejects.toBeInstanceOf(Response);
  }
  await expect(
    verifyHostToken(await sign({}, true), env, keys),
  ).rejects.toBeInstanceOf(Response);
  await expect(
    requireHost(
      new Request("https://hollow-court.com/api/admin/guests", {
        headers: { "Cf-Access-Authenticated-User-Email": env.HOST_EMAIL },
      }),
      env,
    ),
  ).rejects.toBeInstanceOf(Response);
});
it("generates three speakable words and normalizes casing and separators", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 1000; i++) {
    const p = recoveryPhrase();
    expect(p).toMatch(/^[a-z]+ [a-z]+ [a-z]+$/);
    seen.add(p);
    expect(normalizePhrase(p.toUpperCase().replaceAll(" ", "-"))).toBe(p);
  }
  expect(seen.size).toBe(1000);
});
