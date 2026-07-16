import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, GeoJSON, Popup, Circle, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import type { Feature, FeatureCollection } from 'geojson';
import apiClient from '../services/apiClient';
import { MapIssue, MP } from '../types';
import { useLang } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';
import MapLegend from '../components/features/map/MapLegend';
import MapFilters from '../components/features/map/MapFilters';
import IssueDetailPanel from '../components/features/map/IssueDetailPanel';
import { Severity, SEVERITY_COLOR, severityOf } from '../components/features/map/severity';
import { Loader2, ShieldAlert, Layers, LocateFixed, Navigation, X, Sparkles, Wind } from 'lucide-react';

interface SafetyPoint {
  id: number;
  latitude: number | null;
  longitude: number | null;
  hour: number | null;
}

/** Info shown in the tap-to-identify popup for a constituency polygon. */
interface ConstituencyPopup {
  latlng: L.LatLng;
  name: string;
  state: string;
  cid: number | null;
  mp: MP | null;
  loading: boolean;
}

// Saffron accent used for constituency outlines (matches the app's tricolour theme).
const ACCENT = '#FF9933';
const ACCENT_LINE = '#E8730C';

// India (mainland + islands) with a small margin. The map opens fitted to this
// and cannot be zoomed out or panned beyond it — India always fills the view.
const INDIA_BOUNDS = L.latLngBounds([6.0, 67.0], [37.6, 98.6]);
const INDIA_MAX_BOUNDS = L.latLngBounds([2.0, 62.0], [40.5, 102.5]);

/** Fits the map to India on load and locks the minimum zoom so it can't zoom out further. */
const FitIndia: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(INDIA_BOUNDS, { padding: [8, 8] });
    // Lock zoom-out at the India-fit level so the country always fills the display.
    map.setMinZoom(map.getBoundsZoom(INDIA_BOUNDS));
  }, [map]);
  return null;
};

/** When the safety layer is enabled with points, zoom to fit the hotspots. */
const SafetyFitter: React.FC<{ active: boolean; points: SafetyPoint[] }> = ({ active, points }) => {
  const map = useMap();
  useEffect(() => {
    if (!active || points.length === 0) return;
    const latlngs = points
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => [Number(p.latitude), Number(p.longitude)] as [number, number]);
    if (latlngs.length) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60], maxZoom: 13 });
    }
  }, [active, points, map]);
  return null;
};

/** Fits the map to a set of [lat,lng] points when `active` turns on. */
const FitPoints: React.FC<{ active: boolean; points: [number, number][]; maxZoom?: number }> = ({ active, points, maxZoom = 13 }) => {
  const map = useMap();
  useEffect(() => {
    if (active && points.length) {
      map.fitBounds(L.latLngBounds(points), { padding: [70, 70], maxZoom });
    }
  }, [active, points, map, maxZoom]);
  return null;
};

/** Flies the map to a target coordinate whenever it changes (for "Near me"). */
const FlyTo: React.FC<{ target: { lat: number; lng: number } | null }> = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 14, { duration: 0.8 });
  }, [target, map]);
  return null;
};

const meIcon = L.divIcon({
  className: 'me-marker',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 5px rgba(37,99,235,.25)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface CivicCenter {
  category: string;
  category_label: string;
  name: string;
  locality: string;
  latitude: number;
  longitude: number;
  distance_km: number;
}
interface AqiTrend {
  months: string[];
  values: number[];
  direction: 'up' | 'down' | 'flat';
  change_pct: number;
  modeled: boolean;
}
interface AqiStation {
  station: string;
  aqi: number;
  category: string;
  color: string;
  advice: string;
  dominant_pollutant: string;
  distance_km?: number;
  latitude: number;
  longitude: number;
  source?: string;
  trend?: AqiTrend;
}
interface NearMeInfo {
  constituency: string | null;
  state: string | null;
  mp: string | null;
  area: string | null;
  police: { name: string; distance_km: number; latitude: number; longitude: number } | null;
  air_quality: AqiStation | null;
  safety: { nearby_sos_24h: number };
  top_categories: { category: string; count: number }[];
  centers: CivicCenter[];
  summary: string;
}

const dirUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

const CATEGORY_EMOJI: Record<string, string> = {
  bangalore_one: '🏢',
  karnataka_one: '🏢',
  grama_one: '🏘️',
  csc_aadhaar: '🪪',
  waste: '♻️',
  help: '🆘',
};

const TREND_LABEL: Record<string, { txt: string; color: string; arrow: string }> = {
  up: { txt: 'Worsening', color: '#dc2626', arrow: '↑' },
  down: { txt: 'Improving', color: '#16a34a', arrow: '↓' },
  flat: { txt: 'Stable', color: '#6b7280', arrow: '→' },
};

/** 6-month AQI mini bar chart for the hotspot popup. */
const AqiSparkline: React.FC<{ trend: AqiTrend; color: string }> = ({ trend, color }) => {
  const max = Math.max(...trend.values, 1);
  const tl = TREND_LABEL[trend.direction];
  const n = trend.values.length;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 3 }}>6-MONTH TREND</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 40 }}>
        {trend.values.map((v, i) => (
          <div
            key={i}
            title={`${trend.months[i]}: AQI ${v}`}
            style={{ flex: 1, height: Math.max(3, (v / max) * 40), background: i === n - 1 ? color : '#cbd5e1', borderRadius: '2px 2px 0 0' }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#9ca3af', marginTop: 2 }}>
        {trend.months.map((m, i) => <span key={i}>{m}</span>)}
      </div>
      <div style={{ fontSize: 11, marginTop: 4, color: tl.color, fontWeight: 700 }}>
        {tl.arrow} {tl.txt} · {Math.abs(trend.change_pct)}% vs {trend.months[0]}
      </div>
    </div>
  );
};

const iconCache: Record<string, L.DivIcon> = {};
function sevIcon(sev: Severity): L.DivIcon {
  if (!iconCache[sev]) {
    iconCache[sev] = L.divIcon({
      html: `<div style="width:14px;height:14px;border-radius:50%;background:${SEVERITY_COLOR[sev]};border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.45)"></div>`,
      className: 'issue-marker',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
  }
  return iconCache[sev];
}

// Generic police shield marker (a neutral badge — NOT the official Bengaluru
// City Police emblem, to avoid implying official affiliation).
const policeIcon = L.divIcon({
  className: 'police-marker',
  html: `<div style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))">
    <svg width="20" height="22" viewBox="0 0 24 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 1 22 5v8c0 6-4.4 9.8-10 12C6.4 22.8 2 19 2 13V5L12 1Z" fill="#1e3a8a" stroke="#fff" stroke-width="1.4"/>
      <path d="M12 6.2l1.5 3 3.3.3-2.5 2.2.8 3.2L12 15.4 8.9 17l.8-3.2-2.5-2.2 3.3-.3L12 6.2Z" fill="#facc15"/>
    </svg></div>`,
  iconSize: [20, 22],
  iconAnchor: [10, 11],
});

/** Detail shown when a citizen/MP taps an SOS hotspot. */
interface SafetyPopupState {
  latlng: L.LatLng;
  loading: boolean;
  data: {
    constituency: string | null;
    state: string | null;
    mp: string | null;
    area: string | null;
    police: { name: string; distance_km: number; latitude: number; longitude: number } | null;
  } | null;
}

const LiveMap: React.FC = () => {
  const { t } = useLang();
  const { theme } = useTheme();
  const isMobile = useIsMobile();

  const [issues, setIssues] = useState<MapIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MapIssue | null>(null);

  // Constituency boundary overlay (loaded lazily the first time it's shown).
  const [boundaries, setBoundaries] = useState<FeatureCollection | null>(null);
  const [showBoundaries, setShowBoundaries] = useState(!isMobile);
  const [boundariesLoading, setBoundariesLoading] = useState(false);
  const [consPopup, setConsPopup] = useState<ConstituencyPopup | null>(null);

  // Base layers: state polygons (differentiated) + dotted national outline.
  const [baseLayers, setBaseLayers] = useState<{ states: FeatureCollection; outline: FeatureCollection } | null>(null);

  // Assembly (MLA) segments, loaded per-state when the user taps a state.
  const [showAssembly, setShowAssembly] = useState(false);
  const [acByState, setAcByState] = useState<FeatureCollection | null>(null);
  const [acLoadingState, setAcLoadingState] = useState<string | null>(null);

  // Women-safety SOS hotspots (anonymized).
  const [safetyPoints, setSafetyPoints] = useState<SafetyPoint[]>([]);
  const [showSafety, setShowSafety] = useState(false);
  const [safetyLoading, setSafetyLoading] = useState(false);
  const [safetyPopup, setSafetyPopup] = useState<SafetyPopupState | null>(null);

  // Bengaluru police stations layer.
  const [police, setPolice] = useState<FeatureCollection | null>(null);
  const [showPolice, setShowPolice] = useState(false);

  // Air-quality layer (CPCB via data.gov.in).
  const [aqiStations, setAqiStations] = useState<AqiStation[]>([]);
  const [showAqi, setShowAqi] = useState(false);
  const [aqiLoading, setAqiLoading] = useState(false);

  const [layersOpen, setLayersOpen] = useState(false);

  // "Near me" — locate the user and surface everything around them.
  const [nearMe, setNearMe] = useState<{ lat: number; lng: number } | null>(null);
  const [nearInfo, setNearInfo] = useState<NearMeInfo | null>(null);
  const [nearLoading, setNearLoading] = useState(false);

  // Filters
  const [selectedSeverities, setSelectedSeverities] = useState<Set<Severity>>(
    new Set(['critical', 'moderate', 'low', 'resolved'])
  );
  const [category, setCategory] = useState('');
  const [statusF, setStatusF] = useState('');

  useEffect(() => {
    apiClient
      .get<MapIssue[]>('/api/v1/suggestions/map')
      .then((r) => setIssues(r.data.filter((i) => i.latitude != null && i.longitude != null)))
      .catch((e) => console.error('Failed to load map issues', e))
      .finally(() => setLoading(false));
  }, []);

  // Lazy-load the boundary FeatureCollection the first time the overlay is on.
  useEffect(() => {
    if (!showBoundaries || boundaries || boundariesLoading) return;
    setBoundariesLoading(true);
    apiClient
      .get<FeatureCollection>('/api/v1/constituencies/boundaries')
      .then((r) => setBoundaries(r.data))
      .catch((e) => console.error('Failed to load constituency boundaries', e))
      .finally(() => setBoundariesLoading(false));
  }, [showBoundaries, boundaries, boundariesLoading]);

  // Lazy-load safety hotspots the first time the layer is enabled.
  useEffect(() => {
    if (!showSafety || safetyPoints.length > 0 || safetyLoading) return;
    setSafetyLoading(true);
    apiClient
      .get<SafetyPoint[]>('/api/v1/safety/incidents')
      .then((r) => setSafetyPoints(r.data.filter((p) => p.latitude != null && p.longitude != null)))
      .catch((e) => console.error('Failed to load safety hotspots', e))
      .finally(() => setSafetyLoading(false));
  }, [showSafety, safetyPoints.length, safetyLoading]);

  // Base layers (states + national outline) load once on mount.
  useEffect(() => {
    apiClient
      .get<{ states: FeatureCollection; outline: FeatureCollection }>('/api/v1/constituencies/base-layers')
      .then((r) => setBaseLayers(r.data))
      .catch((e) => console.error('Failed to load base layers', e));
  }, []);

  // Bengaluru police stations load the first time the layer is enabled.
  useEffect(() => {
    if (!showPolice || police) return;
    apiClient
      .get<FeatureCollection>('/api/v1/safety/police-stations')
      .then((r) => setPolice(r.data))
      .catch((e) => console.error('Failed to load police stations', e));
  }, [showPolice, police]);

  // Air-quality stations load the first time the layer is enabled.
  useEffect(() => {
    if (!showAqi || aqiStations.length > 0 || aqiLoading) return;
    setAqiLoading(true);
    apiClient
      .get<{ stations: AqiStation[] }>('/api/v1/airquality/stations')
      .then((r) => setAqiStations(r.data.stations || []))
      .catch((e) => console.error('Failed to load air quality', e))
      .finally(() => setAqiLoading(false));
  }, [showAqi, aqiStations.length, aqiLoading]);

  // Load a state's assembly segments when it's tapped (Assembly mode on).
  const loadStateAcs = React.useCallback((stateName: string) => {
    setAcLoadingState(stateName);
    apiClient
      .get<FeatureCollection>('/api/v1/constituencies/ac-boundaries', { params: { state: stateName } })
      .then((r) => setAcByState(r.data))
      .catch((e) => console.error('Failed to load assembly segments', e))
      .finally(() => setAcLoadingState(null));
  }, []);

  // "Near me": locate the user, fly there, and gather area/rep/police/SOS info.
  const locateMe = React.useCallback(() => {
    if (!navigator.geolocation) return;
    setNearLoading(true);
    setNearInfo(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setNearMe({ lat, lng });
        apiClient
          .get<NearMeInfo>('/api/v1/civic/near-me', { params: { lat, lng, radius_km: 6 } })
          .then((r) => setNearInfo(r.data))
          .catch((e) => console.error('Near-me lookup failed', e))
          .finally(() => setNearLoading(false));
      },
      () => setNearLoading(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // Tap an SOS hotspot -> resolve its area / constituency / nearest police.
  const openSafetyPopup = React.useCallback((latlng: L.LatLng) => {
    setSafetyPopup({ latlng, loading: true, data: null });
    apiClient
      .get('/api/v1/safety/incident-context', { params: { lat: latlng.lat, lng: latlng.lng } })
      .then((r) =>
        setSafetyPopup((prev) => (prev && prev.latlng.equals(latlng) ? { ...prev, loading: false, data: r.data } : prev))
      )
      .catch(() => setSafetyPopup((prev) => (prev ? { ...prev, loading: false } : prev)));
  }, []);

  const boundaryStyle = useMemo(
    () => ({
      color: ACCENT_LINE,
      weight: 1,
      fillColor: ACCENT,
      fillOpacity: 0.06,
    }),
    []
  );

  const onEachBoundary = React.useCallback(
    (feature: Feature, layer: L.Layer) => {
      const path = layer as L.Path;
      layer.on({
        mouseover: () => path.setStyle({ fillOpacity: 0.28, weight: 2, color: ACCENT }),
        mouseout: () => path.setStyle({ fillOpacity: 0.06, weight: 1, color: ACCENT_LINE }),
        click: (e: L.LeafletMouseEvent) => {
          const p = (feature.properties || {}) as {
            constituency_id: number | null;
            name: string;
            state: string;
          };
          setConsPopup({
            latlng: e.latlng,
            name: p.name,
            state: p.state,
            cid: p.constituency_id,
            mp: null,
            loading: p.constituency_id != null,
          });
          if (p.constituency_id != null) {
            apiClient
              .get<MP>(`/api/v1/mps/${p.constituency_id}`)
              .then((r) =>
                setConsPopup((prev) =>
                  prev && prev.cid === p.constituency_id
                    ? { ...prev, mp: r.data, loading: false }
                    : prev
                )
              )
              .catch(() =>
                setConsPopup((prev) =>
                  prev && prev.cid === p.constituency_id
                    ? { ...prev, loading: false }
                    : prev
                )
              );
          }
        },
      });
    },
    []
  );

  // Keep the latest toggle value available inside Leaflet event closures.
  const showAssemblyRef = React.useRef(showAssembly);
  useEffect(() => {
    showAssemblyRef.current = showAssembly;
  }, [showAssembly]);

  const stateColor = (name: string) => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return `hsl(${h}, 50%, 52%)`;
  };

  const statesStyle = React.useCallback(
    (feature?: Feature) => ({
      color: theme === 'light' ? '#9aa0a6' : '#5f6570',
      weight: 1,
      fillColor: stateColor(((feature?.properties as { state?: string })?.state) || ''),
      fillOpacity: 0.08,
    }),
    [theme]
  );

  const onEachState = React.useCallback(
    (feature: Feature, layer: L.Layer) => {
      const name = ((feature.properties as { state?: string })?.state) || '';
      const path = layer as L.Path;
      path.bindTooltip(name, { sticky: true, direction: 'top', opacity: 0.9 });
      layer.on({
        mouseover: () => path.setStyle({ fillOpacity: 0.2, weight: 1.5 }),
        mouseout: () => path.setStyle({ fillOpacity: 0.08, weight: 1 }),
        click: () => {
          if (showAssemblyRef.current && name) loadStateAcs(name);
        },
      });
    },
    [loadStateAcs]
  );

  const outlineStyle = useMemo(
    () => ({ color: ACCENT_LINE, weight: 2.5, fillOpacity: 0, dashArray: '2 7' }),
    []
  );

  const acStyle = useMemo(
    () => ({ color: ACCENT_LINE, weight: 0.8, fillColor: ACCENT, fillOpacity: 0.05 }),
    []
  );

  const onEachAc = React.useCallback((feature: Feature, layer: L.Layer) => {
    const p = (feature.properties || {}) as { name?: string; state?: string; pc_name?: string };
    (layer as L.Path).bindPopup(
      `<b>${p.name || 'Assembly'}</b><br/><span style="color:#6b7280">Assembly · ${p.state || ''}</span><br/>PC: ${p.pc_name || '—'}`
    );
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(issues.map((i) => i.category).filter(Boolean))).sort() as string[],
    [issues]
  );
  const statuses = useMemo(
    () => Array.from(new Set(issues.map((i) => i.status).filter(Boolean))).sort() as string[],
    [issues]
  );

  const filtered = useMemo(
    () =>
      issues.filter((i) => {
        if (!selectedSeverities.has(severityOf(i))) return false;
        if (category && i.category !== category) return false;
        if (statusF && i.status !== statusF) return false;
        return true;
      }),
    [issues, selectedSeverities, category, statusF]
  );

  const counts = useMemo(() => {
    const c: Record<Severity, number> = { critical: 0, moderate: 0, low: 0, resolved: 0 };
    filtered.forEach((i) => { c[severityOf(i)]++; });
    return c;
  }, [filtered]);

  const toggleSeverity = (s: Severity) =>
    setSelectedSeverities((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });

  const resetFilters = () => {
    setSelectedSeverities(new Set(['critical', 'moderate', 'low', 'resolved']));
    setCategory('');
    setStatusF('');
  };

  const tileVariant = theme === 'light' ? 'light_all' : 'dark_all';

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-app)' }}>
      {/* Map */}
      <MapContainer
        center={[22.9734, 78.6569]}
        zoom={5}
        scrollWheelZoom
        maxBounds={INDIA_MAX_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%' }}
      >
        <FitIndia />
        <SafetyFitter active={showSafety} points={safetyPoints} />
        <FitPoints active={showAqi} points={aqiStations.map((s) => [s.latitude, s.longitude] as [number, number])} maxZoom={12} />
        <FlyTo target={nearMe} />
        {nearMe && <Marker position={[nearMe.lat, nearMe.lng]} icon={meIcon} />}
        {/* Nearby civic centres + police, plotted around the user */}
        {nearInfo?.police && (
          <Marker position={[nearInfo.police.latitude, nearInfo.police.longitude]} icon={policeIcon}>
            <Popup><b>{nearInfo.police.name}</b><br /><span style={{ color: '#6b7280' }}>Police station</span></Popup>
          </Marker>
        )}
        {nearInfo?.centers.map((c, i) => (
          <Marker
            key={`center-${i}`}
            position={[c.latitude, c.longitude]}
            icon={L.divIcon({
              className: 'civic-marker',
              html: `<div style="font-size:18px;filter:drop-shadow(0 1px 1px rgba(0,0,0,.4))">${CATEGORY_EMOJI[c.category] || '📍'}</div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })}
          >
            <Popup>
              <b>{c.name}</b><br />
              <span style={{ color: '#6b7280' }}>{c.category_label} · {c.distance_km} km</span><br />
              <a href={dirUrl(c.latitude, c.longitude)} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                {t('map.directions')}
              </a>
            </Popup>
          </Marker>
        ))}
        <TileLayer
          key={tileVariant}
          attribution='&copy; OpenStreetMap &copy; CARTO'
          url={`https://{s}.basemaps.cartocdn.com/${tileVariant}/{z}/{x}/{y}{r}.png`}
        />
        {/* Base: differentiated state fills + solid borders (tap a state in Assembly mode) */}
        {baseLayers && (
          <GeoJSON data={baseLayers.states} style={statesStyle} onEachFeature={onEachState} />
        )}
        {/* Assembly (MLA) segments for the tapped state */}
        {showAssembly && acByState && (
          <GeoJSON key={`ac-${acByState.features.length}`} data={acByState} style={() => acStyle} onEachFeature={onEachAc} />
        )}
        {showBoundaries && boundaries && (
          <GeoJSON
            data={boundaries}
            style={() => boundaryStyle}
            onEachFeature={onEachBoundary}
          />
        )}
        {/* Dotted national outline drawn on top */}
        {baseLayers && <GeoJSON data={baseLayers.outline} style={() => outlineStyle} interactive={false} />}
        {/* Bengaluru police stations */}
        {showPolice && police &&
          police.features.map((f, i) => {
            const c = (f.geometry as { coordinates?: number[] })?.coordinates;
            if (!c) return null;
            const nm = (f.properties as { name?: string })?.name || 'Police station';
            return (
              <Marker key={`ps-${i}`} position={[c[1], c[0]]} icon={policeIcon}>
                <Popup><b>{nm}</b><br /><span style={{ color: '#6b7280' }}>Police station</span></Popup>
              </Marker>
            );
          })}
        {/* Air-quality stations, coloured by AQI band */}
        {showAqi &&
          aqiStations.map((s, i) => (
            <Circle
              key={`aqi-${i}`}
              center={[s.latitude, s.longitude]}
              radius={900}
              pathOptions={{ color: s.color, fillColor: s.color, fillOpacity: 0.5, weight: 1 }}
            >
              <Popup>
                <div style={{ minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: s.color, color: '#111', fontWeight: 800, borderRadius: 6, padding: '3px 8px', fontSize: 15 }}>{s.aqi}</span>
                    <div>
                      <b>{s.category}</b>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>Dominant: {s.dominant_pollutant}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, marginTop: 5, fontWeight: 600 }}>{s.station}</div>
                  {s.trend && <AqiSparkline trend={s.trend} color={s.color} />}
                  <div style={{ fontSize: 11, marginTop: 6, color: '#374151', lineHeight: 1.4 }}>{s.advice}</div>
                  <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 4 }}>
                    {s.source === 'live' ? 'CPCB · data.gov.in (live)' : 'CPCB sample'} · trend modeled on seasonal norms
                  </div>
                </div>
              </Popup>
            </Circle>
          ))}
        {showSafety &&
          safetyPoints.map((p) => (
            <Circle
              key={`sos-${p.id}`}
              center={[Number(p.latitude), Number(p.longitude)]}
              radius={600}
              pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.28, weight: 1 }}
              eventHandlers={{ click: (e) => openSafetyPopup(e.latlng) }}
            />
          ))}
        {safetyPopup && (
          <Popup position={safetyPopup.latlng} eventHandlers={{ remove: () => setSafetyPopup(null) }}>
            <div style={{ minWidth: 210 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5 }}>
                <ShieldAlert size={15} /> {t('safety.hotspotTitle')}
              </div>
              {safetyPopup.loading && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>{t('safety.resolving')}</div>}
              {!safetyPopup.loading && safetyPopup.data && (
                <div style={{ fontSize: 12.5, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {safetyPopup.data.area && <div>📍 {safetyPopup.data.area}</div>}
                  <div>🏛️ {safetyPopup.data.constituency || '—'}{safetyPopup.data.state ? `, ${safetyPopup.data.state}` : ''}</div>
                  {safetyPopup.data.mp && <div style={{ color: '#6b7280' }}>MP: {safetyPopup.data.mp}</div>}
                  {safetyPopup.data.police ? (
                    <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid #eee' }}>
                      🛡️ <b>{safetyPopup.data.police.name}</b><br />
                      <span style={{ color: '#6b7280' }}>{t('safety.nearestPolice')} · {safetyPopup.data.police.distance_km} km</span>
                    </div>
                  ) : (
                    <div style={{ color: '#6b7280', marginTop: 4 }}>{t('safety.noPolice')}</div>
                  )}
                </div>
              )}
            </div>
          </Popup>
        )}
        {consPopup && (
          <Popup
            position={consPopup.latlng}
            eventHandlers={{ remove: () => setConsPopup(null) }}
          >
            <div style={{ minWidth: 190 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{consPopup.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                {consPopup.state} · Lok Sabha
              </div>
              {consPopup.loading && (
                <div style={{ fontSize: 12, color: '#6b7280' }}>Loading MP…</div>
              )}
              {!consPopup.loading && consPopup.mp && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {consPopup.mp.photo_url && (
                    <img
                      src={consPopup.mp.photo_url}
                      alt={consPopup.mp.name}
                      width={38}
                      height={38}
                      style={{ borderRadius: '50%', objectFit: 'cover' }}
                    />
                  )}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{consPopup.mp.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {consPopup.mp.party_abbr || consPopup.mp.party || '—'}
                      {' · '}
                      {consPopup.mp.pending_suggestions} open
                    </div>
                  </div>
                </div>
              )}
              {!consPopup.loading && !consPopup.mp && consPopup.cid == null && (
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  Boundary not linked to a seat yet.
                </div>
              )}
              {!consPopup.loading && !consPopup.mp && consPopup.cid != null && (
                <div style={{ fontSize: 12, color: '#6b7280' }}>No MP on record.</div>
              )}
            </div>
          </Popup>
        )}
        <MarkerClusterGroup chunkedLoading showCoverageOnHover={false} maxClusterRadius={50}>
          {filtered.map((i) => (
            <Marker
              key={i.id}
              position={[Number(i.latitude), Number(i.longitude)]}
              icon={sevIcon(severityOf(i))}
              eventHandlers={{ click: () => setSelected(i) }}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Compact count pill (top-center) */}
      {!isMobile && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            zIndex: 1000, padding: '6px 14px', fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap',
          }}
        >
          <strong style={{ color: 'var(--text-main)' }}>{t('map.title')}</strong> · {t('map.issuesShown', { shown: filtered.length, total: issues.length })}
        </div>
      )}

      {/* Filters (top-left) */}
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, maxWidth: '90vw' }}>
        <MapFilters
          categories={categories}
          statuses={statuses}
          selectedSeverities={selectedSeverities}
          toggleSeverity={toggleSeverity}
          category={category}
          setCategory={setCategory}
          status={statusF}
          setStatus={setStatusF}
          onReset={resetFilters}
        />
      </div>

      {/* Near-me action + Layers control (bottom-right) */}
      <div style={{ position: 'absolute', bottom: 20, right: 12, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        {/* Layers panel */}
        {layersOpen && (
          <div className="glass-panel animate-fade-in" style={{ padding: 8, width: 210, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('map.layers')}
            </div>
            {([
              { key: 'boundaries', label: t('map.boundaries'), swatch: ACCENT_LINE, on: showBoundaries, loading: boundariesLoading,
                toggle: () => setShowBoundaries((v) => !v) },
              { key: 'assembly', label: t('map.assembly'), swatch: ACCENT, on: showAssembly, loading: !!acLoadingState,
                toggle: () => setShowAssembly((v) => { const n = !v; if (n) setShowBoundaries(false); else setAcByState(null); return n; }) },
              { key: 'police', label: t('map.police'), swatch: '#1e3a8a', on: showPolice, loading: false,
                toggle: () => setShowPolice((v) => !v) },
              { key: 'safety', label: t('map.safety'), swatch: '#dc2626', on: showSafety, loading: safetyLoading,
                toggle: () => setShowSafety((v) => !v) },
              { key: 'aqi', label: t('map.air'), swatch: '#0891b2', on: showAqi, loading: aqiLoading,
                toggle: () => setShowAqi((v) => !v) },
            ] as const).map((l) => (
              <button
                key={l.key}
                onClick={l.toggle}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '8px', borderRadius: 8,
                  border: 'none', cursor: 'pointer', background: l.on ? 'var(--bg-subtle, rgba(37,99,235,.08))' : 'transparent',
                  fontSize: 13, color: 'var(--text-main)', textAlign: 'left', width: '100%',
                }}
              >
                <span style={{ width: 12, height: 12, borderRadius: 3, background: l.swatch, flexShrink: 0, opacity: l.on ? 1 : 0.35 }} />
                <span style={{ flex: 1 }}>{l.label}</span>
                {l.loading && <Loader2 size={13} className="animate-spin" />}
                <span style={{
                  width: 32, height: 18, borderRadius: 9, background: l.on ? '#2563eb' : 'var(--border-subtle, #ccc)',
                  position: 'relative', flexShrink: 0, transition: 'background .2s',
                }}>
                  <span style={{ position: 'absolute', top: 2, left: l.on ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
                </span>
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={locateMe}
            className="glass-panel"
            style={{
              padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 7,
              fontSize: 13, cursor: 'pointer', border: 'none', fontWeight: 700, color: '#fff', background: '#2563eb',
            }}
            title={t('map.nearMe')}
          >
            {nearLoading ? <Loader2 size={15} className="animate-spin" /> : <LocateFixed size={15} />}
            {t('map.nearMe')}
          </button>
          <button
            onClick={() => setLayersOpen((v) => !v)}
            className="glass-panel"
            style={{
              padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 7,
              fontSize: 13, cursor: 'pointer', border: 'none', fontWeight: 700,
              color: layersOpen ? 'var(--text-main)' : 'var(--text-muted)',
            }}
            title={t('map.layers')}
          >
            <Layers size={15} /> {t('map.layers')}
          </button>
        </div>
      </div>

      {/* Assembly-mode hint */}
      {showAssembly && !acByState && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute', bottom: 66, left: '50%', transform: 'translateX(-50%)',
            zIndex: 1000, padding: '6px 12px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap',
          }}
        >
          {t('map.assemblyHint')}
        </div>
      )}

      {/* Legend (bottom-left) */}
      {!isMobile && (
        <div style={{ position: 'absolute', bottom: 20, left: 12, zIndex: 1000 }}>
          <MapLegend counts={counts} />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="glass-panel" style={{ position: 'absolute', bottom: 20, right: 12, zIndex: 1000, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '13px' }}>
          <Loader2 size={15} className="animate-spin" /> {t('map.loading')}
        </div>
      )}

      {/* Near-me card */}
      {(nearMe && (nearLoading || nearInfo)) && (
        <div
          className="glass-panel animate-fade-in"
          style={{
            position: 'absolute', zIndex: 1150, display: 'flex', flexDirection: 'column',
            ...(isMobile
              ? { left: 0, right: 0, bottom: 0, maxHeight: '68vh' }
              : { top: 12, left: 12, width: 340, maxHeight: 'calc(100% - 24px)' }),
            padding: 0, overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--border-subtle, rgba(128,128,128,.15))' }}>
            <LocateFixed size={18} color="#2563eb" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{t('map.aroundYou')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {nearInfo?.area || t('map.locatingYou')}
              </div>
            </div>
            <button onClick={() => { setNearMe(null); setNearInfo(null); }} aria-label={t('sos.close')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {nearLoading && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('map.locatingYou')}</div>}

            {nearInfo && (
              <>
                {/* AI summary */}
                <div style={{ background: 'var(--bg-subtle, rgba(37,99,235,.06))', border: '1px solid rgba(37,99,235,.18)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12, color: '#2563eb', marginBottom: 4 }}>
                    <Sparkles size={13} /> {t('map.aiSummary')}
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-main)' }}>{nearInfo.summary}</div>
                </div>

                {/* Representation */}
                <div style={{ fontSize: 13 }}>
                  <div>🏛️ <b>{nearInfo.constituency || '—'}</b>{nearInfo.state ? `, ${nearInfo.state}` : ''}</div>
                  {nearInfo.mp && <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>MP: {nearInfo.mp}</div>}
                </div>

                {/* Air quality (CPCB via data.gov.in) */}
                {nearInfo.air_quality && (
                  <div style={{ borderTop: '1px solid var(--border-subtle, rgba(128,128,128,.15))', paddingTop: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Wind size={15} /> {t('map.airQuality')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        minWidth: 52, height: 52, borderRadius: 10, background: nearInfo.air_quality.color,
                        color: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, lineHeight: 1,
                      }}>
                        <span style={{ fontSize: 18 }}>{nearInfo.air_quality.aqi}</span>
                        <span style={{ fontSize: 8, fontWeight: 700 }}>AQI</span>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{nearInfo.air_quality.category} · {nearInfo.air_quality.dominant_pollutant}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{nearInfo.air_quality.station}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-main)', marginTop: 6, lineHeight: 1.4 }}>{nearInfo.air_quality.advice}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                      {t('map.aqiSource', { src: nearInfo.air_quality.source === 'live' ? 'CPCB · data.gov.in (live)' : 'CPCB sample' })}
                    </div>
                  </div>
                )}

                {/* Safety + police */}
                <div style={{ borderTop: '1px solid var(--border-subtle, rgba(128,128,128,.15))', paddingTop: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <ShieldAlert size={15} color="#dc2626" /> {t('map.safetyNearby')}
                  </div>
                  <div style={{ fontSize: 12.5, color: nearInfo.safety.nearby_sos_24h ? '#dc2626' : 'var(--text-muted)' }}>
                    🚨 {t('map.nearbySos', { n: nearInfo.safety.nearby_sos_24h })}
                  </div>
                  {nearInfo.police && (
                    <div style={{ fontSize: 12.5, marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span>🛡️ {nearInfo.police.name} · {nearInfo.police.distance_km} km</span>
                      <a href={dirUrl(nearInfo.police.latitude, nearInfo.police.longitude)} target="_blank" rel="noreferrer"
                        style={{ color: '#fff', background: '#2563eb', borderRadius: 8, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                        <Navigation size={12} /> {t('map.navigate')}
                      </a>
                    </div>
                  )}
                </div>

                {/* Civic centres */}
                {nearInfo.centers.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border-subtle, rgba(128,128,128,.15))', paddingTop: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{t('map.civicCenters')}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {nearInfo.centers.map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 12.5, minWidth: 0 }}>
                            <span style={{ marginRight: 5 }}>{CATEGORY_EMOJI[c.category] || '📍'}</span>
                            <b style={{ fontWeight: 600 }}>{c.name}</b>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11 }}>{c.category_label} · {c.distance_km} km</span>
                          </span>
                          <a href={dirUrl(c.latitude, c.longitude)} target="_blank" rel="noreferrer"
                            style={{ color: '#2563eb', border: '1px solid #2563eb', borderRadius: 8, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                            <Navigation size={12} /> {t('map.navigate')}
                          </a>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>{t('map.demoData')}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div
          style={{
            position: 'absolute', zIndex: 1100,
            ...(isMobile
              ? { left: 0, right: 0, bottom: 0, maxHeight: '62vh' }
              : { top: 12, right: 12, width: 360, maxHeight: 'calc(100% - 24px)' }),
          }}
        >
          <IssueDetailPanel issue={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  );
};

export default LiveMap;
