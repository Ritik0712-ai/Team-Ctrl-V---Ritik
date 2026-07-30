import { SignJWT, jwtVerify } from "jose";
import type { SessionUser } from "@/lib/types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "reservex-dev-secret-change-in-production"
);

const JWT_EXPIRY = "8h";

export interface JWTPayload {
  user: SessionUser;
  iat?: number;
  exp?: number;
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.user) return null;
    return payload.user as SessionUser;
  } catch {
    return null;
  }
}

export function getTokenExpiry(): number {
  const expiresIn = 8 * 60 * 60; // 8 hours in seconds
  return Math.floor(Date.now() / 1000) + expiresIn;
}
