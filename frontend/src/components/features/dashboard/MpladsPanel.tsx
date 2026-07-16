import React, { useEffect, useState } from 'react';
import apiClient from '../../../services/apiClient';
import { useLang } from '../../../context/LanguageContext';
import { IndianRupee, Lightbulb } from 'lucide-react';

interface Mplads {
  constituency: string;
  allocated_lakh: number;
  released_lakh: number;
  utilised_lakh: number;
  unspent_lakh: number;
  pct_utilised: number;
  works_completed: number;
  works_recommended: number;
  source: string;
  demand: {
    total_requests: number;
    unresolved_requests: number;
    top_open_categories: { category: string; count: number }[];
  };
  insight: string;
}

const cr = (lakh: number) => (lakh / 100).toFixed(2);

/**
 * MPLADS funds vs citizen demand — the core "align funding with real demand"
 * view. Fund figures are a labelled sample; the demand side is real (from the
 * Suggestion table). Fed by GET /api/v1/mplads/{constituency_id}.
 */
const MpladsPanel: React.FC<{ constituencyId?: number }> = ({ constituencyId }) => {
  const { t } = useLang();
  const [d, setD] = useState<Mplads | null>(null);

  useEffect(() => {
    if (!constituencyId) return;
    apiClient
      .get<Mplads>(`/api/v1/mplads/${constituencyId}`)
      .then((r) => setD(r.data))
      .catch((e) => console.error('Failed to load MPLADS', e));
  }, [constituencyId]);

  if (!constituencyId || !d) return null;

  const relPct = d.allocated_lakh ? (d.released_lakh / d.allocated_lakh) * 100 : 0;
  const utilPct = d.allocated_lakh ? (d.utilised_lakh / d.allocated_lakh) * 100 : 0;
  const underused = d.pct_utilised < 65 && d.demand.unresolved_requests > 0;

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <h3 style={{ fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <IndianRupee size={18} color="var(--saffron, #FF9933)" />
        {t('mplads.title')}
      </h3>

      {/* Fund stats */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <Stat label={t('mplads.allocated')} value={`₹${cr(d.allocated_lakh)} cr`} />
        <Stat label={t('mplads.utilised')} value={`${d.pct_utilised}%`} accent={underused ? 'var(--warning, #d97706)' : 'var(--success, #16a34a)'} />
        <Stat label={t('mplads.unspent')} value={`₹${cr(d.unspent_lakh)} cr`} accent={underused ? 'var(--warning, #d97706)' : undefined} />
        <Stat label={t('mplads.openReq')} value={d.demand.unresolved_requests} accent={d.demand.unresolved_requests ? 'var(--danger, #dc2626)' : undefined} />
      </div>

      {/* Allocated / released / utilised bar */}
      <div>
        <div style={{ position: 'relative', height: 16, borderRadius: 8, background: 'var(--bg-subtle, rgba(128,128,128,.15))', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, width: `${relPct}%`, background: 'rgba(255,153,51,0.35)' }} />
          <div style={{ position: 'absolute', inset: 0, width: `${utilPct}%`, background: 'var(--saffron, #FF9933)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          <span>{t('mplads.utilised')} ₹{cr(d.utilised_lakh)} cr</span>
          <span>{t('mplads.released')} ₹{cr(d.released_lakh)} cr</span>
          <span>{t('mplads.allocated')} ₹{cr(d.allocated_lakh)} cr</span>
        </div>
      </div>

      {/* Insight */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10,
        background: underused ? 'rgba(220,38,38,0.08)' : 'var(--bg-subtle, rgba(128,128,128,.08))',
        border: `1px solid ${underused ? 'rgba(220,38,38,0.25)' : 'transparent'}`,
      }}>
        <Lightbulb size={15} color={underused ? '#dc2626' : 'var(--secondary)'} style={{ marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{d.insight}</div>
      </div>

      {/* Works + top demand */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap', gap: 8 }}>
        <span>{t('mplads.works', { done: d.works_completed, total: d.works_recommended })}</span>
        {d.demand.top_open_categories.length > 0 && (
          <span>{t('mplads.topDemand')}: {d.demand.top_open_categories.map((c) => c.category).join(', ')}</span>
        )}
      </div>

      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t('mplads.sourceNote')}</div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: React.ReactNode; accent?: string }> = ({ label, value, accent }) => (
  <div>
    <div style={{ fontSize: '22px', fontWeight: 700, color: accent || 'var(--text-main)' }}>{value}</div>
    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
  </div>
);

export default MpladsPanel;
