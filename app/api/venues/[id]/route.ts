import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { createServerClient } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(req);
  if (authResult.response) return authResult.response;

  const { id } = await params;
  const supabase = createServerClient();

  const { data: venue, error } = await supabase
    .from("venues")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error || !venue) {
    return NextResponse.json(
      { success: false, error: "Venue not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: venue });
}
