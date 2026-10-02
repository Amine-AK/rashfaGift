"use client";

import { useEffect } from "react";

/** Registers /sw.js once (offline page + push notifications). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Not fatal: the app works without it, only offline + push are lost.
    });
  }, []);
  return null;
}
