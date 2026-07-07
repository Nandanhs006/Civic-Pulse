import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../../services/apiClient';
import MapView from './MapView';
import AnalyticsSummary from './AnalyticsSummary';
import ProjectPrioritizer from './ProjectPrioritizer';
import { Suggestion, ProposedProject, Ward, AnalyticsSummary as SummaryType, AssemblyConstituency, MLA } from '../../../types';
import Avatar from '../../common/Avatar';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useLang } from '../../../context/LanguageContext';
import { RefreshCw, Map, Users } from 'lucide-react';

interface AssemblySegment {
  assembly_constituency: AssemblyConstituency;
  mla: MLA | null;
}

interface ConstituencyDashboardProps {
  /** When set (PMO drill-down), scope to this constituency. MPs omit it (auto-scoped). */
  constituencyId?: number;
}

/** Reusable scoped dashboard: map + analytics + AI project prioritizer. */
const ConstituencyDashboard: React.FC<ConstituencyDashboardProps> = ({ constituencyId }) => {
  const { t } = useLang();
  const isMobile = useIsMobile();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [projects, setProjects] = useState<ProposedProject[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [summary, setSummary] = useState<SummaryType | null>(null);
  const [boundary, setBoundary] = useState<any | null>(null);
  const [segments, setSegments] = useState<AssemblySegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const params = constituencyId ? { constituency_id: constituencyId } : {};

  // Load the constituency boundary polygon to highlight on the map.
  useEffect(() => {
    if (!constituencyId) {
      setBoundary(null);
      return;
    }
    apiClient
      .get(`/api/v1/constituencies/${constituencyId}/boundary`)
      .then((r) => setBoundary(r.data))
      .catch(() => setBoundary(null));
    apiClient
      .get<AssemblySegment[]>(`/api/v1/hierarchy/pc/${constituencyId}`)
      .then((r) => setSegments(r.data))
      .catch(() => setSegments([]));
  }, [constituencyId]);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [sugRes, projRes, wardRes, sumRes] = await Promise.all([
        apiClient.get<Suggestion[]>('/api/v1/suggestions/', { params }),
        apiClient.get<ProposedProject[]>('/api/v1/projects/', { params }),
        apiClient.get<Ward[]>('/api/v1/analytics/wards'),
        apiClient.get<SummaryType>('/api/v1/analytics/summary', { params }),
      ]);
      setSuggestions(sugRes.data);
      setProjects(projRes.data);
      setWards(wardRes.data);
      setSummary(sumRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [constituencyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Center the map on the mean of plotted requests (falls back to national view).
  const plotted = suggestions.filter((s) => s.latitude && s.longitude);
  const center: [number, number] | undefined = plotted.length
    ? [
        plotted.reduce((a, s) => a + Number(s.latitude), 0) / plotted.length,
        plotted.reduce((a, s) => a + Number(s.longitude), 0) / plotted.length,
      ]
    : undefined;
  const zoom = plotted.length ? 10 : 5;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '16px' }}>
        <RefreshCw size={32} className="animate-spin" color="var(--primary)" />
        <p style={{ color: 'var(--text-muted)' }}>{t('dash.loading')}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={fetchData}
          disabled={refreshing}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 14px', fontSize: '13px' }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {t('dash.syncData')}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Map size={18} color="var(--secondary)" />
            {t('dash.liveMap')}
          </h3>
          <MapView suggestions={suggestions} wards={wards} center={center} zoom={zoom} boundary={boundary} />
        </div>
        <AnalyticsSummary summary={summary} />
      </div>

      <ProjectPrioritizer projects={projects} onRefresh={fetchData} constituencyId={constituencyId} />

      {segments.length > 0 && (
        <div className="glass-panel" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Users size={18} color="var(--india-green)" />
            {t('dash.localReps')}
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            {t('dash.localRepsSub')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
            {segments.map((s) => (
              <div key={s.assembly_constituency.id} className="glass-panel" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Avatar name={s.mla?.name || s.assembly_constituency.name} photoUrl={s.mla?.photo_url} size={38} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.mla?.name || t('dash.mlaToUpdate')}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.mla?.party_abbr ? `${s.mla.party_abbr} · ` : ''}{s.assembly_constituency.name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConstituencyDashboard;
