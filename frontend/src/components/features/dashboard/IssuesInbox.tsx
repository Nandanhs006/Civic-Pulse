import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../../../services/apiClient';
import { Suggestion } from '../../../types';
import { useLang } from '../../../context/LanguageContext';
import { colorOf } from '../map/severity';
import { Inbox, Building2, Check, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

interface Props {
  suggestions: Suggestion[];
  onChange: () => void;
}

// Statuses at/after the "Assigned" stage — AI has routed & it's moving.
const ASSIGNED_PLUS = new Set(['Approved', 'Sanctioned', 'Completed']);

/** An issue needs an MP's judgment only if it's critical & unrouted, or the AI
 *  couldn't map it to a department. Everything else the AI auto-handles. */
const needsReview = (s: Suggestion): boolean => {
  if (s.status === 'Rejected' || ASSIGNED_PLUS.has(s.status)) return false;
  if (!s.department) return true;
  return s.priority_score > 75;
};

const trackCode = (id: string) => 'CP-' + id.replace(/-/g, '').slice(0, 8).toUpperCase();

/**
 * MP inbox — AI auto-routes every request to a department; the MP only handles
 * the queue that needs judgment (critical or ambiguous), approving or overriding.
 */
const IssuesInbox: React.FC<Props> = ({ suggestions, onChange }) => {
  const { t } = useLang();
  const [depts, setDepts] = useState<string[]>([]);
  const [byCat, setByCat] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<'review' | 'all'>('review');
  const [catF, setCatF] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [justDone, setJustDone] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<{ departments: string[]; by_category: Record<string, string> }>('/api/v1/suggestions/meta/departments')
      .then((r) => { setDepts(r.data.departments); setByCat(r.data.by_category); })
      .catch(() => {});
  }, []);

  const categories = useMemo(() => Array.from(new Set(suggestions.map((s) => s.category).filter(Boolean))).sort() as string[], [suggestions]);
  const reviewCount = useMemo(() => suggestions.filter(needsReview).length, [suggestions]);

  const list = useMemo(() => suggestions
    .filter((s) => (tab === 'review' ? needsReview(s) : true))
    .filter((s) => (catF ? s.category === catF : true))
    .filter((s) => (q ? (s.english_translation || s.content || '').toLowerCase().includes(q.toLowerCase()) : true))
    .sort((a, b) => b.priority_score - a.priority_score), [suggestions, tab, catF, q]);

  const assign = (s: Suggestion, department: string) => {
    if (!department) return;
    setBusy(s.id);
    apiClient
      .post(`/api/v1/suggestions/${s.id}/assign`, { department })
      .then(() => { setJustDone(s.id); setTimeout(() => setJustDone(null), 1200); onChange(); })
      .catch((e) => console.error('assign failed', e))
      .finally(() => setBusy(null));
  };

  const tabBtn = (key: 'review' | 'all', accent?: string): React.CSSProperties => ({
    padding: '6px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
    background: tab === key ? (accent || 'var(--secondary)') : 'transparent',
    color: tab === key ? '#fff' : 'var(--text-muted)',
  });

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Inbox size={18} color="var(--secondary)" /> {t('inbox.title')}
        </h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('inbox.search')} className="glass-input" style={{ fontSize: 13, padding: '7px 10px', width: 130 }} />
          <select value={catF} onChange={(e) => setCatF(e.target.value)} className="glass-input" style={{ fontSize: 13, padding: '7px 10px' }}>
            <option value="">{t('inbox.allCategories')}</option>
            {categories.map((c) => <option key={c} value={c}>{t('category.' + c)}</option>)}
          </select>
        </div>
      </div>

      {/* AI routing note + tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
        <Sparkles size={14} color="var(--secondary)" /> {t('inbox.aiNote')}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => setTab('review')} style={tabBtn('review', '#dc2626')}>
          {t('inbox.needsReview')} ({reviewCount})
        </button>
        <button onClick={() => setTab('all')} style={tabBtn('all')}>
          {t('inbox.all')} ({suggestions.length})
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 440, overflowY: 'auto' }}>
        {list.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '14px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
            {tab === 'review' ? <><CheckCircle2 size={16} color="#16a34a" /> {t('inbox.allClear')}</> : t('inbox.empty')}
          </div>
        )}
        {list.map((s) => {
          const review = needsReview(s);
          const suggested = s.department || byCat[s.category || ''] || '';
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: `1px solid ${review ? 'rgba(220,38,38,0.35)' : 'var(--border-card, rgba(128,128,128,.2))'}`, background: 'var(--bg-card-hover)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: colorOf(s), flexShrink: 0 }} title={`${s.priority_score}/100`} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {(s.english_translation || s.content || '').replace(/^\[demo\]\s*/, '')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                  <span>{s.category ? t('category.' + s.category) : '—'}</span>
                  <span>· {t('status.' + s.status)}</span>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>· {trackCode(s.id)}</span>
                  {s.department && !review && <span style={{ color: 'var(--india-green)' }}>· ✓ {s.department}</span>}
                  {review && suggested && <span style={{ color: 'var(--secondary)' }}>· {t('inbox.aiSuggests')}: {suggested}</span>}
                </div>
              </div>

              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                {busy === s.id ? <Loader2 size={15} className="animate-spin" /> : justDone === s.id ? <Check size={16} color="#16a34a" /> : null}
                {review && suggested && busy !== s.id && justDone !== s.id && (
                  <button onClick={() => assign(s, suggested)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    {t('inbox.approve')}
                  </button>
                )}
                <select
                  value=""
                  onChange={(e) => assign(s, e.target.value)}
                  className="glass-input"
                  style={{ fontSize: 12, padding: '6px 8px', maxWidth: 150, color: 'var(--text-muted)' }}
                  title={t('inbox.reassign')}
                >
                  <option value="">{review ? t('inbox.reassign') : (s.department ? '⋯' : t('inbox.assignTo'))}</option>
                  {(depts.length ? depts : [suggested]).filter(Boolean).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {!review && !busy && <Building2 size={14} color="var(--india-green)" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IssuesInbox;
