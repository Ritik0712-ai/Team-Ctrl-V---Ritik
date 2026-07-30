"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Card, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { MapPin, Calendar, Users, Monitor, Clock, ArrowLeft, QrCode } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import Link from "next/link";
import type { Booking } from "@/lib/types";
import styles from "./page.module.css";

interface QRPanelProps {
  bookingId: string;
  bookingStatus: string;
  segment: { id: string; segment_date: string; start_time: string; end_time: string };
  idx: number;
}

function QRPanel({ bookingId, bookingStatus, segment, idx }: QRPanelProps) {
  const [qrUrl, setQrUrl] = useState("");
  const [qrImg, setQrImg] = useState("");
  const [loading, setLoading] = useState(false);

  const loadQR = async () => {
    if (qrUrl) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/qr?date=${segment.segment_date}`);
      const data = await res.json();
      if (data.success) {
        setQrUrl(data.data.url);
        setQrImg(data.data.qr);
      }
    } catch {
      toast.error("Failed to generate QR code");
    }
    setLoading(false);
  };

  return (
    <div className={styles.segment}>
      <div className={styles.segmentHeader}>
        <Calendar size={13} />
        <strong>Day {idx + 1}</strong>
        <span>{format(new Date(segment.segment_date), "EEEE, MMM d, yyyy")}</span>
      </div>
      <div className={styles.segmentTimes}>
        <Clock size={12} />
        <span>{segment.start_time} — {segment.end_time}</span>
      </div>
      {bookingStatus === "CONFIRMED" && (
        <div className={styles.qrSection}>
          {!qrImg ? (
            <button onClick={loadQR} className={styles.qrLoadBtn} disabled={loading}>
              {loading ? "Generating..." : <><QrCode size={14} /> Generate Check-in QR</>}
            </button>
          ) : (
            <div className={styles.qrDisplay}>
              <img src={qrImg} alt="QR Code" className={styles.qrImage} />
              <p className={styles.qrHint}>Scan to check in on {format(new Date(segment.segment_date), "MMM d")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BookingDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const bookingId = params.id as string;

  const fetchBooking = async () => {
    setLoading(true);
    const res = await fetch(`/api/bookings/${bookingId}`);
    const data = await res.json();
    if (data.success) {
      setBooking(data.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    setCancelling(true);

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CANCEL" }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to cancel");
        return;
      }

      toast.success("Booking cancelled");
      fetchBooking();
    } catch {
      toast.error("Network error");
    } finally {
      setCancelling(false);
    }
  };

  if (!user) return <PageSpinner />;
  if (loading) return <PageSpinner />;
  if (!booking) return <EmptyState title="Booking not found" description="This booking may have been removed" />;

  const canCancel = ["PENDING_FC", "PENDING_DSW", "CONFIRMED"].includes(booking.status) &&
    (user.role === "PRESIDENT" || user.role === "VICE_PRESIDENT");

  const isOwner = booking.user_id === user.id;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/dashboard/bookings" className={styles.backLink}>
          <ArrowLeft size={16} /> Back to Bookings
        </Link>
        <StatusBadge status={booking.status} />
      </div>

      <div className={styles.header}>
        <h1 className={styles.title}>{booking.event_title}</h1>
        <div className={styles.headerMeta}>
          {booking.user && (
            <span>By {booking.user.name}{booking.user.club_name ? ` · ${booking.user.club_name}` : ""}</span>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        {/* Event Details */}
        <Card className={styles.mainCard}>
          <CardContent>
            <h3 className={styles.sectionTitle}>Event Details</h3>
            <p className={styles.description}>{booking.event_description}</p>

            <div className={styles.details}>
              {booking.venue && (
                <div className={styles.detailRow}>
                  <MapPin size={15} />
                  <div>
                    <strong>{booking.venue.name}</strong>
                    <span>{booking.venue.building} · Floor {booking.venue.floor}</span>
                  </div>
                </div>
              )}
              <div className={styles.detailRow}>
                <Users size={15} />
                <div>
                  <strong>{booking.expected_attendees} attendees</strong>
                  {booking.venue && <span>Max capacity: {booking.venue.capacity}</span>}
                </div>
              </div>
            </div>

            {booking.equipment_requests && booking.equipment_requests.length > 0 && (
              <div className={styles.section}>
                <h4 className={styles.subTitle}>
                  <Monitor size={14} /> Equipment Requested
                </h4>
                <div className={styles.tagList}>
                  {booking.equipment_requests.map((eq) => (
                    <span key={eq} className={styles.tag}>{eq.replace("_", " ")}</span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card className={styles.scheduleCard}>
          <CardContent>
            <h3 className={styles.sectionTitle}>Schedule & Check-in</h3>
            {booking.booking_segments && booking.booking_segments.length > 0 ? (
              <div className={styles.segments}>
                {booking.booking_segments.map((seg, idx) => (
                  <QRPanel key={seg.id} bookingId={bookingId} bookingStatus={booking.status} segment={seg} idx={idx} />
                ))}
              </div>
            ) : (
              <p className={styles.noSegments}>No schedule details</p>
            )}
          </CardContent>
        </Card>

        {/* Status Timeline */}
        <Card className={styles.timelineCard}>
          <CardContent>
            <h3 className={styles.sectionTitle}>Approval Status</h3>
            <div className={styles.timeline}>
              <div className={`${styles.timelineItem} ${styles.done}`}>
                <div className={styles.timelineDot} />
                <div>
                  <strong>Submitted</strong>
                  <span>{format(new Date(booking.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                </div>
              </div>
              <div className={`${styles.timelineItem} ${booking.fc_approved_at ? styles.done : styles.pending}`}>
                <div className={styles.timelineDot} />
                <div>
                  <strong>Faculty Coordinator</strong>
                  {booking.fc_approved_at
                    ? <span>Approved · {format(new Date(booking.fc_approved_at), "MMM d 'at' h:mm a")}</span>
                    : <span className={styles.pendingLabel}>Pending</span>}
                </div>
              </div>
              <div className={`${styles.timelineItem} ${booking.dsw_approved_at ? styles.done : styles.pending}`}>
                <div className={styles.timelineDot} />
                <div>
                  <strong>DSW (Final)</strong>
                  {booking.dsw_approved_at
                    ? <span>Confirmed · {format(new Date(booking.dsw_approved_at), "MMM d 'at' h:mm a")}</span>
                    : <span className={styles.pendingLabel}>Pending</span>}
                </div>
              </div>
              {booking.status === "CONFIRMED" && (
                <Link href={`/attendance/${bookingId}`} className={styles.qrLink}>
                  <QrCode size={16} />
                  View Attendance QR Code
                </Link>
              )}
              {booking.status === "REJECTED" && booking.rejection_reason && (
                <div className={styles.rejectionNote}>
                  <strong>Rejection reason:</strong>
                  <p>{booking.rejection_reason}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {(canCancel && isOwner) || booking.status === "CONFIRMED" ? (
          <Card className={styles.actionsCard}>
            <CardContent>
              <h3 className={styles.sectionTitle}>Actions</h3>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {booking.status === "CONFIRMED" && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/api/bookings/${bookingId}/od-export`, "_blank")}
                  >
                    Export OD List
                  </Button>
                )}
                {canCancel && isOwner && (
                  <Button
                    variant="danger"
                    onClick={handleCancel}
                    loading={cancelling}
                  >
                    Cancel This Booking
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
