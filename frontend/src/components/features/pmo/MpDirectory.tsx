import React, { useMemo, useState } from 'react';
import { MP } from '../../../types';
import MpCard from './MpCard';
import Avatar from '../../common/Avatar';
import { Search, LayoutGrid, List as ListIcon, ChevronRight } from 'lucide-react';
import { useLang } from '../../../context/LanguageContext';

interface MpDirectoryProps {
  mps: MP[];
  onSelect: (mp: MP) => void;
}

type SortKey = 'requests' | 'work' | 'resolved' | 'pending' | 'backlog' | 'name';
type ViewMode = 'grid' | 'list';

const SORTS: { key: SortKey; labelKey: string }[] = [
  { key: 'requests', labelKey: 'dir.sortRequests' },
  { key: 'work', labelKey: 'dir.sortWork' },
  { key: 'resolved', labelKey: 'dir.sortResolved' },
  { key: 'pending', labelKey: 'dir.sortPending' },
  { key: 'backlog', labelKey: 'dir.sortBacklog' },
  { key: 'name', labelKey: 'dir.sortName' },
];

const MpDirectory: React.FC<MpDirectoryProps> = ({ mps, onSelect }) => {
  const { t } = useLang();
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [sort, setSort] = useState<SortKey>('requests');
  const [onlyWithRequests, setOnlyWithRequests] = useState(true);
  const [view, setView] = useState<ViewMode>('grid');

  const states = useMemo(
    () => Array.from(new Set(mps.map((m) => m.state).filter(Boolean))).sort() as string[],
    [mps]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = mps.filter((m) => {
      if (onlyWithRequests && m.total_suggestions <= 0) return false;
      if (stateFilter && m.state !== stateFilter) return false;
      if (q && !`${m.name} ${m.constituency_name} ${m.state}`.toLowerCase().includes(q)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'work': return b.sanctioned_projects - a.sanctioned_projects;
        case 'resolved': return b.resolved_suggestions - a.resolved_suggestions;
        case 'pending': return b.pending_suggestions - a.pending_suggestions;
        case 'backlog': return b.unresolved_percentage - a.unresolved_percentage;
        case 'name': return a.name.localeCompare(b.name);
        default: return b.total_suggestions - a.total_suggestions;
      }
    });
    return list;
  }, [mps, query, stateFilter, sort, onlyWithRequests]);

  const toggleBtn = (mode: ViewMode, icon: React.ReactNode) => (
    <button
      onClick={() => setView(mode)}
      className="btn-secondary"
      title={`${mode} view`}
      style={{
        padding: '9px',
        display: 'flex',
        border: '1px solid var(--border-card)',
        background: view === mode ? 'var(--primary)' : 'transparent',
        color: view === mode ? 'white' : 'var(--text-muted)',
      }}
    >
      {icon}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Controls */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', display: 'flex', alignItems: 'center' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('dir.searchPlaceholder')}
            className="glass-input"
            style={{ paddingLeft: '40px', width: '100%' }}
          />
        </div>
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="glass-input">
          <option value="">{t('dir.allStates')}</option>
          {states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="glass-input">
          {SORTS.map((s) => <option key={s.key} value={s.key}>{t('dir.sortPrefix', { label: t(s.labelKey) })}</option>)}
        </select>
        <label className="chip" style={{ cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={onlyWithRequests}
            onChange={(e) => setOnlyWithRequests(e.target.checked)}
            style={{ accentColor: 'var(--primary)' }}
          />
          {t('dir.onlyWithRequests')}
        </label>
        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
          {toggleBtn('grid', <LayoutGrid size={16} />)}
          {toggleBtn('list', <ListIcon size={16} />)}
        </div>
      </div>

      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
        {t('dir.showing', { shown: filtered.length, total: mps.length })}
      </div>

      {view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filtered.map((mp) => <MpCard key={mp.id} mp={mp} onClick={onSelect} />)}
        </div>
      ) : (
        <MpList mps={filtered} onSelect={onSelect} />
      )}

      {filtered.length === 0 && (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          {t('dir.noMatch')}
        </div>
      )}
    </div>
  );
};

/* --- List view --- */
const COLS = 'minmax(200px, 2fr) 1fr 78px 78px 78px 70px 22px';

const MpList: React.FC<{ mps: MP[]; onSelect: (mp: MP) => void }> = ({ mps, onSelect }) => {
  const { t } = useLang();
  return (
  <div className="glass-panel" style={{ padding: '8px', overflowX: 'auto' }}>
    <div style={{ minWidth: '760px' }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: '12px', padding: '10px 14px', fontSize: '11px', letterSpacing: '0.04em', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
        <span>{t('dir.colMember')}</span><span>{t('dir.colState')}</span>
        <span style={{ textAlign: 'right' }}>{t('dir.colRequests')}</span>
        <span style={{ textAlign: 'right' }}>{t('dir.colResolved')}</span>
        <span style={{ textAlign: 'right' }}>{t('dir.colPending')}</span>
        <span style={{ textAlign: 'right' }}>{t('dir.colDone')}</span>
        <span />
      </div>
      {mps.map((mp) => (
        <button
          key={mp.id}
          onClick={() => onSelect(mp)}
          className="glass-panel-hover"
          style={{
            display: 'grid', gridTemplateColumns: COLS, gap: '12px', alignItems: 'center',
            width: '100%', textAlign: 'left', cursor: 'pointer', padding: '10px 14px',
            background: 'transparent', border: 'none', borderTop: '1px solid var(--border-card)', borderRadius: '8px',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <Avatar name={mp.name} photoUrl={mp.photo_url} size={34} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mp.name}</span>
              <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {mp.constituency_name} · {mp.party_abbr || mp.party || 'IND'}
              </span>
            </span>
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mp.state}</span>
          <span style={{ textAlign: 'right', fontWeight: 700 }}>{mp.total_suggestions}</span>
          <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--india-green)' }}>{mp.resolved_suggestions}</span>
          <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--warning)' }}>{mp.pending_suggestions}</span>
          <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--secondary)' }}>{mp.sanctioned_projects}</span>
          <ChevronRight size={16} color="var(--text-muted)" />
        </button>
      ))}
    </div>
  </div>
  );
};

export default MpDirectory;
