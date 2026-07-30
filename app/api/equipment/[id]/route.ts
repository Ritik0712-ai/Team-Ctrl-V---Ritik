import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/middleware";
import { createServerClient } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireRole(req, ["DSW"]);
  if (authResult.response) return authResult.response;

  const supabase = createServerClient();
  const id = params.id;

  try {
    const body = await req.json();
    const { total_quantity } = body;

    if (typeof total_quantity !== "number" || total_quantity < 0) {
      return NextResponse.json({ success: false, error: "Invalid total quantity" }, { status: 400 });
    }

    // Get current equipment to calculate difference
    const { data: eq } = await supabase.from("equipment").select("total_quantity, available_quantity").eq("id", id).single();
    if (!eq) return NextResponse.json({ success: false, error: "Equipment not found" }, { status: 404 });

    const diff = total_quantity - eq.total_quantity;
    const newAvailable = Math.max(0, eq.available_quantity + diff);

    const { data, error } = await supabase
      .from("equipment")
      .update({ total_quantity, available_quantity: newAvailable })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Failed to update equipment:", err);
    return NextResponse.json({ success: false, error: "Failed to update equipment" }, { status: 500 });
  }
}
