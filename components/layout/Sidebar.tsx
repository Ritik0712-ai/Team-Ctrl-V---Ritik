"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarPlus,
  Search,
  CheckSquare,
  Monitor,
  ClipboardCheck,
  FileText,
  Bell,
  LogOut,
  Menu,
  X,
  Users,
  QrCode,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useState } from "react";
import styles from "./Sidebar.module.css";
import type { UserRole } from "@/lib/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard size={18} />,
    roles: ["PRESIDENT", "VICE_PRESIDENT", "FACULTY_COORDINATOR", "DSW"],
  },
  {
    label: "New Booking",
    href: "/dashboard/bookings/new",
    icon: <CalendarPlus size={18} />,
    roles: ["PRESIDENT", "VICE_PRESIDENT"],
  },
  {
    label: "My Bookings",
    href: "/dashboard/bookings",
    icon: <CalendarPlus size={18} />,
    roles: ["PRESIDENT", "VICE_PRESIDENT"],
  },
  {
    label: "Venues",
    href: "/dashboard/venues",
    icon: <Search size={18} />,
    roles: ["PRESIDENT", "VICE_PRESIDENT", "FACULTY_COORDINATOR", "DSW"],
  },
  {
    label: "Approvals",
    href: "/dashboard/approvals",
    icon: <CheckSquare size={18} />,
    roles: ["FACULTY_COORDINATOR", "DSW"],
  },
  {
    label: "Equipment",
    href: "/dashboard/equipment",
    icon: <Monitor size={18} />,
    roles: ["DSW"],
  },
  {
    label: "Attendance",
    href: "/dashboard/attendance",
    icon: <ClipboardCheck size={18} />,
    roles: ["PRESIDENT", "VICE_PRESIDENT", "DSW"],
  },
  {
    label: "OD Export",
    href: "/dashboard/od",
    icon: <FileText size={18} />,
    roles: ["DSW"],
  },
  {
    label: "Notifications",
    href: "/dashboard/notifications",
    icon: <Bell size={18} />,
    roles: ["PRESIDENT", "VICE_PRESIDENT", "FACULTY_COORDINATOR", "DSW"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link
        href={item.href}
        className={`${styles.navLink} ${isActive ? styles.active : ""}`}
        onClick={() => setMobileOpen(false)}
      >
        {item.icon}
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        className={styles.mobileToggle}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div className={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.mobileOpen : ""}`}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoMark}>
            <span>RX</span>
          </div>
          <div className={styles.logoText}>
            <span className={styles.logoName}>ReserveX</span>
            <span className={styles.logoSub}>VIT · DSW Portal</span>
          </div>
        </div>

        {/* User info */}
        {user && (
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className={styles.userDetails}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userRole}>{user.role.replace("_", " ")}</span>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className={styles.nav}>
          {visibleItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        {/* Footer */}
        <div className={styles.footer}>
          <button onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          }} className={styles.logoutBtn}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
