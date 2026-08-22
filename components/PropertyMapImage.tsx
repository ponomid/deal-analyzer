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

  if (lat == null || lon == null || failed) {
    return (
      <div className={["property-map-placeholder", className].filter(Boolean).join(" ")}>
        Map preview unavailable
      </div>
    );
  }

  return (
    <img
      src={mapImageSrc(lat, lon)}
      alt={alt}
      className={["property-map-image", className].filter(Boolean).join(" ")}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}
