"use client";

import { TextareaHTMLAttributes, forwardRef } from "react";
import styles from "./Textarea.module.css";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const taId = id || `ta-${Math.random().toString(36).slice(2)}`;

    return (
      <div className={styles.wrapper}>
        {label && (
          <label htmlFor={taId} className={styles.label}>
            {label}
            {props.required && <span className={styles.required}>*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={taId}
          className={`${styles.textarea} ${error ? styles.hasError : ""} ${className}`}
          aria-invalid={!!error}
          {...props}
        />
        {error && <p className={styles.error}>{error}</p>}
        {hint && !error && <p className={styles.hint}>{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
