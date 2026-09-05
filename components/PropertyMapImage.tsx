"use client";

import { useEffect, useState } from "react";
import { googleStaticMapUrl, mapImageProxyUrl, osmEmbedMapUrl } from "@/lib/maps";

type PropertyMapImageProps = {
  lat?: number | null;
  lon?: number | null;
  alt?: string;
  className?: string;
  /** Thumbnails must stay image-only — iframes look broken in small slots. */
  variant?: "full" | "thumb";
};

type MapSource = "loading" | "google-static" | "api-proxy" | "osm" | "unavailable";

let cachedGoogleKey: string | null | undefined;

function loadGoogleMapsKey(): Promise<string | null> {
  if (cachedGoogleKey !== undefined) {
    return Promise.resolve(cachedGoogleKey);
  }

  return fetch("/api/maps-config")
    .then((response) => (response.ok ? response.json() : null))
    .then((data: { googleMapsKey?: string } | null) => {
      cachedGoogleKey = data?.googleMapsKey?.trim() || null;
      return cachedGoogleKey;
    })
    .catch(() => {
      cachedGoogleKey = null;
      return null;
    });
}

export function PropertyMapImage({
  lat,
  lon,
  alt = "Property map preview",
  className,
  variant = "full",
}: PropertyMapImageProps) {
  const [googleKey, setGoogleKey] = useState<string | null>(cachedGoogleKey ?? null);
  const [source, setSource] = useState<MapSource>(
    cachedGoogleKey === undefined ? "loading" : cachedGoogleKey ? "google-static" : variant === "thumb" ? "unavailable" : "osm"
  );

  useEffect(() => {
    let cancelled = false;

    loadGoogleMapsKey().then((key) => {
      if (cancelled) return;
      setGoogleKey(key);
      if (key) setSource("google-static");
      else setSource(variant === "thumb" ? "unavailable" : "osm");
    });

    return () => {
      cancelled = true;
    };
  }, [variant]);

  const classNames = [className].filter(Boolean).join(" ");

  if (lat == null || lon == null || source === "unavailable") {
    return (
      <div className={["property-map-placeholder", classNames].filter(Boolean).join(" ")}>
        {variant === "thumb" ? "Map" : "Map preview unavailable"}
      </div>
    );
  }

  if (source === "loading") {
    return (
      <div className={["property-map-placeholder", classNames].filter(Boolean).join(" ")}>
        {variant === "thumb" ? "…" : "Loading map…"}
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

  if (source === "api-proxy") {
    return (
      <img
        src={mapImageProxyUrl(lat, lon)}
        alt={alt}
        className={["property-map-image", classNames].filter(Boolean).join(" ")}
        loading="lazy"
        onError={() => setSource(variant === "thumb" ? "unavailable" : "osm")}
      />
    );
  }

  if (source === "google-static" && googleKey) {
    return (
      <img
        src={googleStaticMapUrl(lat, lon, googleKey)}
        alt={alt}
        className={["property-map-image", classNames].filter(Boolean).join(" ")}
        loading="lazy"
        onError={() => setSource("api-proxy")}
      />
    );
  }

  return (
    <div className={["property-map-placeholder", classNames].filter(Boolean).join(" ")}>
      {variant === "thumb" ? "Map" : "Map preview unavailable"}
    </div>
  );
}
