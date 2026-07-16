import React, { useState } from 'react';
import { useLang } from '../../../context/LanguageContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { Severity, SEVERITY_COLOR, SEVERITY_ORDER } from './severity';
import { SlidersHorizontal, X } from 'lucide-react';

interface MapFiltersProps {
  categories: string[];
  statuses: string[];
  states: string[];
  cities: string[];
  mps: string[];
  selectedSeverities: Set<Severity>;
  toggleSeverity: (s: Severity) => void;
  category: string;
  setCategory: (c: string) => void;
  status: string;
  setStatus: (s: string) => void;
  stateF: string;
  setStateF: (s: string) => void;
  cityF: string;
  setCityF: (c: string) => void;
  mpF: string;
  setMpF: (m: string) => void;
  onReset: () => void;
}

const MapFilters: React.FC<MapFiltersProps> = (p) => {
  const { t } = useLang();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(!isMobile);

  if (isMobile && !open) {
    return (
      <button
        className="glass-panel"
        onClick={() => setOpen(true)}
        style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', border: '1px solid var(--border-card)' }}
      >
        <SlidersHorizontal size={16} /> {t('map.filters')}
      </button>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '14px', width: isMobile ? '80vw' : 230, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          <SlidersHorizontal size={15} /> {t('map.filters')}
        </div>
        {isMobile && <X size={16} style={{ cursor: 'pointer' }} onClick={() => setOpen(false)} />}
      </div>

      <div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{t('map.severity')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SEVERITY_ORDER.map(({ key, labelKey }) => {
            const on = p.selectedSeverities.has(key);
            return (
              <button
                key={key}
                onClick={() => p.toggleSeverity(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, fontSize: '12px', padding: '4px 9px',
                  borderRadius: 999, cursor: 'pointer', fontWeight: 600,
                  border: `1px solid ${on ? SEVERITY_COLOR[key] : 'var(--border-card)'}`,
                  background: on ? SEVERITY_COLOR[key] + '22' : 'transparent',
                  color: on ? 'var(--text-main)' : 'var(--text-muted)',
                }}
              >
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: SEVERITY_COLOR[key] }} />
                {t(labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('map.category')}</span>
        <select value={p.category} onChange={(e) => p.setCategory(e.target.value)} className="glass-input" style={{ fontSize: '13px' }}>
          <option value="">{t('map.allCategories')}</option>
          {p.categories.map((c) => <option key={c} value={c}>{t('category.' + c)}</option>)}
        </select>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('map.statusLabel')}</span>
        <select value={p.status} onChange={(e) => p.setStatus(e.target.value)} className="glass-input" style={{ fontSize: '13px' }}>
          <option value="">{t('map.allStatuses')}</option>
          {p.statuses.map((s) => <option key={s} value={s}>{t('status.' + s)}</option>)}
        </select>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>State</span>
        <select value={p.stateF} onChange={(e) => p.setStateF(e.target.value)} className="glass-input" style={{ fontSize: '13px' }}>
          <option value="">All States</option>
          {p.states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>City / Constituency</span>
        <select value={p.cityF} onChange={(e) => p.setCityF(e.target.value)} className="glass-input" style={{ fontSize: '13px' }}>
          <option value="">All Cities/Constituencies</option>
          {p.cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Representative (MP)</span>
        <select value={p.mpF} onChange={(e) => p.setMpF(e.target.value)} className="glass-input" style={{ fontSize: '13px' }}>
          <option value="">All MPs</option>
          {p.mps.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>

      <button onClick={p.onReset} className="btn-secondary" style={{ fontSize: '12px', padding: '8px' }}>
        {t('map.reset')}
      </button>
    </div>
  );
};

export default MapFilters;
