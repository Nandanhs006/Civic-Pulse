import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Suggestion, Ward } from '../../../types';

// Resolve Leaflet marker assets icon mismatch in Webpack/Vite
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewProps {
  suggestions: Suggestion[];
  wards: Ward[];
  onSelectSuggestion?: (sug: Suggestion) => void;
}

// Custom map trigger to center coordinates dynamically
const ChangeView: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const MapView: React.FC<MapViewProps> = ({ suggestions, wards, onSelectSuggestion }) => {
  // Center on constituency (Default seed coordinates)
  const defaultCenter: [number, number] = [27.7172, 85.3240];
  const zoomLevel = 13;

  // Custom icon colors based on priority score (red = high, yellow = medium, green = low)
  const createMarkerIcon = (priority: number, category: string | null) => {
    let color = 'hsl(142, 70%, 45%)'; // green
    if (priority > 75) {
      color = 'hsl(346, 84%, 55%)'; // red
    } else if (priority > 45) {
      color = 'hsl(38, 92%, 50%)'; // yellow
    }

    return L.divIcon({
      html: `<div style="
        background-color: ${color};
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 10px rgba(0,0,0,0.5);
      "></div>`,
      className: 'custom-leaflet-marker',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  };

  return (
    <div style={{ height: '460px', width: '100%', position: 'relative', overflow: 'hidden', borderRadius: '12px' }}>
      <MapContainer 
        center={defaultCenter} 
        zoom={zoomLevel} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <ChangeView center={defaultCenter} zoom={zoomLevel} />

        {/* Suggestion Markers */}
        {suggestions
          .filter((s) => s.latitude && s.longitude)
          .map((sug) => {
            const markerCoords: [number, number] = [Number(sug.latitude), Number(sug.longitude)];
            return (
              <Marker
                key={sug.id}
                position={markerCoords}
                icon={createMarkerIcon(sug.priority_score, sug.category)}
                eventHandlers={{
                  click: () => onSelectSuggestion && onSelectSuggestion(sug),
                }}
              >
                <Popup>
                  <div style={{ color: 'var(--text-dark)', fontFamily: 'var(--font-sans)', fontSize: '13px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                      {sug.category || 'General'} Issue
                    </div>
                    <p style={{ margin: '4px 0', fontStyle: 'italic' }}>
                      "{sug.english_translation || sug.content}"
                    </p>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', fontSize: '11px' }}>
                      <span style={{
                        padding: '2px 6px',
                        background: sug.priority_score > 75 ? '#fee2e2' : '#fef3c7',
                        color: sug.priority_score > 75 ? '#991b1b' : '#92400e',
                        borderRadius: '4px',
                        fontWeight: 600
                      }}>
                        Priority: {sug.priority_score}/100
                      </span>
                      <span style={{
                        padding: '2px 6px',
                        background: '#e0f2fe',
                        color: '#075985',
                        borderRadius: '4px',
                        fontWeight: 600
                      }}>
                        Status: {sug.status}
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
};

export default MapView;
