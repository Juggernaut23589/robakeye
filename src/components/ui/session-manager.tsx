"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { revokeSession, logoutAllDevices, logoutOtherDevices } from "@/actions/sessions";

type SessionRow = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastSeenAt: Date;
  expires: Date;
};

export function SessionManager({
  sessions,
  currentSessionId,
}: {
  sessions: SessionRow[];
  currentSessionId: string | null;
}) {
  const [rows, setRows] = useState(sessions);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function onRevoke(id: string) {
    startTransition(async () => {
      const result = await revokeSession(id);
      if (result.ok) setRows((r) => r.filter((row) => row.id !== id));
    });
  }

  function onLogoutOthers() {
    startTransition(async () => {
      await logoutOtherDevices();
      setRows((r) => r.filter((row) => row.id === currentSessionId));
      setMessage("Signed out of every other device.");
    });
  }

  function onLogoutAll() {
    startTransition(async () => {
      await logoutAllDevices();
      // Our own Session row + sessionVersion are already invalidated
      // server-side; signOut() clears this browser's NextAuth cookie too
      // so it doesn't linger until the next request's jwt() revalidation.
      await signOut({ callbackUrl: "/login" });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <button
          onClick={onLogoutOthers}
          disabled={pending}
          className="rounded-rk-pill border border-rk-navy px-4 py-2 text-sm font-medium text-rk-navy disabled:opacity-60"
        >
          Log out other devices
        </button>
        <button
          onClick={onLogoutAll}
          disabled={pending}
          className="rounded-rk-pill bg-rk-alert px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Log out everywhere
        </button>
      </div>
      {message && <p className="text-sm text-rk-success">{message}</p>}

      <ul className="flex flex-col divide-y divide-rk-n200">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between py-3 text-sm">
            <div>
              <p className="font-medium text-rk-ink">
                {row.userAgent ?? "Unknown device"}
                {row.id === currentSessionId && (
                  <span className="ml-2 rounded-rk-pill bg-rk-success-tint px-2 py-0.5 text-xs text-rk-success">
                    This device
                  </span>
                )}
              </p>
              <p className="text-rk-n600">
                {row.ipAddress ?? "Unknown IP"} · last seen{" "}
                {new Date(row.lastSeenAt).toLocaleString()}
              </p>
            </div>
            {row.id !== currentSessionId && (
              <button
                onClick={() => onRevoke(row.id)}
                disabled={pending}
                className="text-rk-alert"
              >
                Revoke
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
