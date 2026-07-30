import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/db/supabase";
import { requireAuth } from "@/lib/auth/middleware";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult.response) return authResult.response;

    const user = authResult.user!;
    const supabase = createServerClient();

    let stats = {};

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    // To calculate week start (Sunday)
    const firstDayOfWeek = new Date(now);
    firstDayOfWeek.setDate(now.getDate() - now.getDay());
    firstDayOfWeek.setHours(0, 0, 0, 0);
    const weekStartIso = firstDayOfWeek.toISOString();

    const todayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    if (user.role === "PRESIDENT" || user.role === "VICE_PRESIDENT") {
      // Fetch all bookings for this user to calculate stats
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("id, status, created_at")
        .eq("user_id", user.id);

      if (error) throw error;

      const total = bookings.length;
      const pending = bookings.filter(b => b.status === "PENDING_FC" || b.status === "PENDING_DSW").length;
      const confirmed = bookings.filter(b => b.status === "CONFIRMED").length;
      const thisMonth = bookings.filter(b => b.created_at >= firstDayOfMonth).length;

      stats = { total, pending, confirmed, thisMonth };

    } else if (user.role === "FACULTY_COORDINATOR") {
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("id, status, created_at")
        .eq("club_id", user.club_id);

      if (error) throw error;

      const pendingReview = bookings.filter(b => b.status === "PENDING_FC").length;
      
      // Approved by FC implies it is now PENDING_DSW or CONFIRMED
      const approved = bookings.filter(b => b.status === "PENDING_DSW" || b.status === "CONFIRMED").length;
      const thisWeek = bookings.filter(b => b.created_at >= weekStartIso).length;

      stats = { pendingReview, approved, thisWeek };

    } else if (user.role === "DSW") {
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("id, status, created_at");

      if (error) throw error;

      const pendingDSW = bookings.filter(b => b.status === "PENDING_DSW").length;
      const confirmed = bookings.filter(b => b.status === "CONFIRMED").length;
      
      // Since we don't have a reliable updated_at or status_history right now,
      // we'll approximate active events as bookings created this month for now.
      const activeEvents = bookings.filter(b => b.status === "CONFIRMED" && b.created_at >= firstDayOfMonth).length;
      const totalEvents = confirmed; 

      stats = { pendingDSW, confirmed, activeEvents, totalEvents };
    }

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
