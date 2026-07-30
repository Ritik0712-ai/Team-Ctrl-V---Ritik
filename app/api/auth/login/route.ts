import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServerClient } from "@/lib/db";
import { signSession } from "@/lib/auth/jwt";
import { AUTH_COOKIE, createAuthResponse } from "@/lib/auth/middleware";
import { LoginSchema } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password format" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const supabase = createServerClient();
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .ilike("email", email.trim())
      .single();

    if (userError || !user || password !== user.plaintext_password) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      club_id: user.club_id ?? undefined,
      club_name: user.club_name ?? undefined,
    };

    const token = await signSession(sessionUser);

    const redirectTo = req.nextUrl.searchParams.get("redirect") ?? getDashboardForRole(user.role);

    return createAuthResponse(token, sessionUser, redirectTo);
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

function getDashboardForRole(role: string): string {
  switch (role) {
    case "PRESIDENT":
    case "VICE_PRESIDENT":
      return "/dashboard";
    case "FACULTY_COORDINATOR":
      return "/dashboard/approvals";
    case "DSW":
      return "/dashboard/approvals";
    default:
      return "/dashboard";
  }
}
