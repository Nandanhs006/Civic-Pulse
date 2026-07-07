import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import apiClient from '../services/apiClient';
import { MapIssue } from '../types';
import { useLang } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';
import MapLegend from '../components/features/map/MapLegend';
import MapFilters from '../components/features/map/MapFilters';
import IssueDetailPanel from '../components/features/map/IssueDetailPanel';
import { Severity, SEVERITY_COLOR, severityOf } from '../components/features/map/severity';
import { Loader2 } from 'lucide-react';

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

const LiveMap: React.FC = () => {
  const { t } = useLang();
  const { theme } = useTheme();
  const isMobile = useIsMobile();

  const [issues, setIssues] = useState<MapIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MapIssue | null>(null);

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
      <MapContainer center={[22.9734, 78.6569]} zoom={5} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer
          key={tileVariant}
          attribution='&copy; OpenStreetMap &copy; CARTO'
          url={`https://{s}.basemaps.cartocdn.com/${tileVariant}/{z}/{x}/{y}{r}.png`}
        />
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
