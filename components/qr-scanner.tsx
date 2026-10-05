"use client";

import { useEffect, useId, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  isActive: boolean;
}

function isBenignPlayInterruption(err: unknown) {
  if (!err) return false;
  const name =
    err instanceof DOMException ? err.name : (err as { name?: unknown }).name;
  const message =
    err instanceof Error
      ? err.message
      : String((err as { message?: unknown }).message ?? err);
  if (name === "AbortError") return true;
  // Chrome: "The play() request was interrupted by a call to pause()."
  //         "The play() request was interrupted because the media was removed from the document."
  return (
    typeof message === "string" &&
    (message.includes("play() request was interrupted") ||
      message.includes("media was removed from the document"))
  );
}

// Shutdown DOM races (double-teardown, StrictMode remount, unmount during
// start) all surface here. None of them affect the camera stream itself,
// so they must never surface as errors.
function isIgnorableShutdownError(err: unknown) {
  if (isBenignPlayInterruption(err)) return true;
  const message =
    err instanceof Error
      ? `${err.name}: ${err.message}`
      : String((err as { message?: unknown }).message ?? err);
  return (
    /removeChild/i.test(message) ||
    /not of type 'Node'|not of type "Node"/i.test(message) ||
    /NotFoundError/i.test(message) ||
    /not.*(scann|start|run)|no.*scann/i.test(message) ||
    /clear/i.test(message)
  );
}

// Installed once for the lifetime of the app — never removed on unmount.
// Removing the patch on teardown re-exposes pending play() promises from
// html5-qrcode internals, which is what surfaces as an unhandled rejection.
let mediaGuardInstalled = false;

function ensureMediaPlayGuard() {
  if (mediaGuardInstalled) return;
  if (typeof window === "undefined" || typeof HTMLMediaElement === "undefined")
    return;
  mediaGuardInstalled = true;

  window.addEventListener("unhandledrejection", (event) => {
    if (isBenignPlayInterruption(event.reason)) event.preventDefault();
  });

  const proto = HTMLMediaElement.prototype;
  const original = proto.play;
  if (typeof original !== "function") return;

  function wrapped(this: HTMLMediaElement) {
    let result: Promise<void>;
    try {
      result = original.call(this) as unknown as Promise<void>;
    } catch (err) {
      if (!isBenignPlayInterruption(err)) throw err;
      return Promise.resolve();
    }
    if (!result || typeof result.catch !== "function") return result;
    // Return the handled promise so neither our caller nor html5-qrcode
    // internals ever observe an unhandled rejection for benign races.
    return result.catch((err: unknown) => {
      if (isBenignPlayInterruption(err)) return;
      console.error("Media play failed:", err);
    });
  }

  proto.play = wrapped as typeof original;
}

function pauseVideosSync(root: ParentNode | null) {
  if (!root) return;
  root.querySelectorAll("video").forEach((video) => {
    try {
      video.pause();
    } catch {
      // pause() can throw AbortError mid-teardown — safe to ignore.
    }
  });
}

function stopTracksSync(root: ParentNode | null) {
  if (!root) return;
  root.querySelectorAll("video").forEach((video) => {
    const stream = video.srcObject as MediaStream | null;
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Already stopped — ignore.
        }
      });
      video.srcObject = null;
    }
    video.removeAttribute("src");
  });
}

async function shutdownScanner(scanner: Html5Qrcode, host: HTMLElement | null) {
  // Always attempt stop() — never gate on getState(). If the user presses
  // Stop while start() is still pending, the state isn't SCANNING yet and
  // gating here is exactly what leaks the stream (camera light stays on).
  try {
    await scanner.stop();
  } catch (err) {
    if (!isIgnorableShutdownError(err)) console.error("Scanner stop:", err);
  }
  // Release the hardware even if stop() above raced and missed it.
  stopTracksSync(host);
  try {
    scanner.clear();
  } catch (err) {
    if (!isIgnorableShutdownError(err)) console.error("Scanner clear:", err);
  }
}

export default function QRScanner({ onScan, isActive }: QRScannerProps) {
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const runRef = useRef(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    // The scanner only ever starts from an explicit user click
    // (parent renders <QRScanner> only after "Start Scanner" is pressed),
    // so this effect never fires on bare page load — that user activation
    // is what keeps play() from racing mount/unmount.
    if (!isActive || !containerRef.current) return;

    ensureMediaPlayGuard();

    const container = containerRef.current;
    // Fresh host per effect run, owned solely by this scanner instance.
    // Sharing one div across StrictMode remounts / rapid Start→Stop lets
    // one run's clear()/innerHTML wipe the other run's <video> mid-play,
    // which throws removeChild / play()-interrupted errors.
    const run = ++runRef.current;
    const host = document.createElement("div");
    host.id = `qr-reader-${reactId}-${run}-${Date.now().toString(36)}`;
    container.appendChild(host);

    const scanner = new Html5Qrcode(host.id);
    let tornDown = false;
    let observer: MutationObserver | null = null;

    // Mute + inline playback on whatever <video> html5-qrcode injects.
    // This satisfies autoplay policy so play() doesn't get interrupted.
    if (typeof MutationObserver !== "undefined") {
      observer = new MutationObserver(() => {
        host.querySelectorAll("video").forEach((video) => {
          if (!video.muted) video.muted = true;
          video.setAttribute("muted", "");
          video.setAttribute("playsinline", "");
          (video as HTMLVideoElement & { playsInline?: boolean }).playsInline =
            true;
        });
      });
      observer.observe(host, { childList: true, subtree: true });
    }

    const startPromise = scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => {
          if (!tornDown) onScanRef.current(decodedText);
        },
        () => {}
      )
      .catch((err) => {
        // Teardown races (scan success / Stop press / unmount while play()
        // is pending) land here — swallow silently, log only real failures.
        if (!tornDown && !isBenignPlayInterruption(err)) {
          console.error("QR Scanner error:", err);
        }
      });

    const teardown = () => {
      if (tornDown) return;
      tornDown = true;
      // Synchronous pause FIRST, while the <video> is still in the document.
      // This is the step that prevents "media was removed from the document".
      pauseVideosSync(host);
      observer?.disconnect();
      // Wait for start() to settle before stopping. Stopping while start()
      // is still in-flight is a no-op, and the start resolving afterwards
      // re-enables the camera with no owner — the "light stays on" leak.
      void (async () => {
        try {
          await startPromise;
        } catch {
          // start failure already handled above — still run shutdown
          // so any half-acquired stream gets released.
        }
        await shutdownScanner(scanner, host);
        // Remove only our own host — never touch the shared container,
        // which may already host a newer run's scanner.
        try {
          host.remove();
        } catch (err) {
          if (!isIgnorableShutdownError(err)) console.error("Scanner cleanup:", err);
        }
      })();
    };

    window.addEventListener("pagehide", teardown);

    return () => {
      window.removeEventListener("pagehide", teardown);
      teardown();
    };
    // reactId is stable per mount; onScan is read via ref to avoid
    // restarting the camera when the parent re-renders.
  }, [isActive, reactId]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="w-[288px] h-[288px] mx-auto rounded-lg overflow-hidden border-2 border-slate-200"
      />
      {isActive && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-64 h-64 border-2 border-emerald-500 rounded-lg" />
        </div>
      )}
    </div>
  );
}
