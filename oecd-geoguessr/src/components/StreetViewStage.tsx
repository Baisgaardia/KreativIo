import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { GameLocation } from '../config/locations';

interface StreetViewStageProps {
  location: GameLocation;
  viewMode: 'streetview' | 'aerial';
  isLocked?: boolean;
}

/**
 * Hovedvisning til Google Street View-iframe (med satellit-backup uden stednavne,
 * samt sløring når runden kræver oplåsning via IØ-sammenhængsanalysen).
 */
export function StreetViewStage({
  location,
  viewMode,
  isLocked = false,
}: StreetViewStageProps) {
  const aerialContainerRef = useRef<HTMLDivElement | null>(null);
  const aerialMapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (viewMode !== 'aerial' || !aerialContainerRef.current) return;

    if (aerialMapRef.current) {
      aerialMapRef.current.remove();
      aerialMapRef.current = null;
    }

    const map = L.map(aerialContainerRef.current, {
      center: [location.lat, location.lng],
      zoom: 16,
      minZoom: 13,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 18,
        attribution: 'Luftfoto: Esri World Imagery',
      }
    ).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    const pulseMarker = L.circleMarker([location.lat, location.lng], {
      radius: 8,
      color: '#34d399',
      weight: 2.5,
      fillColor: '#10b981',
      fillOpacity: 0.45,
    }).addTo(map);
    pulseMarker.bindTooltip('Lokationspunkt', { direction: 'top' });

    aerialMapRef.current = map;

    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      window.clearTimeout(timer);
      map.remove();
      aerialMapRef.current = null;
    };
  }, [location.lat, location.lng, viewMode]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#060911]">
      <div
        className={`h-full w-full transition-all duration-500 ${
          isLocked ? 'pointer-events-none scale-105 brightness-[0.28] blur-2xl' : ''
        }`}
      >
        {viewMode === 'streetview' ? (
          <iframe
            key={location.id + location.streetViewEmbedUrl}
            src={location.streetViewEmbedUrl}
            title="Google Street View af ukendt OECD-land"
            className="h-full w-full border-0"
            loading="eager"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div ref={aerialContainerRef} className="h-full w-full" />
        )}
      </div>

      {/* Diskret øverste gradient-maske, så Google-embeddets øverste adressefelt ikke afslører landet */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-[#090D16] via-[#090D16]/75 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-10 h-28 w-80 bg-gradient-to-br from-[#090D16] via-[#090D16]/90 to-transparent"
      />
    </div>
  );
}
