/**
 * ReserveX — Supabase Realtime Subscriptions
 * Provides real-time updates for booking status changes
 */
import { RealtimeChannel } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

let channels: Map<string, RealtimeChannel> = new Map();

/**
 * Subscribe to booking status updates
 * Call this in a client component with useEffect
 */
export function subscribeToBookingUpdates(
  bookingId: string,
  onUpdate: (payload: {
    eventType: "INSERT" | "UPDATE" | "DELETE";
    new: Record<string, unknown>;
    old: Record<string, unknown>;
  }) => void
) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const channelName = `booking:${bookingId}`;

  // Unsubscribe existing channel if any
  if (channels.has(channelName)) {
    supabase.removeChannel(channels.get(channelName)!);
  }

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "bookings",
        filter: `id=eq.${bookingId}`,
      },
      (payload) => {
        onUpdate({
          eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
          new: payload.new as Record<string, unknown>,
          old: payload.old as Record<string, unknown>,
        });
      }
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "approval_history",
        filter: `booking_id=eq.${bookingId}`,
      },
      (payload) => {
        // Notify new approval history entry
        onUpdate({
          eventType: "INSERT",
          new: payload.new as Record<string, unknown>,
          old: {},
        });
      }
    )
    .subscribe();

  channels.set(channelName, channel);

  return () => {
    supabase.removeChannel(channel);
    channels.delete(channelName);
  };
}

/**
 * Subscribe to approval queue updates (for FC/DSW dashboards)
 */
export function subscribeToApprovalQueue(
  role: "FACULTY_COORDINATOR" | "DSW",
  onUpdate: (payload: {
    eventType: "INSERT" | "UPDATE" | "DELETE";
    new: Record<string, unknown>;
  }) => void
) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const channelName = `approvals:${role}`;

  if (channels.has(channelName)) {
    supabase.removeChannel(channels.get(channelName)!);
  }

  const filter = role === "FACULTY_COORDINATOR"
    ? "status=eq.PENDING_FC"
    : "status=eq.PENDING_DSW";

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "bookings",
      },
      (payload) => {
        onUpdate({
          eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
          new: payload.new as Record<string, unknown>,
        });
      }
    )
    .subscribe();

  channels.set(channelName, channel);

  return () => {
    supabase.removeChannel(channel);
    channels.delete(channelName);
  };
}

export function cleanupChannels() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  channels.forEach((channel) => supabase.removeChannel(channel));
  channels.clear();
}
