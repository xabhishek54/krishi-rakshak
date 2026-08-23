import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface DistrictPoint {
  district: string;
  state: string;
  avg_score: number;
  risk_level: string;
  farmer_count: number;
  lat: number;
  lon: number;
}

interface CommunityMapProps {
  districts: DistrictPoint[];
}

export default function CommunityMap({ districts }: CommunityMapProps) {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Critical': return '#ef4444';
      case 'High': return '#f97316';
      case 'Elevated': return '#f59e0b';
      case 'Watch': return '#facc15';
      default: return '#22c55e';
    }
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Center on central India
    const map = L.map(containerRef.current, {
      center: [22.973, 78.656],
      zoom: 5,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update circles when districts change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing layers other than tile layer
    mapRef.current.eachLayer((layer: any) => {
      if (layer instanceof L.CircleMarker) {
        mapRef.current.removeLayer(layer);
      }
    });

    const bounds: any[] = [];

    districts.forEach((d) => {
      if (!d.lat || !d.lon) return;

      const color = getRiskColor(d.risk_level);
      const circle = L.circleMarker([d.lat, d.lon], {
        radius: Math.max(10, Math.min(25, d.farmer_count * 5 + 8)),
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.7,
      }).addTo(mapRef.current);

      circle.bindPopup(`
        <div style="font-family: Inter, sans-serif; text-align: left;">
          <h4 style="margin: 0 0 4px 0; font-weight: 800; font-size: 14px; color: #0f172a;">${d.district}</h4>
          <p style="margin: 0 0 8px 0; font-size: 11px; color: #64748b;">${d.state}</p>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="background: ${color}; color: #ffffff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase;">
              ${d.risk_level}
            </span>
            <span style="font-size: 11px; font-weight: 600; color: #1e293b;">Score: ${Math.round(d.avg_score)}/100</span>
          </div>
          <p style="margin: 0; font-size: 11px; color: #475569;">👤 <b>${d.farmer_count}</b> registered farmer${d.farmer_count !== 1 ? 's' : ''}</p>
        </div>
      `);

      bounds.push([d.lat, d.lon]);
    });

    // Fit map bounds to show all markers if any
    if (bounds.length > 0) {
      mapRef.current.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 8 });
    }
  }, [districts]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-earth-200">
      <div ref={containerRef} style={{ height: '350px', width: '100%', zIndex: 1 }} />
    </div>
  );
}
