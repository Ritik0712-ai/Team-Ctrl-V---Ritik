export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth/middleware";
import { createServerClient } from "@/lib/db";
import { UpdateBookingSchema, FCApprovalSchema, DSWApprovalSchema } from "@/lib/schemas";
import type { Booking } from "@/lib/types";

async function restoreRequestedEquipment(supabase: any, current: any) {
  const reqs = current.equipment_requests_json;
  if (reqs && Array.isArray(reqs)) {
    for (const eq of reqs) {
      if (eq.id) {
        const { data: eqData } = await supabase.from("equipment").select("available_quantity").eq("id", eq.id).single();
        if (eqData) {
          await supabase.from("equipment").update({ available_quantity: eqData.available_quantity + eq.quantity }).eq("id", eq.id);
        }
      }
    }
  }
}


export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(req);
  if (authResult.response) return authResult.response;

  const { id } = await params;
  const supabase = createServerClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(`
      *,
      venue:venues(*),
      user:users!bookings_user_id_fkey(id, name, role, club_name),
      booking_segments(*),
      equipment_allocations(*, equipment:equipment(*))
    `)
    .eq("id", id)
    .single();

  if (error || !booking) {
    return NextResponse.json(
      { success: false, error: "Booking not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: booking });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(req);
  if (authResult.response) return authResult.response;

  const { id } = await params;
  const { user } = authResult;
  console.log("DEBUG PATCH /bookings/[id]:", { id, userRole: user.role });

  const body = await req.json();
  console.log("DEBUG PATCH body:", JSON.stringify(body));

  const supabase = createServerClient();

  // Fetch current booking
  const { data: current, error: fetchError } = await supabase
    .from("bookings")
    .select("*, booking_segments(*)")
    .eq("id", id)
    .single();

  console.log("DEBUG booking fetch:", { bookingId: current?.id, status: current?.status, error: fetchError });

  if (fetchError || !current) {
    return NextResponse.json(
      { success: false, error: "Booking not found" },
      { status: 404 }
    );
  }

  const action = body.action;

  // === FACULTY COORDINATOR APPROVAL ===
  if (action === "FC_APPROVE" || action === "FC_REJECT") {
    console.log("DEBUG: entering FC approval block");
    const fcAuth = await requireRole(req, ["FACULTY_COORDINATOR"]);
    if (fcAuth.response) {
      console.log("DEBUG: FC auth failed", fcAuth.response);
      return fcAuth.response;
    }

    const parsed = FCApprovalSchema.safeParse(body);
    if (!parsed.success) {
      console.log("DEBUG: FC schema parse failed", parsed.error.flatten());
      return NextResponse.json(
        { success: false, error: "Invalid approval data" },
        { status: 422 }
      );
    }

    if (current.status !== "PENDING_FC") {
      console.log("DEBUG: wrong status, current:", current.status);
      return NextResponse.json(
        { success: false, error: `Booking is not pending FC approval (current: ${current.status})` },
        { status: 409 }
      );
    }

    const { decision, rejection_reason } = parsed.data;
    const newStatus = decision === "APPROVE" ? "PENDING_DSW" : "REJECTED";
    console.log("DEBUG: FC updating status to", newStatus);

    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        status: newStatus,
        rejection_reason: decision === "REJECT" ? rejection_reason : null,
        fc_approved_at: decision === "APPROVE" ? new Date().toISOString() : null,
        fc_approved_by: decision === "APPROVE" ? user.id : null,
      })
      .eq("id", id);

    console.log("DEBUG: FC update result, error:", updateError);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: "Failed to update booking" },
        { status: 500 }
      );
    }

    if (decision === "REJECT") {
      await restoreRequestedEquipment(supabase, current);
    }

    // Notify requester (non-blocking)
    supabase.from("notifications").insert({
      user_id: current.user_id,
      title: decision === "APPROVE" ? "FC Approved — Pending DSW" : "Booking Rejected",
      message: decision === "APPROVE"
        ? `Your booking "${current.event_title}" has been approved by the Faculty Coordinator and is now pending DSW approval.`
        : `Your booking "${current.event_title}" has been rejected. Reason: ${rejection_reason ?? "Not provided"}`,
      link: `/dashboard/bookings/${id}`,
    }).then(() => {});

    // Audit (non-blocking)
    supabase.from("audit_log").insert({
      booking_id: id,
      user_id: user.id,
      action: decision === "APPROVE" ? "FC_APPROVED" : "FC_REJECTED",
      details: { rejection_reason },
    }).then(() => {});

    console.log("DEBUG: FC approval done, returning success");
    return NextResponse.json({
      success: true,
      message: decision === "APPROVE" ? "Booking approved, forwarded to DSW" : "Booking rejected",
    });
  }

  // === DSW APPROVAL ===
  if (action === "DSW_APPROVE" || action === "DSW_REJECT") {
    const dswAuth = await requireRole(req, ["DSW"]);
    if (dswAuth.response) return dswAuth.response;

    const parsed = DSWApprovalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid approval data", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    if (current.status !== "PENDING_DSW") {
      return NextResponse.json(
        { success: false, error: `Booking is not pending DSW approval (current: ${current.status})` },
        { status: 409 }
      );
    }

    const { decision, rejection_reason, equipment_allocations } = parsed.data;
    const newStatus = decision === "APPROVE" ? "CONFIRMED" : "REJECTED";
    
    // Always restore the initially requested quantities first, because they were deducted at booking creation.
    // If approving, the new final allocations will be deducted right after.
    await restoreRequestedEquipment(supabase, current);

    // If DSW approves but didn't pass explicit allocations (e.g. from the simple approve button UI),
    // we default to allocating exactly what was requested.
    let finalAllocations = equipment_allocations;
    if (decision === "APPROVE" && (!finalAllocations || finalAllocations.length === 0)) {
       const reqs = current.equipment_requests_json;
       if (reqs && Array.isArray(reqs)) {
         finalAllocations = reqs.filter(r => r.id).map(r => ({ equipment_id: r.id, quantity: r.quantity }));
       }
    }

    if (decision === "APPROVE") {
      // Allocate equipment if approving
      if (finalAllocations && finalAllocations.length > 0) {
        for (const alloc of finalAllocations) {
          // Check availability
          const { data: eq } = await supabase
            .from("equipment")
            .select("id, available_quantity")
            .eq("id", alloc.equipment_id)
            .single();

          if (!eq || eq.available_quantity < alloc.quantity) {
            return NextResponse.json(
              { success: false, error: `Insufficient equipment available for allocation` },
              { status: 422 }
            );
          }

          await supabase.from("equipment_allocations").insert({
            booking_id: id,
            equipment_id: alloc.equipment_id,
            quantity: alloc.quantity,
            status: "ALLOCATED",
            allocated_at: new Date().toISOString(),
          });

          // Decrement available quantity
          await supabase
            .from("equipment")
            .update({ available_quantity: eq.available_quantity - alloc.quantity })
            .eq("id", alloc.equipment_id);
        }
      }

      // Confirm all segments — always runs on approval, equipment or not
      await supabase
        .from("booking_segments")
        .update({ is_confirmed: true })
        .eq("booking_id", id);
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        status: newStatus,
        rejection_reason: decision === "REJECT" ? rejection_reason : null,
        dsw_approved_at: decision === "APPROVE" ? new Date().toISOString() : null,
        dsw_approved_by: decision === "APPROVE" ? user.id : null,
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: "Failed to update booking" },
        { status: 500 }
      );
    }

    // Notify requester
    await supabase.from("notifications").insert({
      user_id: current.user_id,
      title: decision === "APPROVE" ? "Booking Confirmed!" : "Booking Rejected by DSW",
      message: decision === "APPROVE"
        ? `Your booking "${current.event_title}" has been confirmed! View QR for attendance.`
        : `Your booking "${current.event_title}" was rejected by DSW. Reason: ${rejection_reason ?? "Not provided"}`,
      link: `/dashboard/bookings/${id}`,
    });

    // Audit
    await supabase.from("audit_log").insert({
      booking_id: id,
      user_id: user.id,
      action: decision === "APPROVE" ? "DSW_APPROVED" : "DSW_REJECTED",
      details: { equipment_allocations },
    });

    return NextResponse.json({
      success: true,
      message: decision === "APPROVE" ? "Booking confirmed" : "Booking rejected",
    });
  }

  // === REQUESTER CANCELLATION ===
  if (action === "CANCEL") {
    // Only the booking owner can cancel
    if (current.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "You can only cancel your own bookings" },
        { status: 403 }
      );
    }

    if (!["PENDING_FC", "PENDING_DSW", "CONFIRMED"].includes(current.status)) {
      return NextResponse.json(
        { success: false, error: "This booking cannot be cancelled" },
        { status: 409 }
      );
    }

    if (current.status === "PENDING_FC" || current.status === "PENDING_DSW") {
      await restoreRequestedEquipment(supabase, current);
    }

    // Release equipment allocations if any
    const { data: allocations } = await supabase
      .from("equipment_allocations")
      .select("equipment_id, quantity")
      .eq("booking_id", id)
      .eq("status", "ALLOCATED");

    if (allocations) {
      for (const alloc of allocations) {
        const { data: eq } = await supabase
          .from("equipment")
          .select("available_quantity")
          .eq("id", alloc.equipment_id)
          .single();

        if (eq) {
          await supabase
            .from("equipment")
            .update({ available_quantity: eq.available_quantity + alloc.quantity })
            .eq("id", alloc.equipment_id);
        }

        await supabase
          .from("equipment_allocations")
          .update({ status: "RELEASED", released_at: new Date().toISOString() })
          .eq("booking_id", id)
          .eq("equipment_id", alloc.equipment_id);
      }
    }

    await supabase
      .from("bookings")
      .update({ status: "CANCELLED" })
      .eq("id", id);

    await supabase.from("audit_log").insert({
      booking_id: id,
      user_id: user.id,
      action: "BOOKING_CANCELLED",
    });

    return NextResponse.json({ success: true, message: "Booking cancelled" });
  }

  // === GENERAL UPDATE (requester editing their own pending booking) ===
  if (current.user_id !== user.id && user.role !== "DSW") {
    return NextResponse.json(
      { success: false, error: "You can only edit your own bookings" },
      { status: 403 }
    );
  }

  if (current.status !== "PENDING_FC") {
    return NextResponse.json(
      { success: false, error: "You can only edit bookings pending FC approval" },
      { status: 409 }
    );
  }

  const parsed = UpdateBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid update data" },
      { status: 422 }
    );
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update(parsed.data)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { success: false, error: "Failed to update booking" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, message: "Booking updated" });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireRole(req, ["DSW"]);
  if (authResult.response) return authResult.response;

  const { id } = await params;
  const supabase = createServerClient();

  const { error } = await supabase.from("bookings").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete booking" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, message: "Booking deleted" });
}
