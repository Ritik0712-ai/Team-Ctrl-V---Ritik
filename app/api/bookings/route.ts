import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/middleware";
import { createServerClient } from "@/lib/db";
import { CreateBookingSchema } from "@/lib/schemas";
import { sendBookingNotificationEmail } from "@/lib/email";
import type { Booking, BookingSegment } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authResult = await requireRole(req, [
    "PRESIDENT",
    "VICE_PRESIDENT",
    "FACULTY_COORDINATOR",
    "DSW",
  ]);
  if (authResult.response) return authResult.response;

  const supabase = createServerClient();
  const { user } = authResult;
  const { searchParams } = req.nextUrl;

  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("page_size") ?? "20");
  const offset = (page - 1) * pageSize;

  // Presidents/VP see only their own bookings
  // FC and DSW see all bookings
  let query = supabase
    .from("bookings")
    .select(
      `*, venue:venues(*), user:users!bookings_user_id_fkey(id, name, role, club_name)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (user.role === "PRESIDENT" || user.role === "VICE_PRESIDENT") {
    query = query.eq("user_id", user.id);
  }

  const { data: bookings, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: bookings ?? [],
    total: count ?? 0,
    page,
    page_size: pageSize,
    total_pages: Math.ceil((count ?? 0) / pageSize),
  });
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireRole(req, ["PRESIDENT", "VICE_PRESIDENT"]);
    if (authResult.response) return authResult.response;
    console.log("DEBUG: auth passed, user:", authResult.user.id);

    const { user } = authResult;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }
    console.log("DEBUG: body parsed:", JSON.stringify(body));

    const parsed = CreateBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 422 });
    }
    console.log("DEBUG: schema parsed OK");

    const data = parsed.data;
    const supabase = createServerClient();

    const { data: venue, error: venueError } = await supabase
      .from("venues").select("id, name, capacity").eq("id", data.venue_id).single();

    console.log("DEBUG: venue query result:", JSON.stringify(venue), "error:", JSON.stringify(venueError));
    if (venueError || !venue) {
      return NextResponse.json({ success: false, error: "Venue not found" }, { status: 404 });
    }

    // Compute overall start/end from segments
    const sorted = [...data.segments].sort((a, b) => a.date.localeCompare(b.date));
    const overallStart = `${sorted[0].date}T${sorted[0].start_time}:00`;
    const lastSeg = sorted[sorted.length - 1];
    const overallEnd = `${lastSeg.date}T${lastSeg.end_time}:00`;

    console.log("DEBUG: creating booking...");
    const { data: booking, error: bookingError } = await supabase
      .from("bookings").insert({
        user_id: user.id,
        club_id: user.club_id ?? null,
        venue_id: data.venue_id,
        event_title: data.event_title,
        event_description: data.event_description,
        expected_attendees: data.expected_attendees,
        equipment_requests: [], // Kept for DB legacy constraint
        equipment_requests_json: data.equipment_requests, // New JSONB column
        status: "PENDING_FC",
        start_time: overallStart,
        end_time: overallEnd,
      }).select().single();

    if (!bookingError && data.equipment_requests.length > 0) {
      // Deduct available quantity for known equipment
      for (const eq of data.equipment_requests) {
        if (eq.id) {
          const { data: eqData } = await supabase.from("equipment").select("available_quantity").eq("id", eq.id).single();
          if (eqData) {
            const newQty = Math.max(0, eqData.available_quantity - eq.quantity);
            await supabase.from("equipment").update({ available_quantity: newQty }).eq("id", eq.id);
          }
        }
      }
    }

    console.log("DEBUG: booking result:", JSON.stringify(booking), "error:", JSON.stringify(bookingError));
    if (bookingError) {
      console.error("Booking creation error:", bookingError);
      return NextResponse.json({ success: false, error: "Failed to create booking: " + bookingError.message }, { status: 500 });
    }

    console.log("DEBUG: inserting segments...");
    const segmentInserts = data.segments.map((seg) => ({
      booking_id: booking.id,
      segment_date: seg.date,
      start_time: seg.start_time,
      end_time: seg.end_time,
      is_confirmed: false,
    }));
    console.log("DEBUG: segments:", JSON.stringify(segmentInserts));

    const { error: segmentsError } = await supabase.from("booking_segments").insert(segmentInserts);
    console.log("DEBUG: segments result, error:", JSON.stringify(segmentsError));
    if (segmentsError) {
      await supabase.from("bookings").delete().eq("id", booking.id);
      return NextResponse.json({ success: false, error: "Failed to create booking segments: " + segmentsError.message }, { status: 500 });
    }

    // Send email notification asynchronously (don't await it to avoid blocking the user)
    sendBookingNotificationEmail({
      eventTitle: data.event_title,
      clubName: user.club_name ?? "A Club",
      venueName: venue.name,
      date: sorted.map(s => s.date).join(", "),
      timeRange: `${sorted[0].start_time} - ${sorted[0].end_time}`
    }).catch(console.error);

    return NextResponse.json({ success: true, data: booking, message: "Booking request submitted for approval" }, { status: 201 });
  } catch (err) {
    console.error("POST /api/bookings unhandled error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
