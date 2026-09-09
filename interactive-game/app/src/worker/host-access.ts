import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { fail, hash } from "./request";
const publicKeys = new Map<string, JWTVerifyGetKey>();
export async function verifyHostToken(
  token: string,
  env: Env,
  keys?: JWTVerifyGetKey,
) {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || !env.HOST_EMAIL)
    fail("Host sign-in has not been configured.", 503);
  const issuer = env.ACCESS_TEAM_DOMAIN.replace(/\/$/, "");
  if (!keys) {
    if (!publicKeys.has(issuer))
      publicKeys.set(
        issuer,
        createRemoteJWKSet(new URL(issuer + "/cdn-cgi/access/certs")),
      );
    keys = publicKeys.get(issuer)!;
  }
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer,
      audience: env.ACCESS_AUD,
      algorithms: ["RS256"],
      requiredClaims: ["exp", "iat", "sub", "email"],
    });
    if (
      typeof payload.email !== "string" ||
      payload.email.toLowerCase() !== env.HOST_EMAIL.toLowerCase() ||
      payload.type !== "app"
    )
      fail("This email does not have host access.", 403);
    return await hash(String(payload.sub));
  } catch (e) {
    if (e instanceof Response) throw e;
    fail("Host sign-in required.", 401);
  }
}
export async function requireHost(request: Request, env: Env) {
  // Verify a signed Access JWT, never trust an email header or preview mode.
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) fail("Host sign-in required.", 401);
  return verifyHostToken(token, env);
}
