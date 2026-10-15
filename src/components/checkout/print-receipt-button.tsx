"use client";

// Browser print-to-PDF is a legitimate "download a receipt" mechanism
// without building a PDF-generation pipeline for this milestone — the
// #receipt element it prints already has everything a receipt needs
// (order numbers, line items, totals).
export function PrintReceiptButton() {
  return (
    <button onClick={() => window.print()} className="text-sm text-rk-blue">
      Print / save receipt
    </button>
  );
}
