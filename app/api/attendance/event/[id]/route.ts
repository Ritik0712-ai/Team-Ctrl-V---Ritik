import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(`
      id, event_title, status,
      venue:venues(name, building),
      booking_segments(segment_date, start_time, end_time)
    `)
    .eq("id", id)
    .single();

  if (error || !booking) {
    return NextResponse.json(
      { success: false, error: "Event not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: booking });
}
