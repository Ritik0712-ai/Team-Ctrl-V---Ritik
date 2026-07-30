import type { BookingStatus, UserRole } from "@/lib/types";
import styles from "./Badge.module.css";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "muted";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

export function Badge({ children, variant = "default", dot = false, className = "" }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${className}`}>
      {dot && <span className={styles.dot} />}
      {children}
    </span>
  );
}

// Convenience helpers for booking status
const STATUS_VARIANTS: Record<BookingStatus, BadgeVariant> = {
  PENDING_FC: "info",
  PENDING_DSW: "info",
  CONFIRMED: "success",
  REJECTED: "error",
  CANCELLED: "muted",
  COMPLETED: "muted",
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING_FC: "Pending FC",
  PENDING_DSW: "Pending DSW",
  CONFIRMED: "Confirmed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]} dot>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

// Role badge
const ROLE_VARIANTS: Record<UserRole, BadgeVariant> = {
  PRESIDENT: "info",
  VICE_PRESIDENT: "info",
  FACULTY_COORDINATOR: "warning",
  DSW: "error",
};

const ROLE_LABELS: Record<UserRole, string> = {
  PRESIDENT: "President",
  VICE_PRESIDENT: "Vice President",
  FACULTY_COORDINATOR: "Faculty Coordinator",
  DSW: "DSW",
};

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge variant={ROLE_VARIANTS[role]}>
      {ROLE_LABELS[role]}
    </Badge>
  );
}
