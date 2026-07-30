import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/db";

// Public endpoint — no auth required (students scan QR codes at event)
export async function POST(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const supabase = createServerClient();

  const body = await req.json();
  const { registration_number, student_name, date } = body;

  if (!registration_number?.trim()) {
    return NextResponse.json(
      { success: false, error: "Registration number is required" },
      { status: 400 }
    );
  }

  // Verify booking exists and is CONFIRMED
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("id", bookingId)
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

  // Verify date is valid (matching a segment)
  const { data: segment } = await supabase
    .from("booking_segments")
    .select("id, segment_date")
    .eq("booking_id", bookingId)
    .eq("segment_date", date)
    .single();

  if (!segment) {
    return NextResponse.json(
      { success: false, error: "No event scheduled for this date" },
      { status: 400 }
    );
  }

  // Check if already recorded (idempotent)
  const { data: existing } = await supabase
    .from("attendance_records")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("segment_date", date)
    .eq("registration_number", registration_number.trim().toUpperCase())
    .single();

  if (existing) {
    return NextResponse.json({
      success: true,
      message: "Attendance already recorded",
      data: { id: existing.id },
    });
  }

  // Record attendance
  const { data: record, error: insertError } = await supabase
    .from("attendance_records")
    .insert({
      booking_id: bookingId,
      segment_date: date,
      registration_number: registration_number.trim().toUpperCase(),
      student_name: student_name?.trim() ?? null,
      status: "PRESENT",
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { success: false, error: "Failed to record attendance" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Attendance recorded successfully",
    data: record,
  });
}
