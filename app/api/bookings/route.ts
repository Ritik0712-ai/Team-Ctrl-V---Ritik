import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/middleware";
import { createServerClient } from "@/lib/db";
import { CreateBookingSchema } from "@/lib/schemas";
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
      `*, venue:venues(*), user:users(id, name, role, club_name)`,
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
  // Only Presidents and VPs can create bookings
  const authResult = await requireRole(req, ["PRESIDENT", "VICE_PRESIDENT"]);
  if (authResult.response) return authResult.response;

  const { user } = authResult;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = CreateBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  const data = parsed.data;
  const supabase = createServerClient();

  // Validate venue exists and is active
  const { data: venue, error: venueError } = await supabase
    .from("venues")
    .select("id, name, capacity")
    .eq("id", data.venue_id)
    .eq("is_active", true)
    .single();

  if (venueError || !venue) {
    return NextResponse.json(
      { success: false, error: "Venue not found or inactive" },
      { status: 404 }
    );
  }

  // Validate capacity
  if (data.expected_attendees > venue.capacity) {
    return NextResponse.json(
      {
        success: false,
        error: `Venue capacity (${venue.capacity}) is less than expected attendees (${data.expected_attendees})`,
      },
      { status: 422 }
    );
  }

  // Check for conflicts in each segment (UX-only, PostgreSQL is authoritative)
  const conflictSegments = [];
  for (const segment of data.segments) {
    const { data: conflicts } = await supabase
      .from("booking_segments")
      .select(`*, booking:bookings(id, venue_id, event_title, status)`)
      .eq("segment_date", segment.date)
      .eq("is_confirmed", true)
      .or(
        `and(start_time.lt.${segment.end_time},end_time.gt.${segment.start_time})`
      );

    const venueConflicts = (conflicts ?? []).filter(
      (c: { booking?: { venue_id?: string } }) => c.booking?.venue_id === data.venue_id
    );

    if (venueConflicts.length > 0) {
      conflictSegments.push({
        date: segment.date,
        conflicts: venueConflicts,
      });
    }
  }

  if (conflictSegments.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: "Booking conflict detected",
        conflicts: conflictSegments,
      },
      { status: 409 }
    );
  }

  // Calculate the overall start/end from segments
  const sortedSegments = [...data.segments].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const overallStart = `${sortedSegments[0].date}T${sortedSegments[0].start_time}:00`;
  const lastSegment = sortedSegments[sortedSegments.length - 1];
  const overallEnd = `${lastSegment.date}T${lastSegment.end_time}:00`;

  // Create booking + segments in a transaction
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      user_id: user.id,
      venue_id: data.venue_id,
      event_title: data.event_title,
      event_description: data.event_description,
      expected_attendees: data.expected_attendees,
      equipment_requests: data.equipment_requests,
      status: "PENDING_FC",
      // computed fields
    })
    .select()
    .single();

  if (bookingError) {
    // If it's a constraint error, it's a race condition — report conflict
    if (bookingError.code === "23P01") {
      return NextResponse.json(
        { success: false, error: "Booking conflict: venue is already reserved for this time slot" },
        { status: 409 }
      );
    }
    console.error("Booking creation error:", bookingError);
    return NextResponse.json(
      { success: false, error: "Failed to create booking" },
      { status: 500 }
    );
  }

  // Insert segments
  const segmentInserts = data.segments.map((seg) => ({
    booking_id: booking.id,
    segment_date: seg.date,
    start_time: seg.start_time,
    end_time: seg.end_time,
    is_confirmed: false,
  }));

  const { error: segmentsError } = await supabase
    .from("booking_segments")
    .insert(segmentInserts);

  if (segmentsError) {
    // Rollback booking if segments fail
    await supabase.from("bookings").delete().eq("id", booking.id);
    if (segmentsError.code === "23P01") {
      return NextResponse.json(
        { success: false, error: "Booking conflict: venue is already reserved for this time slot" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to create booking segments" },
      { status: 500 }
    );
  }

  // Audit log
  await supabase.from("audit_log").insert({
    booking_id: booking.id,
    user_id: user.id,
    action: "BOOKING_CREATED",
    details: { event_title: data.event_title, venue_id: data.venue_id },
  });

  // Notification to FC (find first FC)
  const { data: fcs } = await supabase
    .from("users")
    .select("id")
    .eq("role", "FACULTY_COORDINATOR")
    .limit(1);

  if (fcs && fcs.length > 0) {
    await supabase.from("notifications").insert({
      user_id: fcs[0].id,
      title: "New Booking Request",
      message: `${user.name} submitted a venue booking request: "${data.event_title}"`,
      link: `/dashboard/approvals`,
    });
  }

  return NextResponse.json(
    {
      success: true,
      data: booking,
      message: "Booking request submitted for approval",
    },
    { status: 201 }
  );
}
