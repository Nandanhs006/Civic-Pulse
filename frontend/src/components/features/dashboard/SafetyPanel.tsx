import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../../../services/apiClient';
import { useLang } from '../../../context/LanguageContext';
import { ShieldAlert, Clock } from 'lucide-react';

interface SafetySummary {
  total: number;
  last_30_days: number;
  by_hour: number[];
}

/**
 * MP/PMO-facing women-safety panel: aggregates anonymized SOS pings for a
 * constituency so representatives can see where/when safety needs attention
 * and act (lighting, patrols, CCTV via MPLADS). Fed by /api/v1/safety/summary.
 */
const SafetyPanel: React.FC<{ constituencyId?: number }> = ({ constituencyId }) => {
  const { t } = useLang();
  const [summary, setSummary] = useState<SafetySummary | null>(null);

  useEffect(() => {
    const params = constituencyId ? { constituency_id: constituencyId } : {};
    apiClient
      .get<SafetySummary>('/api/v1/safety/summary', { params })
      .then((r) => setSummary(r.data))
      .catch((e) => console.error('Failed to load safety summary', e));
  }, [constituencyId]);

  const peak = useMemo(() => {
    if (!summary || summary.total === 0) return null;
    let idx = 0;
    summary.by_hour.forEach((v, i) => {
      if (v > summary.by_hour[idx]) idx = i;
    });
    return idx;
  }, [summary]);

  const maxBar = useMemo(
    () => (summary ? Math.max(1, ...summary.by_hour) : 1),
    [summary]
  );

  const fmtHour = (h: number) => `${String(h).padStart(2, '0')}:00`;

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <h3 style={{ fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ShieldAlert size={18} color="#dc2626" />
        {t('safety.title')}
      </h3>

      <div style={{ display: 'flex', gap: '28px' }}>
        <div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-main)' }}>
            {summary?.last_30_days ?? '—'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('safety.last30')}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-main)' }}>
            {summary?.total ?? '—'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('safety.total')}
          </div>
        </div>
        {peak !== null && (
          <div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={18} /> {fmtHour(peak)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('safety.peakHour')}
            </div>
          </div>
        )}
      </div>

      {/* By-hour mini bar chart (24 buckets) */}
      {summary && summary.total > 0 ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 56 }}>
            {summary.by_hour.map((v, h) => (
              <div
                key={h}
                title={`${fmtHour(h)} · ${v}`}
                style={{
                  flex: 1,
                  height: `${(v / maxBar) * 100}%`,
                  minHeight: v > 0 ? 3 : 1,
                  background: h === peak ? '#dc2626' : 'var(--secondary, #6366f1)',
                  opacity: v > 0 ? 1 : 0.18,
                  borderRadius: '2px 2px 0 0',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('safety.none')}</div>
      )}

      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
        {t('safety.hint')}
      </div>
    </div>
  );
};

export default SafetyPanel;
