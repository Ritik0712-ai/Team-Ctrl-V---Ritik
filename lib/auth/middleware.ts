import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "./jwt";
import type { SessionUser } from "@/lib/types";

export const AUTH_COOKIE = "reservex_session";

export async function getSessionFromRequest(
  req: NextRequest
): Promise<SessionUser | null> {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function requireAuth(req: NextRequest): Promise<{
  user: SessionUser;
  response: null;
} | {
  user: null;
  response: NextResponse;
}> {
  const user = await getSessionFromRequest(req);
  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }
  return { user, response: null };
}

export async function requireRole(
  req: NextRequest,
  allowedRoles: string[]
): Promise<{
  user: SessionUser;
  response: null;
} | {
  user: null;
  response: NextResponse;
}> {
  const result = await requireAuth(req);
  if (result.response) return result;

  if (!allowedRoles.includes(result.user.role)) {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, error: "Forbidden: insufficient permissions" },
        { status: 403 }
      ),
    };
  }

  return result;
}

export function createAuthResponse(
  token: string,
  user: SessionUser,
  redirectTo?: string
): NextResponse {
  const response = NextResponse.json({ success: true, user, redirect: redirectTo });

  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60, // 8 hours
    path: "/",
  });

  return response;
}

export function clearAuthResponse(redirectTo = "/login"): NextResponse {
  const response = NextResponse.redirect(
    new URL(redirectTo, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
  );
  response.cookies.delete(AUTH_COOKIE);
  return response;
}
