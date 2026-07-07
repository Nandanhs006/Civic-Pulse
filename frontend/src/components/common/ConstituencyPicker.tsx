import React, { useEffect, useRef, useState } from 'react';
import apiClient from '../../services/apiClient';
import { Constituency } from '../../types';
import { useLang } from '../../context/LanguageContext';
import { MapPin } from 'lucide-react';

export interface Autofill {
  state: string;
  hints: string[]; // candidate names (district/city/etc.) to match a constituency
  constituencyId?: number; // precise match from GPS point-in-polygon (preferred)
}

interface ConstituencyPickerProps {
  value: number | null;
  onChange: (constituency: Constituency | null) => void;
  /** GPS-derived hint used to pre-select the State and best-effort Constituency. */
  autofill?: Autofill | null;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

/** Cascading State -> Constituency selector that powers request routing. */
const ConstituencyPicker: React.FC<ConstituencyPickerProps> = ({ value, onChange, autofill }) => {
  const { t } = useLang();
  const [states, setStates] = useState<string[]>([]);
  const [state, setState] = useState<string>('');
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [loadingC, setLoadingC] = useState(false);
  const [pendingHints, setPendingHints] = useState<string[] | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const appliedRef = useRef<string>('');

  useEffect(() => {
    apiClient
      .get<string[]>('/api/v1/constituencies/states')
      .then((r) => setStates(r.data))
      .catch((e) => console.error('Failed to load states', e));
  }, []);

  useEffect(() => {
    if (!state) {
      setConstituencies([]);
      return;
    }
    setLoadingC(true);
    apiClient
      .get<Constituency[]>('/api/v1/constituencies/', { params: { state } })
      .then((r) => setConstituencies(r.data))
      .catch((e) => console.error('Failed to load constituencies', e))
      .finally(() => setLoadingC(false));
  }, [state]);

  // Apply GPS autofill once: pick the matching state, queue a constituency match.
  useEffect(() => {
    if (!autofill?.state || states.length === 0) return;
    const key = autofill.state + '|' + (autofill.constituencyId ?? '') + '|' + autofill.hints.join(',');
    if (appliedRef.current === key) return;
    const match = states.find(
      (s) => norm(s) === norm(autofill.state) || norm(s).includes(norm(autofill.state)) || norm(autofill.state).includes(norm(s))
    );
    if (match) {
      appliedRef.current = key;
      setState(match);
      setPendingId(autofill.constituencyId ?? null);
      setPendingHints(autofill.hints);
    }
  }, [autofill, states]);

  // Once the state's constituencies load, auto-select: exact id first, else name hints.
  useEffect(() => {
    if (constituencies.length === 0) return;
    if (pendingId == null && !pendingHints) return;
    let found: Constituency | undefined;
    if (pendingId != null) {
      found = constituencies.find((c) => c.id === pendingId);
    }
    if (!found && pendingHints) {
      for (const hint of pendingHints) {
        const h = norm(hint);
        if (!h) continue;
        found = constituencies.find((c) => {
          const cn = norm(c.name);
          return cn === h || h.includes(cn) || cn.includes(h);
        });
        if (found) break;
      }
    }
    if (found) onChange(found);
    setPendingId(null);
    setPendingHints(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingId, pendingHints, constituencies]);

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    letterSpacing: '0.03em',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={labelStyle}>{t('picker.stateLabel')}</label>
        <select
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            setPendingHints(null);
            setPendingId(null);
            onChange(null);
          }}
          className="glass-input"
          style={{ width: '100%' }}
        >
          <option value="">{t('common.selectState')}</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={labelStyle}>
          <MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {t('picker.constituencyLabel')}
        </label>
        <select
          value={value ?? ''}
          disabled={!state || loadingC}
          onChange={(e) => {
            const id = Number(e.target.value);
            onChange(constituencies.find((c) => c.id === id) || null);
          }}
          className="glass-input"
          style={{ width: '100%' }}
        >
          <option value="">
            {loadingC ? t('common.loading') : state ? t('common.selectConstituency') : t('common.pickStateFirst')}
          </option>
          {constituencies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ConstituencyPicker;
