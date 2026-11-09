"use client";

import { useEffect, useRef } from "react";

// Log out after 2 minutes of inactivity.
export const IDLE_TIMEOUT_MS = 2 * 60 * 1000;

const LAST_ACTIVITY_KEY = "bcas_last_activity";
export const LOGOUT_REASON_KEY = "bcas_logout_reason";

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "wheel",
] as const;

function readLastActivity(): number | null {
  try {
    const v = localStorage.getItem(LAST_ACTIVITY_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

function writeLastActivity(ts: number) {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(ts));
  } catch {
    // storage unavailable — the in-memory timer still works
  }
}

export function clearLastActivity() {
  try {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {}
}

/**
 * Calls `onIdle` once the user has been inactive for `timeoutMs`.
 * Activity is shared across tabs via localStorage, so working in one tab
 * keeps the others alive, and a session left idle while the browser was
 * closed is logged out as soon as the page loads again.
 */
export function useIdleLogout(onIdle: () => void, timeoutMs = IDLE_TIMEOUT_MS) {
  const onIdleRef = useRef(onIdle);
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    let fired = false;
    let lastWrite = 0;

    const stored = readLastActivity();
    if (stored === null || Date.now() - stored >= timeoutMs) {
      // No record, or stale from a previous visit: start fresh only if there
      // was no record; otherwise the user went idle while away.
      if (stored !== null) {
        fired = true;
        onIdleRef.current();
        return;
      }
      writeLastActivity(Date.now());
    }

    const markActive = () => {
      const now = Date.now();
      // Throttle storage writes (mousemove fires constantly).
      if (now - lastWrite > 1000) {
        lastWrite = now;
        writeLastActivity(now);
      }
    };

    const check = () => {
      if (fired) return;
      const last = readLastActivity() ?? Date.now();
      if (Date.now() - last >= timeoutMs) {
        fired = true;
        onIdleRef.current();
      }
    };

    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, markActive, { passive: true })
    );
    document.addEventListener("visibilitychange", check);
    const interval = setInterval(check, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, markActive));
      document.removeEventListener("visibilitychange", check);
      clearInterval(interval);
    };
  }, [timeoutMs]);
}
