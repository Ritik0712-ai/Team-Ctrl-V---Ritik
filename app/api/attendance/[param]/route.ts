import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/db";
import { z } from "zod";

const QRCheckinSchema = z.object({
  token: z.string().min(1, "Token is required"),
  registration_number: z.string().min(1, "Registration number is required"),
  student_name: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ param: string }> }) {
  const { param } = await params;
  const supabase = createServerClient();

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
  const parsed = QRCheckinSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { token, registration_number, student_name } = parsed.data;

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

  const today = new Date().toISOString().split("T")[0];
  if (record.segment_date !== today) {
    return NextResponse.json(
      { success: false, error: "Attendance can only be recorded on the event date" },
      { status: 400 }
    );
  }

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

  return NextResponse.json({ success: true, message: "Attendance recorded successfully", data });
}
