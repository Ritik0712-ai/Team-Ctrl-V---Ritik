import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/middleware";
import { createServerClient } from "@/lib/db";
import { VenueSearchSchema } from "@/lib/schemas";
import type { Venue } from "@/lib/types";

export async function GET(req: NextRequest) {
  // Allow any authenticated user to view venues
  const authResult = await requireRole(req, [
    "PRESIDENT",
    "VICE_PRESIDENT",
    "FACULTY_COORDINATOR",
    "DSW",
  ]);

  if (authResult.response) return authResult.response;

  const supabase = createServerClient();
  const { searchParams } = req.nextUrl;

  const parsed = VenueSearchSchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid search parameters" },
      { status: 400 }
    );
  }

  const filters = parsed.data;

  let query = supabase
    .from("venues")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (filters.venue_type) {
    query = query.eq("venue_type", filters.venue_type);
  }

  if (filters.building) {
    query = query.ilike("building", `%${filters.building}%`);
  }

  if (filters.min_capacity) {
    query = query.gte("capacity", filters.min_capacity);
  }

  if (filters.query) {
    query = query.or(`name.ilike.%${filters.query}%,building.ilike.%${filters.query}%`);
  }

  const { data: venues, error } = await query;

  if (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch venues" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: venues as Venue[] });
}
