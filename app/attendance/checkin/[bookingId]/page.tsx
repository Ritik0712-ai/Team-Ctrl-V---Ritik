"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import styles from "./page.module.css";

function CheckInContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId") ?? "";
  const dateParam = searchParams.get("date") ?? "";

  const [eventInfo, setEventInfo] = useState<{ event_title: string; venue?: { name: string; building: string } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [regNumber, setRegNumber] = useState("");
  const [studentName, setStudentName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookingId) { setLoading(false); return; }
    fetch(`/api/attendance/${bookingId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setEventInfo(d.data); })
      .catch(() => setError("Failed to load event"))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNumber.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/attendance/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          segment_date: dateParam,
          registration_number: regNumber.trim(),
          student_name: studentName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to record attendance");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.state}>
        <Loader2 className={styles.spinnerIcon} size={32} />
        <p>Loading event...</p>
      </div>
    );
  }

  if (!bookingId) {
    return (
      <div className={styles.state}>
        <AlertCircle className={styles.errorIcon} size={32} />
        <p>Invalid QR code. Please scan again.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={styles.state}>
        <CheckCircle className={styles.successIcon} size={48} />
        <h2>Attendance Recorded!</h2>
        <p>You have been marked present for the event.</p>
      </div>
    );
  }

  return (
    <>
      {eventInfo && (
        <div className={styles.eventInfo}>
          <h2 className={styles.eventTitle}>{eventInfo.event_title}</h2>
          {eventInfo.venue && (
            <p className={styles.eventVenue}>
              {eventInfo.venue.name} · {eventInfo.venue.building}
            </p>
          )}
          {dateParam && (
            <p className={styles.eventDate}>{dateParam}</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        {error && (
          <div className={styles.errorBanner}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <Input
          label="Registration Number"
          placeholder="e.g. 21BCE00001"
          value={regNumber}
          onChange={e => setRegNumber(e.target.value)}
          required
          autoComplete="off"
        />

        <Input
          label="Your Name (Optional)"
          placeholder="e.g. Rahul Verma"
          value={studentName}
          onChange={e => setStudentName(e.target.value)}
          autoComplete="name"
        />

        <Button type="submit" loading={submitting} fullWidth>
          Mark Attendance
        </Button>
      </form>
    </>
  );
}

export default function CheckInPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.logoMark}>RX</div>
          <h1 className={styles.title}>ReserveX</h1>
          <p className={styles.subtitle}>Attendance Check-In</p>
        </div>

        <div className={styles.card}>
          <Suspense fallback={<div className={styles.state}><Loader2 className={styles.spinnerIcon} size={32} /></div>}>
            <CheckInContent />
          </Suspense>
        </div>

        <p className={styles.footer}>
          Powered by ReserveX · VIT DSW
        </p>
      </div>
    </div>
  );
}
