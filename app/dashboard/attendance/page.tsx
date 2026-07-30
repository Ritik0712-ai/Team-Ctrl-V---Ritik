"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";
import { ClipboardCheck, Users, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import type { Booking } from "@/lib/types";
import styles from "./page.module.css";

export default function AttendancePage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfirmed = async () => {
      setLoading(true);
      const res = await fetch("/api/bookings?status=CONFIRMED&page_size=50");
      const data = await res.json();
      if (data.success) {
        setBookings(data.data);
      }
      setLoading(false);
    };
    fetchConfirmed();
  }, []);

  if (!user) return <PageSpinner />;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Attendance</h1>
          <p className={styles.pageSubtitle}>Track check-ins for confirmed bookings</p>
        </div>
      </div>

      {loading ? (
        <PageSpinner />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck size={40} />}
          title="No active events"
          description="Confirmed bookings will appear here for attendance tracking"
        />
      ) : (
        <div className={styles.list}>
          {bookings.map((booking) => (
            <Card key={booking.id} className={styles.bookingCard}>
              <CardContent>
                <div className={styles.cardHeader}>
                  <div className={styles.cardLeft}>
                    <h3 className={styles.eventTitle}>{booking.event_title}</h3>
                    <p className={styles.meta}>
                      {booking.venue?.name} · {booking.expected_attendees} expected
                    </p>
                  </div>
                  <Badge variant="success" dot>Active</Badge>
                </div>
                {booking.booking_segments && (
                  <div className={styles.segments}>
                    {booking.booking_segments.map((seg) => (
                      <span key={seg.id} className={styles.segmentBadge}>
                        {format(new Date(seg.segment_date), "MMM d")} · {seg.start_time}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
