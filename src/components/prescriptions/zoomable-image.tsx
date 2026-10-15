"use client";

import { useState } from "react";

export function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <div className="overflow-auto rounded-rk-md border border-rk-n200 bg-rk-n50">
      <button
        onClick={() => setZoomed((z) => !z)}
        className="block w-full cursor-zoom-in"
        aria-label={zoomed ? "Zoom out" : "Zoom in"}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={zoomed ? "w-[200%] max-w-none cursor-zoom-out" : "w-full"}
        />
      </button>
      <p className="p-1 text-center text-xs text-rk-n400">Click image to {zoomed ? "zoom out" : "zoom in"}</p>
    </div>
  );
}
