import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Club, ClubLocation } from "@/lib/mock-data";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue with Webpack/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom marker icons
const createCustomIcon = (isActive: boolean) => {
  const color = isActive ? "#10b981" : "#f59e0b"; // emerald-500 / amber-500
  const svgIcon = `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="${color}" opacity="0.3" stroke="${color}" stroke-width="2"/>
      <circle cx="16" cy="16" r="8" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="18" cy="14" r="2" fill="white" opacity="0.7"/>
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: "custom-marker-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

type LocationWithClub = ClubLocation & {
  club?: Club;
};

type ClubLocationMapProps = {
  locations: LocationWithClub[];
};

export default function ClubLocationMap({ locations }: ClubLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    // Initialize map only once
    if (!mapContainerRef.current || mapRef.current) return;

    // Calculate center point
    const center: [number, number] = locations.length > 0
      ? [
          locations.reduce((sum, loc) => sum + loc.locationPoint.y, 0) / locations.length,
          locations.reduce((sum, loc) => sum + loc.locationPoint.x, 0) / locations.length,
        ]
      : [40, -95]; // Default to center of US

    // Create the map
    const map = L.map(mapContainerRef.current).setView(center, 6);
    mapRef.current = map;

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add markers for each location
    locations.forEach((location) => {
      const isActive = location.isActive && (location.club?.isActive ?? false);
      const position: [number, number] = [
        location.locationPoint.y,
        location.locationPoint.x,
      ];

      // Create popup content with solid colors for visibility
      const popupContent = `
        <div style="padding: 16px; min-width: 240px; background: white; color: #1f2937;">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;">
            <div>
              <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.24em; color: #6b7280; margin: 0;">
                ${location.club?.name ?? "Club"}
              </p>
              <p style="font-size: 16px; font-weight: 600; color: #111827; margin: 4px 0 0 0;">
                ${location.name}
              </p>
            </div>
            <span style="display: inline-flex; align-items: center; border-radius: 9999px; padding: 4px 8px; font-size: 11px; font-weight: 500; background: ${isActive ? '#10b981' : '#f59e0b'}; color: white;">
              ${isActive ? "active" : "inactive"}
            </span>
          </div>
          <p style="margin: 12px 0 0 0; font-size: 14px; color: #6b7280;">
            ${location.address}
          </p>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #6b7280;">
              <svg style="height: 16px; width: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <span>
                ${location.locationPoint.y.toFixed(4)}, ${location.locationPoint.x.toFixed(4)}
              </span>
            </div>
            <button style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; border: 1px solid #e5e7eb; background: #f9fafb; cursor: pointer; transition: background 0.15s;" onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f9fafb'">
              <svg style="height: 16px; width: 16px; color: #6b7280;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </button>
          </div>
        </div>
      `;

      // Create marker with custom icon
      const marker = L.marker(position, {
        icon: createCustomIcon(isActive),
      })
        .bindPopup(popupContent, {
          closeButton: false,
          className: "custom-popup",
          autoPan: true,
        })
        .addTo(mapRef.current!);

      // Open popup on click (default Leaflet behavior, no custom listeners needed)
      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map((loc) => [loc.locationPoint.y, loc.locationPoint.x] as [number, number])
      );
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [locations]);

  return (
    <div className="relative h-full w-full">
      {/* Status Legend */}
      <div className="absolute bottom-6 left-6 z-[1000] flex items-center gap-4 rounded-full border bg-background/90 px-4 py-2 text-xs backdrop-blur-sm shadow-lg">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Active
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Inactive
        </span>
      </div>

      {/* Map Container */}
      <div 
        ref={mapContainerRef} 
        className="h-full w-full rounded-lg border shadow-lg"
        style={{ background: "#f1f5f9" }}
      />

      {/* Custom Styles for Leaflet Popup */}
      <style>{`
        .custom-popup .leaflet-popup-content-wrapper {
          background: white;
          border: 1px solid #e5e7eb;
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.15), 0 8px 10px -6px rgb(0 0 0 / 0.1);
          border-radius: 1rem;
          padding: 0;
          overflow: hidden;
        }
        
        .custom-popup .leaflet-popup-content {
          margin: 0;
          width: auto !important;
        }
        
        .custom-popup .leaflet-popup-tip {
          background: white;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        
        .custom-popup .leaflet-popup-close-button {
          top: 8px !important;
          right: 8px !important;
          width: 24px !important;
          height: 24px !important;
          font-size: 18px !important;
          font-weight: 400 !important;
          color: #6b7280 !important;
          background: #f9fafb !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 6px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
          line-height: 1 !important;
        }
        
        .custom-popup .leaflet-popup-close-button:hover {
          background: #e5e7eb !important;
          color: #374151 !important;
        }
        
        .custom-marker-icon {
          background: transparent;
          border: none;
        }
        
        .leaflet-container {
          font-family: inherit;
        }
        
        .leaflet-popup {
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
}
