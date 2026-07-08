import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';
import { MP, AnalyticsSummary } from '../types';
import NationalStats from '../components/features/pmo/NationalStats';
import MpDirectory from '../components/features/pmo/MpDirectory';
import ConstituencyDashboard from '../components/features/dashboard/ConstituencyDashboard';
import Avatar from '../components/common/Avatar';
import { RefreshCw, ArrowLeft, MapPin } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useIsMobile } from '../hooks/useIsMobile';

/** PMO super-admin command center: national overview + all-MP directory + drill-down. */
const Pmo: React.FC = () => {
  const { t } = useLang();
  const isMobile = useIsMobile();
  const [mps, setMps] = useState<MP[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MP | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get<MP[]>('/api/v1/mps/'),
      apiClient.get<AnalyticsSummary>('/api/v1/analytics/summary'),
    ])
      .then(([mpsRes, sumRes]) => {
        setMps(mpsRes.data);
        setSummary(sumRes.data);
      })
      .catch((e) => console.error('Failed to load PMO data', e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <RefreshCw size={34} className="animate-spin" color="var(--primary)" />
        <p style={{ color: 'var(--text-muted)' }}>{t('pmo.loading')}</p>
      </div>
    );
  }

  // Drill-down view for a single constituency.
  if (selected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
        <button
          onClick={() => setSelected(null)}
          className="btn-secondary"
          style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 14px', fontSize: '13px' }}
        >
          <ArrowLeft size={15} /> {t('pmo.backToAll')}
        </button>

        <div
          className="glass-panel"
          style={{
            padding: isMobile ? '18px' : '22px',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '14px' : '18px',
            flexDirection: isMobile ? 'column' : 'row',
            textAlign: isMobile ? 'center' : 'left',
          }}
        >
          <Avatar name={selected.name} photoUrl={selected.photo_url} size={isMobile ? 72 : 64} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: isMobile ? '21px' : '25px', color: 'var(--text-main)', lineHeight: 1.2 }}>{selected.name}</h1>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
                justifyContent: isMobile ? 'center' : 'flex-start',
                color: 'var(--text-muted)',
                fontSize: '14px',
                marginTop: '6px',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MapPin size={14} color="var(--saffron)" /> {selected.constituency_name}, {selected.state}
              </span>
              {selected.party && <span className="chip">{selected.party_abbr || selected.party}</span>}
            </div>
          </div>
        </div>

        <ConstituencyDashboard constituencyId={selected.constituency_id} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }} className="animate-fade-in">
      <div>
        <h1 style={{ fontSize: '30px', color: 'var(--text-main)' }}>{t('pmo.title')}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '2px' }}>
          {t('pmo.subtitle', { count: mps.length })}
        </p>
      </div>

      <NationalStats mps={mps} summary={summary} />
      <MpDirectory mps={mps} onSelect={setSelected} />
    </div>
  );
};

export default Pmo;
