"use client";

import { useEffect, useState } from "react";
import { startConsult } from "@/actions/consult";
import { PrescriptionUploadForm } from "@/components/prescriptions/upload-form";
import { ChatWidget } from "@/components/consult/chat-widget";

export function ConsultPageClient({
  product,
}: {
  product: { id: string; name: string; class: string } | null;
}) {
  const [tab, setTab] = useState<"upload" | "chat">("upload");
  const [consultId, setConsultId] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "chat" || consultId) return;
    startConsult(product?.id).then((result) => {
      if (result.ok) setConsultId(result.consultId);
    });
  }, [tab, consultId, product?.id]);

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-rk-navy">Consult a Pharmacist</h1>
      {product && <p className="mt-1 text-rk-n600">Regarding: {product.name}</p>}

      <div className="mt-6 flex gap-2 border-b border-rk-n200">
        <button
          onClick={() => setTab("upload")}
          className={`px-3 py-2 text-sm font-semibold ${tab === "upload" ? "border-b-2 border-rk-navy text-rk-navy" : "text-rk-n600"}`}
        >
          Upload prescription
        </button>
        <button
          onClick={() => setTab("chat")}
          className={`px-3 py-2 text-sm font-semibold ${tab === "chat" ? "border-b-2 border-rk-navy text-rk-navy" : "text-rk-n600"}`}
        >
          Chat with a pharmacist
        </button>
      </div>

      <div className="mt-4">
        {tab === "upload" ? (
          product ? (
            <PrescriptionUploadForm initialProductId={product.id} />
          ) : (
            <p className="text-sm text-rk-n600">
              Start from a product page so we know which medicine your prescription is for.
            </p>
          )
        ) : consultId ? (
          <ChatWidget consultId={consultId} />
        ) : (
          <p className="text-sm text-rk-n600">Connecting…</p>
        )}
      </div>
    </div>
  );
}
