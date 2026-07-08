import React, { useEffect, useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { MP, AnalyticsSummary } from '../types';
import NationalStats from '../components/features/pmo/NationalStats';
import MpDirectory from '../components/features/pmo/MpDirectory';
import { RefreshCw } from 'lucide-react';
import { useLang } from '../context/LanguageContext';

/** PMO super-admin command center: national overview + all-MP directory. */
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

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <RefreshCw size={34} className="animate-spin" color="var(--primary)" />
        <p style={{ color: 'var(--text-muted)' }}>{t('pmo.loading')}</p>
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

      <div style={{ display: 'flex', gap: '20px', marginBottom: '22px', borderBottom: '1px solid var(--border-card)', paddingBottom: '10px' }}>
        <NavLink 
          to="/pmo" 
          end
          style={({ isActive }) => ({
            color: isActive ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
            paddingBottom: '8px',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          })}
        >
          {t('pmo.title') || 'Representative Directory'}
        </NavLink>
        <NavLink 
          to="/pmo/analytics" 
          style={({ isActive }) => ({
            color: isActive ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
            paddingBottom: '8px',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          })}
        >
          Dashboard
        </NavLink>
        <NavLink 
          to="/pmo/leaderboard" 
          style={({ isActive }) => ({
            color: isActive ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
            paddingBottom: '8px',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          })}
        >
          Performance Index
        </NavLink>
      </div>

      <NationalStats mps={mps} summary={summary} />
      <MpDirectory mps={mps} onSelect={(mp) => navigate(`/pmo/mp/${mp.constituency_id}`)} />
    </div>
  );
};

export default Pmo;
