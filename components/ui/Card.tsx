import { memo } from "react";
import styles from "./Card.module.css";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  onClick?: () => void;
}

export const Card = memo(function Card({ children, className = "", padding = "md", hover = false, onClick }: CardProps) {
  const classes = [
    styles.card,
    styles[`padding-${padding}`],
    hover ? styles.hover : "",
    onClick ? styles.clickable : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      {children}
    </div>
  );
});

export const CardHeader = memo(function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`${styles.header} ${className}`}>{children}</div>;
});

export const CardTitle = memo(function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`${styles.title} ${className}`}>{children}</h3>;
});

export const CardDescription = memo(function CardDescription({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`${styles.description} ${className}`}>{children}</p>;
});

export const CardContent = memo(function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`${styles.content} ${className}`}>{children}</div>;
});

export const CardFooter = memo(function CardFooter({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`${styles.footer} ${className}`}>{children}</div>;
});
