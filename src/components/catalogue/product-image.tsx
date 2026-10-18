"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Product photos come from two places (bundled demo assets and Cloudinary
// uploads). If one fails to load — a deleted upload, a path that changed —
// show a calm branded placeholder instead of the browser's broken-image icon.
export function ProductImage({
  src,
  alt,
  className,
  imgClassName,
  loading = "lazy",
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
}) {
  const [failed, setFailed] = useState(false);
  const showImage = !!src && !failed;

  return (
    <div className={cn("relative overflow-hidden bg-rk-n50", className)}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- mixed local + Cloudinary sources; next/image would need remotePatterns per upload host
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          onError={() => setFailed(true)}
          className={cn("size-full object-cover", imgClassName)}
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-1 bg-rk-lavender-mist text-rk-lavender-deep">
          <ImageOff className="size-6" aria-hidden />
          <span className="sr-only">{alt}</span>
          <span aria-hidden className="text-[0.65rem] font-semibold tracking-wide uppercase">
            Photo coming soon
          </span>
        </div>
      )}
    </div>
  );
}
