import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/middleware";
import { createServerClient } from "@/lib/db";

export async function GET(req: NextRequest) {
  const authResult = await requireRole(req, ["DSW"]);
  if (authResult.response) return authResult.response;

  const supabase = createServerClient();
  const { searchParams } = req.nextUrl;
  const bookingId = searchParams.get("booking_id");

  // Get completed bookings with attendance records
  let query = supabase
    .from("bookings")
    .select(`
      id, event_title, event_description,
      created_at, completed_at,
      user:users!bookings_user_id_fkey(name, club_name),
      booking_segments(segment_date),
      attendance_records(registration_number, student_name, status)
    `)
    .eq("status", "COMPLETED")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false });

  if (bookingId) {
    query = query.eq("id", bookingId);
  }

  const { data: bookings, error } = await query;

  if (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch OD data" },
      { status: 500 }
    );
  }

  // Process into OD records
  const odRecords = bookings?.map((booking: any) => {
    const totalAttendees = booking.attendance_records?.length ?? 0;
    const present = booking.attendance_records?.filter(
      (r: { status: string }) => r.status === "PRESENT"
    ).length ?? 0;
    const absent = booking.attendance_records?.filter(
      (r: { status: string }) => r.status === "ABSENT"
    ).length ?? 0;
    const excused = booking.attendance_records?.filter(
      (r: { status: string }) => r.status === "EXCUSED"
    ).length ?? 0;

    const organizer = Array.isArray(booking.user) ? booking.user[0] : booking.user;

    return {
      booking_id: booking.id,
      event_title: booking.event_title,
      event_description: booking.event_description,
      organizer: organizer?.name ?? "Unknown",
      club: organizer?.club_name ?? "N/A",
      segment_dates: booking.booking_segments?.map(
        (s: { segment_date: string }) => s.segment_date
      ) ?? [],
      total_attendees: totalAttendees,
      present,
      absent,
      excused,
      od_eligible: totalAttendees > 0 && present / totalAttendees >= 0.75 ? "ELIGIBLE" : "NOT_ELIGIBLE",
      attendance_rate: totalAttendees > 0 ? Math.round((present / totalAttendees) * 100) : 0,
      completed_at: booking.completed_at,
      attendance_records: booking.attendance_records || [],
    };
  }) ?? [];

  return NextResponse.json({ success: true, data: odRecords });
}
