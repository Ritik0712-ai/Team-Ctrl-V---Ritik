import { Loader2 } from "lucide-react";
import styles from "./Spinner.module.css";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export function Spinner({ size = "md", text, className = "" }: SpinnerProps) {
  const sizes = { sm: 16, md: 24, lg: 40 };

  return (
    <div className={`${styles.wrapper} ${className}`}>
      <Loader2 className={styles.spinner} size={sizes[size]} />
      {text && <p className={styles.text}>{text}</p>}
    </div>
  );
}

export function PageSpinner() {
  return (
    <div className={styles.pageWrapper}>
      <Loader2 className={styles.spinner} size={32} />
    </div>
  );
}
