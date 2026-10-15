"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { FREE_DELIVERY_THRESHOLD_KOBO } from "@/lib/constants";
import { formatNaira } from "@/lib/utils";

const MESSAGES = [
  <>Free delivery on orders above <b className="text-rk-amber">{formatNaira(FREE_DELIVERY_THRESHOLD_KOBO)}</b></>,
  <>Flagship branch now open — full vet clinic!</>,
];
const ROTATE_MS = 6500;
const DISMISS_KEY = "robakeye-announcement-dismissed";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}
function getSnapshot() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}
function getServerSnapshot() {
  return false;
}

export function AnnouncementBar() {
  const [index, setIndex] = useState(0);
  // useSyncExternalStore is the React-sanctioned way to read a synchronous
  // external store (sessionStorage) without a setState-in-effect — it also
  // re-renders automatically if another tab changes the same key.
  const storedDismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [localDismissed, setLocalDismissed] = useState(false);
  const dismissed = storedDismissed || localDismissed;

  useEffect(() => {
    if (dismissed) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [dismissed]);

  if (dismissed) return null;

  function dismiss() {
    setLocalDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // sessionStorage unavailable (private mode) — dismissal just won't persist, non-fatal.
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 bg-rk-navy px-4 py-2 text-center text-sm font-semibold text-white">
      <span>{MESSAGES[index]}</span>
      <button
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="ml-3 font-mono opacity-60 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
