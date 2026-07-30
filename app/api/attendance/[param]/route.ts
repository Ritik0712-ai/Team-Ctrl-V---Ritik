import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/db";
import { RecordAttendanceSchema } from "@/lib/schemas";

export async function GET(req: NextRequest, { params }: { params: Promise<{ param: string }> }) {
  const { param } = await params;
  const supabase = createServerClient();

  // Token-based: lookup by qr_token query param
  if (req.nextUrl.searchParams.get("token")) {
    const token = req.nextUrl.searchParams.get("token")!;
    const { data: record, error } = await supabase
      .from("attendance_records")
      .select(`
        *,
        booking:bookings(
          id, event_title, status, venue:venues(name, building),
          booking_segments(segment_date)
        )
      `)
      .eq("qr_token", token)
      .single();

    if (error || !record) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired QR code" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: record });
  }

  // BookingId-based: fetch booking info for public check-in page
  const { data: booking, error } = await supabase
    .from("bookings")
    .select(`
      id, event_title, status,
      venue:venues(name, building),
      booking_segments(segment_date, start_time, end_time)
    `)
    .eq("id", param)
    .single();

  if (error || !booking) {
    return NextResponse.json(
      { success: false, error: "Event not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, data: booking });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ param: string }> }) {
  const { param } = await params;
  const supabase = createServerClient();

  const body = await req.json();

  // Support both token-based (QR scan) and bookingId+segment_date based check-in
  if (body.token) {
    // Token-based: QR scan flow
    const parsed = RecordAttendanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { data: record, error: fetchError } = await supabase
      .from("attendance_records")
      .select(`*, booking:bookings(id, status)`)
      .eq("qr_token", body.token)
      .single();

    if (fetchError || !record) {
      return NextResponse.json(
        { success: false, error: "Invalid QR code" },
        { status: 404 }
      );
    }

    if (record.booking?.status !== "CONFIRMED") {
      return NextResponse.json(
        { success: false, error: "Event is not currently active" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("attendance_records")
      .update({
        status: "PRESENT",
        registration_number: parsed.data.registration_number,
        student_name: parsed.data.student_name ?? record.student_name,
        scanned_at: new Date().toISOString(),
      })
      .eq("id", record.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: "Failed to record attendance" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Attendance recorded successfully", data });
  }

  // BookingId-based: check in by booking_id + segment_date + registration_number
  const { booking_id, segment_date, registration_number, student_name } = body;

  if (!booking_id || !segment_date || !registration_number) {
    return NextResponse.json(
      { success: false, error: "booking_id, segment_date, and registration_number are required" },
      { status: 400 }
    );
  }

  // Verify booking is CONFIRMED
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, status, event_title")
    .eq("id", booking_id)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json(
      { success: false, error: "Event not found" },
      { status: 404 }
    );
  }

  if (booking.status !== "CONFIRMED") {
    return NextResponse.json(
      { success: false, error: "Event is not currently active" },
      { status: 400 }
    );
  }

  // Check if segment exists for this booking/date
  const { data: segment, error: segmentError } = await supabase
    .from("booking_segments")
    .select("id")
    .eq("booking_id", booking_id)
    .eq("segment_date", segment_date)
    .single();

  if (segmentError || !segment) {
    return NextResponse.json(
      { success: false, error: "No event scheduled for this date" },
      { status: 400 }
    );
  }

  // Upsert attendance record (idempotent)
  const { data: existing } = await supabase
    .from("attendance_records")
    .select("id")
    .eq("booking_id", booking_id)
    .eq("segment_date", segment_date)
    .eq("registration_number", registration_number)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from("attendance_records")
      .update({
        status: "PRESENT",
        student_name: student_name ?? "Unknown",
        scanned_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: "Failed to update attendance" }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: "Attendance recorded successfully", data });
  }

  // Create new record
  const { data, error } = await supabase
    .from("attendance_records")
    .insert({
      booking_id,
      segment_date,
      registration_number,
      student_name: student_name ?? "Unknown",
      status: "PRESENT",
      scanned_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: "Failed to record attendance" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, message: "Attendance recorded successfully", data });
}
