"use client";

import { useEffect, useRef, useState } from "react";
import { getConsultMessages, sendConsultMessage, requestCallback } from "@/actions/consult";
import { Button } from "@/components/ui/button";

type Message = { id: string; senderKind: string; body: string; createdAt: Date };

const POLL_MS = 4000;

export function ChatWidget({ consultId }: { consultId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showCallback, setShowCallback] = useState(false);
  const [callbackPhone, setCallbackPhone] = useState("");
  const [callbackSaved, setCallbackSaved] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const rows = await getConsultMessages(consultId);
      if (!cancelled) setMessages(rows);
    }
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [consultId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const body = input;
    setInput("");
    await sendConsultMessage({ consultId, body });
    const rows = await getConsultMessages(consultId);
    setMessages(rows);
  }

  async function onRequestCallback(e: React.FormEvent) {
    e.preventDefault();
    const result = await requestCallback({ consultId, phone: callbackPhone });
    if (result.ok) setCallbackSaved(true);
  }

  return (
    <div className="flex h-96 flex-col rounded-rk-md border border-rk-n200">
      <div className="flex-1 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-rk-n600">
            A pharmacist will respond here shortly. You can also leave a message and continue
            browsing — we&apos;ll check back.
          </p>
        ) : (
          <div className="grid gap-2">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[80%] rounded-rk-md px-3 py-2 text-sm ${
                  m.senderKind === "PHARMACIST"
                    ? "self-start bg-rk-navy-tint text-rk-navy"
                    : "self-end bg-rk-amber-tint text-rk-amber-deep"
                }`}
              >
                {m.body}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="border-t border-rk-n200 p-2">
        {!showCallback ? (
          <>
            <form onSubmit={onSend} className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 rounded-rk-sm border border-rk-n200 px-3 py-1.5 text-sm"
              />
              <Button type="submit" size="sm">
                Send
              </Button>
            </form>
            <button
              onClick={() => setShowCallback(true)}
              className="mt-1.5 text-xs text-rk-blue underline"
            >
              No pharmacist available? Request a callback instead
            </button>
          </>
        ) : callbackSaved ? (
          <p className="text-sm text-rk-success">We&apos;ll call you back shortly.</p>
        ) : (
          <form onSubmit={onRequestCallback} className="flex gap-2">
            <input
              value={callbackPhone}
              onChange={(e) => setCallbackPhone(e.target.value)}
              placeholder="Your phone number"
              required
              className="flex-1 rounded-rk-sm border border-rk-n200 px-3 py-1.5 text-sm"
            />
            <Button type="submit" size="sm">
              Request callback
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
