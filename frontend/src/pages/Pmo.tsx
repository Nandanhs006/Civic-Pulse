import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { MP, AnalyticsSummary } from '../types';
import NationalStats from '../components/features/pmo/NationalStats';
import MpDirectory from '../components/features/pmo/MpDirectory';
import PmoHeader from '../components/features/pmo/PmoHeader';
import { RefreshCw } from 'lucide-react';
import { useLang } from '../context/LanguageContext';

const Pmo: React.FC = () => {
  const { t } = useLang();
  const navigate = useNavigate();
  const [mps, setMps] = useState<MP[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }} className="animate-fade-in">
      <PmoHeader subtitle={t('pmo.subtitle', { count: mps.length }) || `${mps.length} Members of Parliament across India's constituencies.`} />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '16px' }}>
          <RefreshCw size={34} className="animate-spin" color="var(--primary)" />
          <p style={{ color: 'var(--text-muted)' }}>{t('pmo.loading')}</p>
        </div>
      ) : (
        <>
          <NationalStats mps={mps} summary={summary} />
          <MpDirectory mps={mps} onSelect={(mp) => navigate(`/pmo/mp/${mp.constituency_id}`)} />
        </>
      )}
    </div>
  );
};

export default Pmo;
