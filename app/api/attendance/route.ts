import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/middleware";
import { createServerClient } from "@/lib/db";
import { RecordAttendanceSchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  const authResult = await requireRole(req, [
    "PRESIDENT",
    "VICE_PRESIDENT",
    "FACULTY_COORDINATOR",
    "DSW",
  ]);
  if (authResult.response) return authResult.response;

  const supabase = createServerClient();
  const { searchParams } = req.nextUrl;
  const bookingId = searchParams.get("booking_id");

  let query = supabase
    .from("attendance_records")
    .select(`*, booking:bookings(id, event_title)`);

  if (bookingId) {
    query = query.eq("booking_id", bookingId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch attendance records" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const authResult = await requireRole(req, [
    "PRESIDENT",
    "VICE_PRESIDENT",
    "FACULTY_COORDINATOR",
    "DSW",
  ]);
  if (authResult.response) return authResult.response;

  const body = await req.json();
  const parsed = RecordAttendanceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid data" },
      { status: 422 }
    );
  }

  const supabase = createServerClient();
  const { booking_id, segment_date, registration_number, student_name, status } = parsed.data;

  // Check if already recorded (idempotent)
  const { data: existing } = await supabase
    .from("attendance_records")
    .select("id, status")
    .eq("booking_id", booking_id)
    .eq("segment_date", segment_date)
    .eq("registration_number", registration_number)
    .single();

  if (existing) {
    // Update existing record
    const { error } = await supabase
      .from("attendance_records")
      .update({
        status,
        student_name: student_name ?? existing.status,
        scanned_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      return NextResponse.json(
        { success: false, error: "Failed to update attendance" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Attendance updated",
      data: { id: existing.id, status },
    });
  }

  // Create new attendance record
  const { data, error } = await supabase
    .from("attendance_records")
    .insert({
      booking_id,
      segment_date,
      registration_number,
      student_name,
      status,
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

  return NextResponse.json(
    { success: true, message: "Attendance recorded", data },
    { status: 201 }
  );
}
