export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/middleware";
import { createServerClient } from "@/lib/db";
import type { Booking } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authResult = await requireRole(req, [
    "FACULTY_COORDINATOR",
    "DSW",
  ]);
  if (authResult.response) return authResult.response;

  const { user } = authResult;
  const supabase = createServerClient();

  let query = supabase
    .from("bookings")
    .select(
      `*, venue:venues(*), user:users!bookings_user_id_fkey(id, name, role, club_name, club_id), booking_segments(*)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (user.role === "FACULTY_COORDINATOR") {
    // FC only sees bookings from their own club
    query = query.eq("status", "PENDING_FC");
    if (user.club_id) {
      query = query.eq("club_id", user.club_id);
    } else {
      // FC with no club_id assigned — show nothing (they have no club to manage)
      return NextResponse.json({ success: true, data: [], total: 0 });
    }
  } else if (user.role === "DSW") {
    // DSW sees ALL PENDING_DSW bookings — no club filter
    query = query.eq("status", "PENDING_DSW");
  }

  const { data: bookings, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch approvals" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: bookings ?? [],
    total: count ?? 0,
  });
}
