"use client";

import { useState, useEffect } from "react";
import { QrCode, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import styles from "./page.module.css";

interface AttendanceData {
  id: string;
  event_title: string;
  venue?: { name: string; building: string };
  segment_date: string;
  registration_number?: string;
  status: string;
  student_name?: string;
}

export default function AttendancePage() {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [regNumber, setRegNumber] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const pathParts = window.location.pathname.split("/");
    const eventId = pathParts[pathParts.length - 1];

    if (eventId && eventId !== "[eventId]") {
      fetchAttendance(eventId);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchAttendance = async (eventId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/event/${eventId}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch {
      setError("Failed to load event");
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !regNumber.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/attendance/${data.id}/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_number: regNumber.trim(), student_name: name.trim() }),
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
                    <p className={styles.eventDate}>
                      {new Date(data.segment_date).toLocaleDateString("en-IN", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
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
