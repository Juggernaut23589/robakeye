"use client";

import { useState } from "react";
import { ProductImage } from "@/components/catalogue/product-image";

export function ImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col gap-2">
      <ProductImage
        src={images[active] ?? null}
        alt={alt}
        loading="eager"
        className="aspect-square w-full rounded-rk-lg border border-rk-n200"
      />
      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((img, i) => (
            <button
              key={img}
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
              aria-pressed={i === active}
              className={`size-16 overflow-hidden rounded-rk-sm border-2 ${i === active ? "border-rk-navy" : "border-transparent"}`}
            >
              <ProductImage src={img} alt="" className="size-full" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
