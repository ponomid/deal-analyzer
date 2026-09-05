"use client";

import { useState } from "react";
import { freeStaticMapUrl, mapImageProxyUrl, osmEmbedMapUrl } from "@/lib/maps";

type PropertyMapImageProps = {
  lat?: number | null;
  lon?: number | null;
  alt?: string;
  className?: string;
  /** Thumbnails must stay image-only — iframes look broken in small slots. */
  variant?: "full" | "thumb";
};

type MapSource = "api-proxy" | "free-static" | "osm" | "unavailable";

export function PropertyMapImage({
  lat,
  lon,
  alt = "Property map preview",
  className,
  variant = "full",
}: PropertyMapImageProps) {
  const [source, setSource] = useState<MapSource>("api-proxy");
  const classNames = [className].filter(Boolean).join(" ");

  if (lat == null || lon == null || source === "unavailable") {
    return (
      <div className={["property-map-placeholder", classNames].filter(Boolean).join(" ")}>
        {variant === "thumb" ? "Map" : "Map preview unavailable"}
      </div>
    );
  }

  if (source === "osm" && variant === "full") {
    return (
      <iframe
        title={alt}
        src={osmEmbedMapUrl(lat, lon)}
        className={["property-map-embed", classNames].filter(Boolean).join(" ")}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    );
  }

  if (source === "free-static") {
    const size = variant === "thumb" ? { width: 144, height: 108 } : { width: 640, height: 320 };
    return (
      <img
        src={freeStaticMapUrl(lat, lon, size.width, size.height)}
        alt={alt}
        className={["property-map-image", classNames].filter(Boolean).join(" ")}
        loading="lazy"
        onError={() => setSource(variant === "thumb" ? "unavailable" : "osm")}
      />
    );
  }

  return (
    <img
      src={mapImageProxyUrl(lat, lon)}
      alt={alt}
      className={["property-map-image", classNames].filter(Boolean).join(" ")}
      loading="lazy"
      onError={() => setSource("free-static")}
    />
  );
}
