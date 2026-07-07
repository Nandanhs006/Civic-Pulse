import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { MP } from '../types';
import Avatar from '../components/common/Avatar';
import ConstituencyDashboard from '../components/features/dashboard/ConstituencyDashboard';
import { MapPin, ExternalLink } from 'lucide-react';

/** MP-facing dashboard: identity header + own-constituency data (server-scoped). */
const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLang();
  const [mp, setMp] = useState<MP | null>(null);

  useEffect(() => {
    if (user?.constituency_id) {
      apiClient
        .get<MP>(`/api/v1/mps/${user.constituency_id}`)
        .then((r) => setMp(r.data))
        .catch((e) => console.error('Failed to load MP profile', e));
    }
  }, [user?.constituency_id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-in">
      {/* MP identity header */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <Avatar name={mp?.name || user?.full_name || 'MP'} photoUrl={mp?.photo_url} size={72} />
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            {t('dash.mpBadge')}
          </div>
          <h1 style={{ fontSize: '28px', color: 'var(--text-main)' }}>{mp?.name || user?.full_name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '4px', color: 'var(--text-muted)', fontSize: '14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <MapPin size={14} color="var(--saffron)" /> {mp?.constituency_name || '—'}, {mp?.state || ''}
            </span>
            {mp?.party && <span className="chip">{mp.party_abbr || mp.party}</span>}
            {mp?.wikipedia_url && (
              <a href={mp.wikipedia_url} target="_blank" rel="noreferrer" style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                {t('dash.wikipedia')} <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
        {mp && (
          <div style={{ display: 'flex', gap: '24px' }}>
            <Stat label={t('dash.requests')} value={mp.total_suggestions} />
            <Stat label={t('dash.unresolved')} value={`${mp.unresolved_percentage}%`} accent="var(--warning)" />
            <Stat label={t('dash.sanctioned')} value={mp.sanctioned_projects} accent="var(--success)" />
          </div>
        )}
      </div>

      <ConstituencyDashboard constituencyId={user?.constituency_id ?? undefined} />
    </div>
  );
};

const Stat: React.FC<{ label: string; value: React.ReactNode; accent?: string }> = ({ label, value, accent }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: '26px', fontWeight: 700, color: accent || 'var(--text-main)' }}>{value}</div>
    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
  </div>
);

export default Dashboard;
