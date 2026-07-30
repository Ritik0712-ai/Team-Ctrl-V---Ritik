"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import styles from "./page.module.css";

function CheckInContent() {
  const searchParams = useSearchParams();
  const [segmentDate, setSegmentDate] = useState(searchParams.get("date") ?? "");
  const [bookingId, setBookingId] = useState("");
  const [data, setData] = useState<{
    event_title: string;
    venue?: { name: string; building: string };
    booking_segments?: { segment_date: string; start_time: string; end_time: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [regNumber, setRegNumber] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const pathParts = window.location.pathname.split("/");
    const id = pathParts[pathParts.length - 1];
    if (id && id !== "[eventId]") {
      setBookingId(id);
      fetch(`/api/attendance/${id}`)
        .then(r => r.json())
        .then(json => {
          if (json.success) {
            setData(json.data);
            
            // Auto-select date if not provided in URL
            if (!segmentDate && json.data.booking_segments && json.data.booking_segments.length > 0) {
              // Try to find today's segment
              const today = new Date().toISOString().split("T")[0];
              const todaySeg = json.data.booking_segments.find((s: any) => s.segment_date === today);
              
              if (todaySeg) {
                setSegmentDate(todaySeg.segment_date);
              } else if (json.data.booking_segments.length === 1) {
                // If only one segment, auto-select it
                setSegmentDate(json.data.booking_segments[0].segment_date);
              }
            }
          }
        })
        .catch(() => setError("Failed to load event"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId || !regNumber.trim()) return;
    
    if (!segmentDate) {
      setError("Please select a date for attendance.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/attendance/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          segment_date: segmentDate,
          registration_number: regNumber.trim(),
          student_name: name.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSubmitted(true);
      } else {
        setError(json.error ?? "Failed to record attendance");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logoMark}>RX</div>
          <h1 className={styles.title}>ReserveX</h1>
          <p className={styles.subtitle}>Attendance Check-In</p>
        </div>

        <Card className={styles.mainCard}>
          <CardContent>
            {submitted ? (
              <div className={styles.successState}>
                <div className={styles.successIcon}>
                  <CheckCircle size={48} />
                </div>
                <h2>Attendance Recorded!</h2>
                <p>Your attendance has been marked for today&apos;s event.</p>
                <div className={styles.successDetails}>
                  <span>Registration: <strong>{regNumber}</strong></span>
                  {name && <span>Name: <strong>{name}</strong></span>}
                </div>
              </div>
            ) : (
              <>
                {data ? (
                  <div className={styles.eventInfo}>
                    <h2 className={styles.eventTitle}>{data.event_title}</h2>
                    {data.venue && (
                      <p className={styles.eventVenue}>{data.venue.name} · {data.venue.building}</p>
                    )}
                    {segmentDate && (
                      <p className={styles.eventDate}>
                        {new Date(segmentDate).toLocaleDateString("en-IN", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className={styles.noEvent}>
                    <AlertCircle size={40} />
                    <p>No active event found.</p>
                    <p className={styles.hint}>Scan the QR code displayed at the venue.</p>
                  </div>
                )}

                {data && (
                  <form onSubmit={handleSubmit} className={styles.form}>
                    {error && (
                      <div className={styles.errorBanner} role="alert">
                        <AlertCircle size={14} />
                        {error}
                      </div>
                    )}

                    {!segmentDate && data?.booking_segments && data.booking_segments.length > 1 && (
                      <div className={styles.inputGroup} style={{ marginBottom: "1rem" }}>
                        <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "0.5rem" }}>
                          Select Event Date
                        </label>
                        <select 
                          value={segmentDate} 
                          onChange={(e) => setSegmentDate(e.target.value)}
                          style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                          required
                        >
                          <option value="">-- Choose a Date --</option>
                          {data.booking_segments.map(seg => (
                            <option key={seg.segment_date} value={seg.segment_date}>
                              {new Date(seg.segment_date).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <Input
                      label="Registration Number"
                      value={regNumber}
                      onChange={(e) => setRegNumber(e.target.value)}
                      placeholder="e.g. 22BCE0001"
                      required
                      autoFocus
                      autoComplete="off"
                    />

                    <Input
                      label="Your Name (Optional)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rahul Verma"
                      autoComplete="off"
                    />

                    <Button type="submit" loading={submitting} fullWidth size="lg">
                      Mark Attendance
                    </Button>
                  </form>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <p className={styles.footer}>
          Powered by ReserveX · VIT DSW
        </p>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <CheckInContent />
    </Suspense>
  );
}
