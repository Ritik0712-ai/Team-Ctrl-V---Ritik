"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Card, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { CheckCircle, XCircle, Clock, MapPin, Users, Calendar } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import type { Booking } from "@/lib/types";
import styles from "./page.module.css";

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchApprovals = async () => {
    setLoading(true);
    const res = await fetch("/api/bookings/approvals");
    const data = await res.json();
    if (data.success) {
      setBookings(data.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleDecision = async () => {
    if (!selected || !action) return;
    setSubmitting(true);

    const apiAction = user?.role === "FACULTY_COORDINATOR"
      ? (action === "approve" ? "FC_APPROVE" : "FC_REJECT")
      : (action === "approve" ? "DSW_APPROVE" : "DSW_REJECT");

    try {
      const res = await fetch(`/api/bookings/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: apiAction,
          decision: action === "approve" ? "APPROVE" : "REJECT",
          rejection_reason: action === "reject" ? reason : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Action failed");
        return;
      }

      toast.success(
        action === "approve"
          ? (user?.role === "FACULTY_COORDINATOR" ? "Approved — forwarded to DSW" : "Booking confirmed!")
          : "Booking rejected"
      );
      setSelected(null);
      setAction(null);
      setReason("");
      fetchApprovals();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return <PageSpinner />;

  const isFC = user.role === "FACULTY_COORDINATOR";
  const isDSW = user.role === "DSW";
  const statusFilter = isFC ? "PENDING_FC" : "PENDING_DSW";

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            {isFC ? "Faculty Coordinator Approvals" : "DSW Approvals"}
          </h1>
          <p className={styles.pageSubtitle}>
            {isFC
              ? "Review and approve booking requests from student clubs"
              : "Final approval and equipment allocation"}
          </p>
        </div>
      </div>

      {loading ? (
        <PageSpinner />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={<CheckCircle size={40} strokeWidth={1.5} />}
          title={`No ${statusFilter.replace("_", " ").toLowerCase()} requests`}
          description="All caught up! No pending approvals at the moment."
        />
      ) : (
        <div className={styles.list}>
          {bookings.map((booking) => (
            <Card key={booking.id} className={styles.approvalCard}>
              <CardContent>
                <div className={styles.cardTop}>
                  <div className={styles.cardLeft}>
                    <h3 className={styles.eventTitle}>{booking.event_title}</h3>
                    <div className={styles.metaRow}>
                      {booking.user && (
                        <span className={styles.meta}>
                          {booking.user.name}
                          {booking.user.club_name && ` · ${booking.user.club_name}`}
                        </span>
                      )}
                      <StatusBadge status={booking.status} />
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<XCircle size={14} />}
                      onClick={() => { setSelected(booking); setAction("reject"); }}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<CheckCircle size={14} />}
                      onClick={() => { setSelected(booking); setAction("approve"); }}
                    >
                      Approve
                    </Button>
                  </div>
                </div>

                <p className={styles.description}>{booking.event_description}</p>

                <div className={styles.details}>
                  {booking.venue && (
                    <div className={styles.detail}>
                      <MapPin size={13} />
                      <span>{booking.venue.name} · {booking.venue.building}</span>
                    </div>
                  )}
                  <div className={styles.detail}>
                    <Users size={13} />
                    <span>{booking.expected_attendees} attendees</span>
                  </div>
                  {booking.booking_segments && booking.booking_segments.length > 0 && (
                    <div className={styles.detail}>
                      <Calendar size={13} />
                      <span>
                        {booking.booking_segments.length === 1
                          ? format(new Date(booking.booking_segments[0].segment_date), "MMM d, yyyy")
                          : `${booking.booking_segments.length} days`}
                      </span>
                    </div>
                  )}
                </div>

                {booking.equipment_requests && booking.equipment_requests.length > 0 && (
                  <div className={styles.equipmentReq}>
                    <span>Equipment requested:</span>
                    <div className={styles.eqTags}>
                      {booking.equipment_requests.map((eq) => (
                        <span key={eq.name} className={styles.eqTag}>{eq.name} x{eq.quantity}</span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      <Modal
        open={action === "reject" && selected !== null}
        onClose={() => { setAction(null); setReason(""); }}
        title="Reject Booking"
        description={`Rejection reason will be shared with ${selected?.user?.name ?? "the requester"}.`}
        footer={
          <>
            <Button variant="outline" onClick={() => { setAction(null); setReason(""); }}>
              Cancel
            </Button>
            <Button variant="danger" loading={submitting} onClick={handleDecision}>
              Confirm Rejection
            </Button>
          </>
        }
      >
        <Textarea
          label="Reason for Rejection"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter the reason for rejection..."
          rows={3}
          hint="This will be visible to the requester."
        />
      </Modal>

      {/* Approval Confirmation Modal */}
      <Modal
        open={action === "approve" && selected !== null}
        onClose={() => setAction(null)}
        title="Confirm Approval"
        description={
          isFC
            ? `Approve "${selected?.event_title}"? It will be forwarded to DSW for final approval.`
            : `Confirm "${selected?.event_title}"? The booking will be confirmed.`
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setAction(null)}>Cancel</Button>
            <Button loading={submitting} onClick={handleDecision}>
              Confirm Approval
            </Button>
          </>
        }
      >
        {selected && (
          <div className={styles.approvalSummary}>
            <div className={styles.summaryRow}>
              <span>Venue</span>
              <span>{selected.venue?.name}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Attendees</span>
              <span>{selected.expected_attendees}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Equipment</span>
              <span>{selected.equipment_requests?.join(", ") || "None"}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
