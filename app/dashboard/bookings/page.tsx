"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { Card, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";
import { CalendarPlus, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import type { Booking } from "@/lib/types";
import styles from "./page.module.css";

export default function BookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    setLoading(true);
    const res = await fetch("/api/bookings");
    const data = await res.json();
    if (data.success) {
      setBookings(data.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  if (!user) return <PageSpinner />;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>My Bookings</h1>
          <p className={styles.pageSubtitle}>
            Track your venue booking requests and approvals
          </p>
        </div>
        <Link href="/dashboard/bookings/new">
          <button className={styles.newBtn}>
            <CalendarPlus size={16} />
            New Booking
          </button>
        </Link>
      </div>

      {loading ? (
        <PageSpinner />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={<CalendarPlus size={40} strokeWidth={1.5} />}
          title="No bookings yet"
          description="Create your first venue booking request"
          action={
            <Link href="/dashboard/bookings/new">
              <button className={styles.newBtn}>New Booking</button>
            </Link>
          }
        />
      ) : (
        <div className={styles.list}>
          {bookings.map((booking) => (
            <Link key={booking.id} href={`/dashboard/bookings/${booking.id}`}>
              <Card hover className={styles.bookingCard}>
                <CardContent>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardLeft}>
                      <h3 className={styles.eventTitle}>{booking.event_title}</h3>
                      <div className={styles.metaRow}>
                        {booking.venue && (
                          <span className={styles.meta}>
                            <MapPin size={13} />
                            {booking.venue.name}
                          </span>
                        )}
                        <span className={styles.meta}>
                          <Clock size={13} />
                          {booking.booking_segments?.[0]
                            ? format(new Date(booking.booking_segments[0].segment_date), "MMM d, yyyy")
                            : "—"}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>

                  <p className={styles.description}>
                    {booking.event_description.length > 120
                      ? booking.event_description.slice(0, 120) + "..."
                      : booking.event_description}
                  </p>

                  {booking.booking_segments && booking.booking_segments.length > 0 && (
                    <div className={styles.segments}>
                      {booking.booking_segments.map((seg) => (
                        <span key={seg.id} className={styles.segmentBadge}>
                          {format(new Date(seg.segment_date), "MMM d")} · {seg.start_time}–{seg.end_time}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
