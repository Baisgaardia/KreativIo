import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Check, Crosshair, Maximize2, Minimize2, Pin, PinOff } from 'lucide-react';
import { Coordinates } from '../utils/geo';

interface GuessMapProps {
  selectedGuess: Coordinates | null;
  onSelectGuess: (coords: Coordinates) => void;
  onLockGuess: () => void;
  roundKey: string;
}

function createGuessMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: 'oecd-guess-pin',
    html: `
      <div style="
        width: 22px;
        height: 22px;
        border-radius: 9999px;
        background: #0EA5E9;
        border: 3px solid #ffffff;
        box-shadow: 0 4px 14px rgba(14, 165, 233, 0.65), 0 0 0 4px rgba(14, 165, 233, 0.25);
        transform: translate(-11px, -11px);
      "></div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function GuessMap({
  selectedGuess,
  onSelectGuess,
  onLockGuess,
  roundKey,
}: GuessMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);

  const isExpanded = isHovered || isPinnedOpen;

  // Initialiser Leaflet-kort én gang
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [44, 14],
      zoom: 2,
      minZoom: 2,
      maxZoom: 14,
      worldCopyJump: true,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      const wrapped = e.latlng.wrap();
      onSelectGuess({ lat: wrapped.lat, lng: wrapped.lng });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nulstil kortets visning ved ny runde
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    map.setView([44, 14], 2, { animate: false });
  }, [roundKey]);

  // Opdater markør når brugeren klikker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!selectedGuess) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([selectedGuess.lat, selectedGuess.lng]);
    } else {
      markerRef.current = L.marker([selectedGuess.lat, selectedGuess.lng], {
        icon: createGuessMarkerIcon(),
      }).addTo(map);
    }
  }, [selectedGuess]);

  // Opdater Leaflet-størrelsen når kortet udvides/minimeres
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const t1 = window.setTimeout(() => map.invalidateSize(), 120);
    const t2 = window.setTimeout(() => map.invalidateSize(), 260);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [isExpanded]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed bottom-3 right-3 z-30 flex flex-col overflow-hidden rounded-2xl border border-slate-700/90 bg-[#0B1120]/96 shadow-2xl backdrop-blur-xl transition-all duration-200 ease-out ${
        isExpanded
          ? 'h-[405px] w-[min(560px,calc(100vw-24px))] opacity-100'
          : 'h-[224px] w-[305px] opacity-95'
      }`}
    >
      {/* Kompakt header over gættekortet */}
      <div className="flex items-center justify-between border-b border-slate-800/90 px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <Crosshair className="h-3.5 w-3.5 text-sky-400" />
          <span>Gættekort</span>
          {selectedGuess && (
            <span className="font-mono text-[10.5px] font-normal text-sky-300 tabular-nums">
              {selectedGuess.lat.toFixed(2).replace('.', ',')}°,{' '}
              {selectedGuess.lng.toFixed(2).replace('.', ',')}°
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsPinnedOpen((p) => !p)}
            title={isPinnedOpen ? 'Frigør kortstørrelse' : 'Fastgør udvidet kort'}
            className={`flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition ${
              isPinnedOpen
                ? 'bg-sky-500/20 text-sky-300'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {isPinnedOpen ? (
              <>
                <PinOff className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Frigør</span>
              </>
            ) : (
              <>
                <Pin className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Fastgør</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsPinnedOpen((p) => !p)}
            aria-label={isExpanded ? 'Minimer gættekort' : 'Udvid gættekort'}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            {isExpanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Selve Leaflet-kortet */}
      <div className="relative flex-1">
        <div ref={containerRef} className="h-full w-full cursor-crosshair" />
        {!selectedGuess && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 z-[400] -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-700/80 bg-[#090D16]/88 px-2.5 py-1 text-[11px] text-slate-300 backdrop-blur-sm">
            Klik på kortet for at placere din nål
          </div>
        )}
      </div>

      {/* Lås gæt-knap */}
      <div className="border-t border-slate-800/90 bg-[#0B1120] p-2.5">
        <button
          type="button"
          onClick={onLockGuess}
          disabled={!selectedGuess}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold tracking-tight transition ${
            selectedGuess
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:scale-[0.99]'
              : 'cursor-not-allowed bg-slate-800/90 text-slate-500'
          }`}
        >
          <Check className="h-4 w-4 stroke-[2.5]" />
          <span>{selectedGuess ? 'Lås gæt' : 'Sæt en nål for at låse gæt'}</span>
        </button>
      </div>
    </div>
  );
}
