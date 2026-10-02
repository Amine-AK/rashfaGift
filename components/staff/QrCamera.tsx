"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";

/** Full-width rear-camera QR reader. Calls onResult once per scan, then pauses. */
export function QrCamera({ onResult, paused, labels }: { onResult: (text: string) => void; paused: boolean; labels: { denied: string; starting: string } }) {
  const video = useRef<HTMLVideoElement>(null);
  const handler = useRef(onResult);
  const [state, setState] = useState<"starting" | "on" | "denied">("starting");

  useEffect(() => {
    handler.current = onResult;
  }, [onResult]);

  useEffect(() => {
    const el = video.current;
    if (paused || !el) return;
    // Each run owns its own stream, so a late cleanup can never stop a newer run's camera.
    let cancelled = false;
    let stream: MediaStream | undefined;
    let controls: IScannerControls | undefined;
    const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 120, delayBetweenScanSuccess: 1500 });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: "environment", width: { ideal: 1280 } } });
      } catch {
        if (!cancelled) setState("denied");
        return;
      }
      if (cancelled) return stream.getTracks().forEach((t) => t.stop());
      controls = await reader.decodeFromStream(stream, el, (result, _err, ctl) => {
        if (result && !cancelled) {
          cancelled = true;
          ctl.stop();
          handler.current(result.getText());
        }
      });
      if (cancelled) controls.stop();
      else setState("on");
    })().catch(() => !cancelled && setState("denied"));
    return () => {
      cancelled = true;
      controls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [paused]);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-espresso">
      <video ref={video} className="size-full object-cover" muted playsInline />
      <div className="pointer-events-none absolute inset-[14%] rounded-3xl border-4 border-white/85 shadow-[0_0_0_9999px_rgb(0_0_0/0.35)]" />
      {state !== "on" && (
        <p className="absolute inset-0 grid place-items-center p-6 text-center text-lg font-bold text-white">
          {state === "denied" ? labels.denied : labels.starting}
        </p>
      )}
    </div>
  );
}
