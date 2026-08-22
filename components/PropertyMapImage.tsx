"use client";

import { useState } from "react";
import { mapImageSrc } from "@/lib/maps";

type PropertyMapImageProps = {
  lat?: number | null;
  lon?: number | null;
  alt?: string;
  className?: string;
};

export function PropertyMapImage({ lat, lon, alt = "Property map preview", className }: PropertyMapImageProps) {
  const [failed, setFailed] = useState(false);
  const [useApiFallback, setUseApiFallback] = useState(false);

  if (lat == null || lon == null || failed) {
    return (
      <div className={["property-map-placeholder", className].filter(Boolean).join(" ")}>
        Map preview unavailable
      </div>
    );
  }

  const src = useApiFallback
    ? `/api/map-image?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`
    : mapImageSrc(lat, lon);

  return (
    <img
      src={src}
      alt={alt}
      className={["property-map-image", className].filter(Boolean).join(" ")}
      onError={() => {
        if (!useApiFallback && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
          setUseApiFallback(true);
          return;
        }
        setFailed(true);
      }}
      loading="lazy"
    />
  );
}
