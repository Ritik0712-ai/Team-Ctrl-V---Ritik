"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";
import { FileText, Download, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import styles from "./page.module.css";

interface ODRecord {
  booking_id: string;
  event_title: string;
  event_description: string;
  organizer: string;
  club: string;
  segment_dates: string[];
  total_attendees: number;
  present: number;
  absent: number;
  excused: number;
  od_eligible: string;
  attendance_rate: number;
  completed_at: string;
  created_at: string;
  attendance_records: any[];
}

export default function ODPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<ODRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/od/export", { cache: "no-store", next: { revalidate: 0 } })
      .then((r) => r.json())
      .then((d) => { if (d.success) setRecords(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const exportCSV = (record: ODRecord) => {
    const header = "Registration Number,Student Name,Status,Event,Date\n";
    const rows = (record.attendance_records || [])
      .filter((r: any) => r.status === "PRESENT")
      .map((r: any) => `${r.registration_number},${r.student_name},${r.status},${record.event_title},${record.segment_dates.join(" | ")}`)
      .join("\n");
    const csv = header + rows;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `od-${record.booking_id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) return <PageSpinner />;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>OD Eligibility Export</h1>
          <p className={styles.pageSubtitle}>Export attendance records for OD processing</p>
        </div>
      </div>

      {loading ? (
        <PageSpinner />
      ) : records.length === 0 ? (
        <EmptyState
          icon={<FileText size={40} />}
          title="No completed events"
          description="Complete an event to generate OD eligibility records"
        />
      ) : (
        <div className={styles.list}>
          {records.map((rec) => (
            <Card key={rec.booking_id} className={styles.odCard}>
              <CardContent>
                <div className={styles.cardHeader}>
                  <div className={styles.cardLeft}>
                    <h3 className={styles.eventTitle}>{rec.event_title}</h3>
                    <p className={styles.meta}>{rec.organizer} · {rec.club}</p>
                    <p className={styles.meta}>{rec.segment_dates.length} day(s) · {rec.completed_at ? `Completed ${format(new Date(rec.completed_at), "MMM d, yyyy")}` : `Created ${format(new Date(rec.created_at || new Date()), "MMM d, yyyy")}`}</p>
                  </div>
                  <Badge
                    variant={rec.od_eligible === "ELIGIBLE" ? "success" : "error"}
                    dot
                  >
                    {rec.od_eligible === "ELIGIBLE" ? "OD Eligible" : "Not Eligible"}
                  </Badge>
                </div>

                <div className={styles.stats}>
                  <div className={styles.stat}>
                    <strong>{rec.total_attendees}</strong>
                    <span>Registered</span>
                  </div>
                  <div className={styles.stat}>
                    <strong className={styles.success}>{rec.present}</strong>
                    <span>Present</span>
                  </div>
                  <div className={styles.stat}>
                    <strong className={styles.error}>{rec.absent}</strong>
                    <span>Absent</span>
                  </div>
                  <div className={styles.stat}>
                    <strong>{rec.attendance_rate}%</strong>
                    <span>Attendance</span>
                  </div>
                </div>

                <div className={styles.actions}>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Download size={14} />}
                    onClick={() => exportCSV(rec)}
                  >
                    Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
