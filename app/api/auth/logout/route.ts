import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth/middleware";

export async function POST(req: NextRequest) {
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(AUTH_COOKIE);
  return response;
}

export async function GET(req: NextRequest) {
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(AUTH_COOKIE);
  return response;
}
