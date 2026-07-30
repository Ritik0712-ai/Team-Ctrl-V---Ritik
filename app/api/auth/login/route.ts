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

    // --- MOCK DATABASE BYPASS ---
    const MOCK_USERS = {
      "president@vit.ac.in": {
        id: "10000000-0000-0000-0000-000000000001",
        email: "president@vit.ac.in",
        name: "Demo President",
        role: "PRESIDENT",
        club_id: "20000000-0000-0000-0000-000000000001",
        club_name: "Tech Club",
        is_active: true
      },
      "vp@vit.ac.in": {
        id: "10000000-0000-0000-0000-000000000002",
        email: "vp@vit.ac.in",
        name: "Demo VP",
        role: "VICE_PRESIDENT",
        club_id: "20000000-0000-0000-0000-000000000001",
        club_name: "Tech Club",
        is_active: true
      },
      "fc@vit.ac.in": {
        id: "10000000-0000-0000-0000-000000000003",
        email: "fc@vit.ac.in",
        name: "Demo FC",
        role: "FACULTY_COORDINATOR",
        is_active: true
      },
      "dsw@vit.ac.in": {
        id: "10000000-0000-0000-0000-000000000004",
        email: "dsw@vit.ac.in",
        name: "Demo DSW",
        role: "DSW",
        is_active: true
      }
    };

    const userEmail = email.toLowerCase().trim();
    const user = MOCK_USERS[userEmail as keyof typeof MOCK_USERS];

    if (!user || password !== "reservex123") {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }
    // --- END MOCK ---

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "PRESIDENT" | "VICE_PRESIDENT" | "FACULTY_COORDINATOR" | "DSW",
      club_id: "club_id" in user ? user.club_id : undefined,
      club_name: "club_name" in user ? user.club_name : undefined,
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
