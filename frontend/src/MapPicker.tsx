import { useEffect, useRef, useState } from 'react';

interface MapPickerProps {
  initialLat?: number;
  initialLon?: number;
  onLocationSelect: (lat: number, lon: number) => void;
}

export default function MapPicker({ initialLat = 20.08, initialLon = 74.11, onLocationSelect }: MapPickerProps) {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ lat: initialLat, lon: initialLon });
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  useEffect(() => {
    // Dynamically import leaflet to avoid SSR issues
    let L: any;
    let map: any;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;

      // Import leaflet dynamically
      const leafletModule = await import('leaflet');
      L = leafletModule.default;

      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      map = L.map(containerRef.current, {
        center: [initialLat, initialLon],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Place initial marker
      const marker = L.marker([initialLat, initialLon], { draggable: true }).addTo(map);
      marker.bindPopup('📍 Your farm location').openPopup();

      // Drag to move
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setCoords({ lat: parseFloat(pos.lat.toFixed(6)), lon: parseFloat(pos.lng.toFixed(6)) });
        onLocationSelect(parseFloat(pos.lat.toFixed(6)), parseFloat(pos.lng.toFixed(6)));
      });

      // Click to move marker
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        const newLat = parseFloat(lat.toFixed(6));
        const newLon = parseFloat(lng.toFixed(6));
        setCoords({ lat: newLat, lon: newLon });
        onLocationSelect(newLat, newLon);
      });

      mapRef.current = map;
      markerRef.current = marker;
      setLeafletLoaded(true);
    }

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // When parent changes initial coords (e.g. from state/district select), fly map there
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      mapRef.current.flyTo([initialLat, initialLon], 12, { animate: true, duration: 1 });
      markerRef.current.setLatLng([initialLat, initialLon]);
      setCoords({ lat: initialLat, lon: initialLon });
    }
  }, [initialLat, initialLon]);

  return (
    <div className="space-y-2">
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div className="relative rounded-xl overflow-hidden border border-earth-200">
        <div ref={containerRef} style={{ height: '240px', width: '100%' }} />
        {!leafletLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <div className="text-slate-400 text-xs flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-stable border-t-transparent rounded-full animate-spin" />
              Loading map…
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-3 text-xs text-slate-500">
        <span className="bg-earth-50 border border-earth-200 px-2 py-1 rounded-lg font-mono">
          📍 {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}
        </span>
        <span className="text-slate-400 self-center">Click map or drag pin to set location</span>
      </div>
    </div>
  );
}
