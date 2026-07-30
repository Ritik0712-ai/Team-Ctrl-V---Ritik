import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/db/supabase";
import { requireAuth } from "@/lib/auth/middleware";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult.response) return authResult.response;

    const payload = await req.json();
    if (!payload.segments || !Array.isArray(payload.segments) || payload.segments.length === 0) {
      return NextResponse.json({ success: false, error: "Segments are required" }, { status: 400 });
    }

    const segments: { date: string; start_time: string; end_time: string }[] = payload.segments;
    const dates = segments.map((s) => s.date);

    const supabase = createServerClient();

    // 1. Fetch all active venues
    const { data: venues, error: venuesError } = await supabase
      .from("venues")
      .select("*")
      .order("name", { ascending: true });

    if (venuesError) {
      return NextResponse.json({ success: false, error: venuesError.message }, { status: 500 });
    }

    // 2. Fetch all booking segments on the requested dates for active bookings
    const { data: activeSegments, error: segmentsError } = await supabase
      .from("booking_segments")
      .select(`
        segment_date,
        start_time,
        end_time,
        bookings!inner ( venue_id, status )
      `)
      .in("segment_date", dates)
      .neq("bookings.status", "REJECTED")
      .neq("bookings.status", "CANCELLED");

    if (segmentsError) {
      return NextResponse.json({ success: false, error: segmentsError.message }, { status: 500 });
    }

    // 3. Evaluate availability for each venue
    const availabilityMap = new Map<string, boolean>();

    for (const venue of venues) {
      let isAvailable = true;

      // Find if any active segment for THIS venue overlaps with ANY requested segment
      const venueSegments = activeSegments.filter((s: any) => s.bookings.venue_id === venue.id);

      for (const reqSeg of segments) {
        const overlaps = venueSegments.some((vs: any) => {
          if (vs.segment_date !== reqSeg.date) return false;
          // Time overlap logic: StartA < EndB and EndA > StartB
          return vs.start_time < reqSeg.end_time && vs.end_time > reqSeg.start_time;
        });

        if (overlaps) {
          isAvailable = false;
          break; // Venue is occupied
        }
      }

      availabilityMap.set(venue.id, isAvailable);
    }

    // 4. Return venues with is_available boolean
    const venuesWithAvailability = venues.map((v) => ({
      ...v,
      is_available: availabilityMap.get(v.id),
    }));

    venuesWithAvailability.sort((a, b) => {
      if (a.is_available === b.is_available) return a.name.localeCompare(b.name);
      return a.is_available ? -1 : 1;
    });

    return NextResponse.json({ success: true, data: venuesWithAvailability });
  } catch (error) {
    console.error("Error checking venue availability:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
