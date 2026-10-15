"use client";

import { useState } from "react";

export function ImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-rk-md bg-rk-n50 text-sm text-rk-n400">
        No image available
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-rk-md bg-rk-n50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[active]} alt={alt} className="size-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((img, i) => (
            <button
              key={img}
              onClick={() => setActive(i)}
              className={`size-14 overflow-hidden rounded-rk-sm border-2 ${i === active ? "border-rk-navy" : "border-transparent"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
