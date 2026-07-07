import React from 'react';
import { MP, AnalyticsSummary } from '../../../types';
import { Users, MessageSquare, CheckCircle2, Activity } from 'lucide-react';
import { useLang } from '../../../context/LanguageContext';

interface NationalStatsProps {
  mps: MP[];
  summary: AnalyticsSummary | null;
}

const NationalStats: React.FC<NationalStatsProps> = ({ mps, summary }) => {
  const { t } = useLang();
  const totalRequests = summary?.total_suggestions ?? mps.reduce((a, m) => a + m.total_suggestions, 0);
  const sanctioned = mps.reduce((a, m) => a + m.sanctioned_projects, 0);
  const unresolved = summary ? summary.unresolved_percentage : 0;

  const cards = [
    { label: t('stats.mps'), value: mps.length, icon: Users, color: 'var(--primary)' },
    { label: t('stats.requests'), value: totalRequests, icon: MessageSquare, color: 'var(--saffron)' },
    { label: t('stats.sanctioned'), value: sanctioned, icon: CheckCircle2, color: 'var(--india-green)' },
    { label: t('stats.unresolvedRate'), value: `${unresolved.toFixed(1)}%`, icon: Activity, color: 'var(--warning)' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px' }}>
      {cards.map((c) => (
        <div key={c.label} className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{c.label}</div>
            <h2 style={{ fontSize: '30px', marginTop: '4px' }}>{c.value}</h2>
          </div>
          <div style={{ width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card-hover)' }}>
            <c.icon size={22} color={c.color} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default NationalStats;
