"use client";

import { useEffect, useState } from "react";
import { googleStaticMapUrl, mapImageProxyUrl, osmEmbedMapUrl } from "@/lib/maps";

type PropertyMapImageProps = {
  lat?: number | null;
  lon?: number | null;
  alt?: string;
  className?: string;
};

type MapSource = "loading" | "google-static" | "api-proxy" | "osm";

export function PropertyMapImage({ lat, lon, alt = "Property map preview", className }: PropertyMapImageProps) {
  const [googleKey, setGoogleKey] = useState<string | null>(null);
  const [source, setSource] = useState<MapSource>("loading");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/maps-config")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { googleMapsKey?: string } | null) => {
        if (cancelled) return;
        const key = data?.googleMapsKey?.trim() || null;
        setGoogleKey(key);
        setSource(key ? "google-static" : "osm");
      })
      .catch(() => {
        if (!cancelled) setSource("osm");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const classNames = [className].filter(Boolean).join(" ");

  if (lat == null || lon == null) {
    return (
      <div className={["property-map-placeholder", classNames].filter(Boolean).join(" ")}>
        Map preview unavailable
      </div>
    );
  }

  if (source === "loading") {
    return (
      <div className={["property-map-placeholder", classNames].filter(Boolean).join(" ")}>
        Loading map…
      </div>
    );
  }

  if (source === "osm") {
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
        onError={() => setSource("osm")}
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
      Map preview unavailable
    </div>
  );
}
