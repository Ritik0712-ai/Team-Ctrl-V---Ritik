"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { PageSpinner } from "@/components/ui/Spinner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { CalendarPlus, CheckSquare, Clock, TrendingUp } from "lucide-react";
import styles from "./page.module.css";

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color?: string }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIcon} style={{ color }}>{icon}</div>
      <div className={styles.statContent}>
        <span className={styles.statValue}>{value}</span>
        <span className={styles.statLabel}>{label}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetch("/api/dashboard/stats")
        .then(r => r.json())
        .then(d => {
          if (d.success) setStats(d.data);
        });
    }
  }, [user]);

  if (!user) return <PageSpinner />;

  const isRequester = user.role === "PRESIDENT" || user.role === "VICE_PRESIDENT";
  const isFC = user.role === "FACULTY_COORDINATOR";
  const isDSW = user.role === "DSW";

  const getStat = (key: string) => (stats ? stats[key] ?? "—" : "...");

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            {isFC ? "Faculty Coordinator Dashboard" : isDSW ? "DSW Dashboard" : "Welcome back"}
          </h1>
          <p className={styles.pageSubtitle}>
            {user.name} · {user.role.replace("_", " ")}
            {user.club_name ? ` · ${user.club_name}` : ""}
          </p>
        </div>
        {isRequester && (
          <Link href="/dashboard/bookings/new">
            <Button icon={<CalendarPlus size={16} />}>New Booking</Button>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {isRequester && (
          <>
            <StatCard icon={<CalendarPlus size={20} />} label="Total Bookings" value={getStat("total")} color="var(--color-primary)" />
            <StatCard icon={<Clock size={20} />} label="Pending Approval" value={getStat("pending")} color="var(--color-warning)" />
            <StatCard icon={<CheckSquare size={20} />} label="Confirmed" value={getStat("confirmed")} color="var(--color-success)" />
            <StatCard icon={<TrendingUp size={20} />} label="This Month" value={getStat("thisMonth")} color="var(--color-accent)" />
          </>
        )}
        {isFC && (
          <>
            <StatCard icon={<Clock size={20} />} label="Pending Review" value={getStat("pendingReview")} color="var(--color-warning)" />
            <StatCard icon={<CheckSquare size={20} />} label="Approved" value={getStat("approved")} color="var(--color-success)" />
            <StatCard icon={<TrendingUp size={20} />} label="This Week" value={getStat("thisWeek")} color="var(--color-primary)" />
          </>
        )}
        {isDSW && (
          <>
            <StatCard icon={<Clock size={20} />} label="Pending DSW" value={getStat("pendingDSW")} color="var(--color-warning)" />
            <StatCard icon={<CheckSquare size={20} />} label="Approved" value={getStat("confirmed")} color="var(--color-success)" />
            <StatCard icon={<TrendingUp size={20} />} label="Active Events" value={getStat("activeEvents")} color="var(--color-accent)" />
            <StatCard icon={<CalendarPlus size={20} />} label="Total Events (Month)" value={getStat("totalEvents")} color="var(--color-primary)" />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.quickActions}>
          {isRequester && (
            <>
              <Link href="/dashboard/bookings/new">
                <Card hover className={styles.actionCard}>
                  <CardContent>
                    <div className={styles.actionIcon}><CalendarPlus size={24} /></div>
                    <div>
                      <h4>New Venue Booking</h4>
                      <p>Request a venue for your event</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/dashboard/bookings">
                <Card hover className={styles.actionCard}>
                  <CardContent>
                    <div className={styles.actionIcon}><Clock size={24} /></div>
                    <div>
                      <h4>My Bookings</h4>
                      <p>Track your requests and approvals</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/dashboard/venues">
                <Card hover className={styles.actionCard}>
                  <CardContent>
                    <div className={styles.actionIcon}><TrendingUp size={24} /></div>
                    <div>
                      <h4>Browse Venues</h4>
                      <p>Explore available venues</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </>
          )}
          {isFC && (
            <Link href="/dashboard/approvals">
              <Card hover className={styles.actionCard}>
                <CardContent>
                  <div className={styles.actionIcon}><CheckSquare size={24} /></div>
                  <div>
                    <h4>Pending Approvals</h4>
                    <p>Review and approve booking requests</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {isDSW && (
            <>
              <Link href="/dashboard/approvals">
                <Card hover className={styles.actionCard}>
                  <CardContent>
                    <div className={styles.actionIcon}><CheckSquare size={24} /></div>
                    <div>
                      <h4>DSW Approvals</h4>
                      <p>Final approval and equipment allocation</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/dashboard/equipment">
                <Card hover className={styles.actionCard}>
                  <CardContent>
                    <div className={styles.actionIcon}><TrendingUp size={24} /></div>
                    <div>
                      <h4>Equipment Management</h4>
                      <p>Track and allocate equipment</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
