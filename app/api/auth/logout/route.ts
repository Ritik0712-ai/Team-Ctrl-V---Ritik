import { NextRequest } from "next/server";
import { clearAuthResponse } from "@/lib/auth/middleware";

export async function POST(req: NextRequest) {
  return clearAuthResponse("/login");
}

export async function GET(req: NextRequest) {
  return clearAuthResponse("/login");
}
