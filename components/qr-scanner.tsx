"use client";

import { useEffect, useRef } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  isActive: boolean;
}

function isBenignPlayAbort(el: HTMLMediaElement, err: unknown) {
  return (
    err instanceof DOMException &&
    err.name === "AbortError" &&
    (!el.isConnected || !el.srcObject)
  );
}

function patchMediaPlay() {
  const original = HTMLMediaElement.prototype.play;
  const wrapped = function (this: HTMLMediaElement) {
    const result = original.call(this);
    void result.catch((err) => {
      if (!isBenignPlayAbort(this, err)) {
        void Promise.reject(err);
      }
    });
    return result;
  };
  HTMLMediaElement.prototype.play = wrapped;
  return () => {
    if (HTMLMediaElement.prototype.play === wrapped) {
      HTMLMediaElement.prototype.play = original;
    }
  };
}

function stopCamera(container: HTMLDivElement | null) {
  if (!container) return;
  const videos = container.querySelectorAll("video");
  videos.forEach((video) => {
    video.onabort = null;
    video.onerror = null;
    const stream = video.srcObject as MediaStream | null;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }
  });
  container.innerHTML = "";
}

export default function QRScanner({ onScan, isActive }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const restorePlay = patchMediaPlay();
    let cancelled = false;
    const container = containerRef.current;
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    const startPromise = scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          if (!cancelled) onScan(decodedText);
        },
        () => {}
      )
      .catch((err) => {
        console.error("QR Scanner error:", err);
      });

    const teardown = () => {
      cancelled = true;
      scannerRef.current = null;
      container.querySelectorAll("video").forEach((video) => {
        video.onabort = null;
        video.onerror = null;
      });
      startPromise
        .then(() => {
          if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
            return scanner.stop();
          }
        })
        .catch(() => {})
        .finally(() => stopCamera(container));
    };

    window.addEventListener("pagehide", teardown);

    return () => {
      window.removeEventListener("pagehide", teardown);
      teardown();
      restorePlay();
    };
  }, [isActive, onScan]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        id="qr-reader"
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
