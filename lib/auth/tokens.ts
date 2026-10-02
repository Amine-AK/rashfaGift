import "server-only";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "../env";

export type Audience = "customer" | "staff" | "signup" | "scan";

const key = () => new TextEncoder().encode(env.sessionSecret());

export async function signToken(payload: JWTPayload, audience: Audience, expiresIn: string): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("rashfa")
    .setAudience(audience)
    .setExpirationTime(expiresIn)
    .sign(key());
}

export async function verifyToken<T extends JWTPayload>(token: string | undefined, audience: Audience): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { issuer: "rashfa", audience, algorithms: ["HS256"] });
    return payload as T;
  } catch {
    return null;
  }
}
