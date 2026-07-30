import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/db";

// Public endpoint — QR scan from attendance page
// No auth required (students scan QR codes at the event)
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServerClient();

  const { data: record, error } = await supabase
    .from("attendance_records")
    .select(`
      *,
      booking:bookings(
        id, event_title, venue:venues(name, building),
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

// Public endpoint — record attendance via QR scan
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServerClient();

  const body = await req.json();
  const { registration_number, student_name } = body;

  if (!registration_number) {
    return NextResponse.json(
      { success: false, error: "Registration number is required" },
      { status: 400 }
    );
  }

  const { data: record, error: fetchError } = await supabase
    .from("attendance_records")
    .select(`*, booking:bookings(id, status)`)
    .eq("qr_token", token)
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

  // Check date validity
  const today = new Date().toISOString().split("T")[0];
  if (record.segment_date !== today) {
    return NextResponse.json(
      { success: false, error: "Attendance can only be recorded on the event date" },
      { status: 400 }
    );
  }

  // Idempotent update
  const { data, error } = await supabase
    .from("attendance_records")
    .update({
      status: "PRESENT",
      registration_number,
      student_name: student_name ?? record.student_name,
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

  return NextResponse.json({
    success: true,
    message: "Attendance recorded successfully",
    data,
  });
}
