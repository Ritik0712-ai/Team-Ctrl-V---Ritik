import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/middleware";
import { createServerClient } from "@/lib/db";

export async function GET(req: NextRequest) {
  const authResult = await requireRole(req, [
    "PRESIDENT",
    "VICE_PRESIDENT",
    "FACULTY_COORDINATOR",
    "DSW",
  ]);
  if (authResult.response) return authResult.response;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .order("name");

  if (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch equipment" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}
