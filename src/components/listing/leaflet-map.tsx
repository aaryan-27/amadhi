"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export interface MapMarker {
  lat: number;
  lng: number;
  label: string;
  href?: string;
  price?: string;
}

/**
 * Leaflet + OpenStreetMap (free, no API key).
 * Imported dynamically (ssr: false) by callers.
 */
export default function LeafletMap({
  markers,
  center,
  zoom = 13,
  className,
}: {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current || mapRef.current) return;

      const c: [number, number] =
        center ?? (markers.length ? [markers[0].lat, markers[0].lng] : [28.5355, 77.221]);

      const map = L.map(ref.current, { scrollWheelZoom: false }).setView(c, zoom);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: `<div style="background:#040c1e;color:#f4e3d1;border-radius:9999px;padding:4px 10px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(4,12,30,.35);border:1.5px solid #f4e3d1;">●</div>`,
        iconAnchor: [16, 16],
      });

      const group: import("leaflet").Marker[] = [];
      for (const m of markers) {
        const mk = L.marker([m.lat, m.lng], {
          icon: m.price
            ? L.divIcon({
                className: "",
                html: `<div style="background:#040c1e;color:#f4e3d1;border-radius:9999px;padding:4px 10px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(4,12,30,.35);">${m.price}</div>`,
                iconAnchor: [30, 14],
              })
            : icon,
          alt: m.label,
        }).addTo(map);
        mk.bindPopup(
          m.href
            ? `<a href="${m.href}" style="font-weight:600">${m.label}</a>`
            : `<strong>${m.label}</strong>`
        );
        group.push(mk);
      }
      if (markers.length > 1) {
        map.fitBounds(L.featureGroup(group).getBounds().pad(0.2));
      }
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ref} className={className ?? "h-80 w-full"} role="region" aria-label="Map of workspace locations" />;
}
