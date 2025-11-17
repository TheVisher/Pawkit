"use client";
import { useEffect } from "react";

export function ClientEvents() {
  useEffect(() => {
    const onCspViolation = (e: SecurityPolicyViolationEvent) => {
      console.error("[CSP Violation]", {
        blockedURI: e.blockedURI,
        violatedDirective: e.violatedDirective,
        originalPolicy: e.originalPolicy,
        disposition: e.disposition,
      });
    };
    const onError = (e: ErrorEvent) => {
      if (e.message?.includes("ResizeObserver loop")) return;
      console.error("[Global Error]", {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        error: e.error,
        stack: e.error?.stack,
        userAgent: navigator.userAgent,
      });
    };
    document.addEventListener("securitypolicyviolation", onCspViolation as any);
    window.addEventListener("error", onError);
    return () => {
      document.removeEventListener("securitypolicyviolation", onCspViolation as any);
      window.removeEventListener("error", onError);
    };
  }, []);
  return null;
}
