"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import styles from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login failed. Please try again.");
        return;
      }

      router.push(data.redirect ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoMark}>RX</div>
          </div>
          <h1 className={styles.title}>ReserveX</h1>
          <p className={styles.subtitle}>VIT Venue Booking Portal · DSW Office</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorBanner} role="alert">
              {error}
            </div>
          )}

          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            icon={<Mail size={16} />}
            required
            autoComplete="email"
            autoFocus
          />

          <div className={styles.passwordField}>
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              icon={<Lock size={16} />}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className={styles.togglePassword}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <Button type="submit" loading={loading} fullWidth size="lg">
            Sign In
          </Button>
        </form>

        {/* Demo accounts */}
        <div className={styles.demoSection}>
          <p className={styles.demoTitle}>Demo Accounts</p>
          <div className={styles.demoAccounts}>
            <button
              type="button"
              className={styles.demoAccount}
              onClick={() => { setEmail("president@vit.ac.in"); setPassword("reservex123"); }}
            >
              <span className={styles.demoRole}>President</span>
              <span className={styles.demoEmail}>president@vit.ac.in</span>
            </button>
            <button
              type="button"
              className={styles.demoAccount}
              onClick={() => { setEmail("vp@vit.ac.in"); setPassword("reservex123"); }}
            >
              <span className={styles.demoRole}>Vice President</span>
              <span className={styles.demoEmail}>vp@vit.ac.in</span>
            </button>
            <button
              type="button"
              className={styles.demoAccount}
              onClick={() => { setEmail("fc@vit.ac.in"); setPassword("reservex123"); }}
            >
              <span className={styles.demoRole}>Faculty Coordinator</span>
              <span className={styles.demoEmail}>fc@vit.ac.in</span>
            </button>
            <button
              type="button"
              className={styles.demoAccount}
              onClick={() => { setEmail("dsw@vit.ac.in"); setPassword("reservex123"); }}
            >
              <span className={styles.demoRole}>DSW</span>
              <span className={styles.demoEmail}>dsw@vit.ac.in</span>
            </button>
          </div>
          <p className={styles.demoHint}>Password for all: <code>reservex123</code></p>
        </div>
      </div>

      <p className={styles.footer}>
        Managed by Dean of Student Welfare · VIT University
      </p>
    </div>
  );
}
