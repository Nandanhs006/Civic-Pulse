import React from 'react';
import { useLang } from '../../../context/LanguageContext';
import { Severity, SEVERITY_COLOR, SEVERITY_ORDER } from './severity';

interface MapLegendProps {
  counts: Record<Severity, number>;
}

const MapLegend: React.FC<MapLegendProps> = ({ counts }) => {
  const { t } = useLang();
  return (
    <div
      className="glass-panel"
      style={{ padding: '12px 14px', minWidth: 150 }}
    >
      <div style={{ fontSize: '11px', letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
        {t('map.legend')}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SEVERITY_ORDER.map(({ key, labelKey }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: SEVERITY_COLOR[key], border: '2px solid white', flexShrink: 0 }} />
            <span style={{ flex: 1, color: 'var(--text-main)' }}>{t(labelKey)}</span>
            <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{counts[key] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MapLegend;
