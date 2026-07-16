import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { Suggestion } from '../../../types';
import { colorOf } from '../map/severity';
import { useTheme } from '../../../context/ThemeContext';
import { useLang } from '../../../context/LanguageContext';

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
  onSelectSuggestion?: (sug: Suggestion) => void;
  center?: [number, number];
  zoom?: number;
  boundary?: any; // GeoJSON Feature of the constituency to highlight
}

// Fit the map to the constituency boundary and LOCK zoom-out at that level:
// the constituency always fills the view and the user can only zoom in / pan
// within it, never zoom out past the seat.
const FitBoundary: React.FC<{ data: any }> = ({ data }) => {
  const map = useMap();
  useEffect(() => {
    try {
      const bounds = L.geoJSON(data).getBounds();
      if (!bounds.isValid()) return;
      map.setMinZoom(0);                       // unlock before refitting (seat may change)
      map.fitBounds(bounds, { padding: [24, 24] });
      map.setMinZoom(map.getZoom());           // can't zoom out below the fitted level
      map.setMaxBounds(bounds.pad(0.4));       // keep panning around the constituency
    } catch {
      /* ignore malformed geometry */
    }
  }, [data, map]);
  return null;
};

// Custom map trigger to center coordinates dynamically
const ChangeView: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const MapView: React.FC<MapViewProps> = ({
  suggestions,
  onSelectSuggestion,
  center,
  zoom,
  boundary,
}) => {
  const { theme } = useTheme();
  const { t } = useLang();
  // Default to a national view of India; dashboards may pass a constituency centre.
  const defaultCenter: [number, number] = center || [22.9734, 78.6569];
  const zoomLevel = zoom ?? 5;
  // Match the basemap to the active theme
  const tileVariant = theme === 'light' ? 'light_all' : 'dark_all';

  // Marker colour = the shared, status-aware severity (same as the public map),
  // so an issue looks identical everywhere (resolved -> green regardless of score).
  const createMarkerIcon = (sug: Suggestion) => {
    const color = colorOf(sug);
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
    <div style={{ height: '460px', width: '100%', position: 'relative', overflow: 'hidden', borderRadius: '12px', isolation: 'isolate' }}>
      <MapContainer
        center={defaultCenter}
        zoom={zoomLevel}
        scrollWheelZoom={true}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          key={tileVariant}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={`https://{s}.basemaps.cartocdn.com/${tileVariant}/{z}/{x}/{y}{r}.png`}
        />
        {boundary ? (
          <>
            <GeoJSON
              key={JSON.stringify(boundary?.properties)}
              data={boundary}
              style={{ color: '#FF9933', weight: 2.5, fillColor: '#FF9933', fillOpacity: 0.1 }}
            />
            <FitBoundary data={boundary} />
          </>
        ) : (
          <ChangeView center={defaultCenter} zoom={zoomLevel} />
        )}

        {/* Suggestion Markers */}
        {suggestions
          .filter((s) => s.latitude && s.longitude)
          .map((sug) => {
            const markerCoords: [number, number] = [Number(sug.latitude), Number(sug.longitude)];
            return (
              <Marker
                key={sug.id}
                position={markerCoords}
                icon={createMarkerIcon(sug)}
                eventHandlers={{
                  click: () => onSelectSuggestion && onSelectSuggestion(sug),
                }}
              >
                <Popup>
                  <div style={{ color: 'var(--text-dark)', fontFamily: 'var(--font-sans)', fontSize: '13px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                      {t('map.issue', { cat: t('category.' + (sug.category || 'General')) })}
                    </div>
                    <p style={{ margin: '4px 0', fontStyle: 'italic' }}>
                      "{sug.english_translation || sug.content}"
                    </p>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', fontSize: '11px' }}>
                      <span style={{
                        padding: '2px 6px',
                        background: colorOf(sug) + '22',
                        color: colorOf(sug),
                        borderRadius: '4px',
                        fontWeight: 600
                      }}>
                        {t('map.priority', { score: sug.priority_score })}
                      </span>
                      <span style={{
                        padding: '2px 6px',
                        background: '#e0f2fe',
                        color: '#075985',
                        borderRadius: '4px',
                        fontWeight: 600
                      }}>
                        {t('map.status', { status: t('status.' + sug.status) })}
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
