import React, { useCallback, useEffect, useState } from 'react';
import apiClient from '../../services/apiClient';
import { useLang } from '../../context/LanguageContext';
import { Check, Loader2, Copy, ChevronRight, XCircle } from 'lucide-react';

interface TimelineStage {
  key: string;
  label: string;
  done: boolean;
  current: boolean;
  at: string | null;
  actor: string;
}
interface Timeline {
  id: string;
  tracking_code: string;
  category: string | null;
  content: string;
  status: string;
  current_stage: string;
  rejected: boolean;
  created_at: string | null;
  stages: TimelineStage[];
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) +
    ', ' + new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';

/**
 * E-commerce-delivery-style tracking timeline for a citizen issue.
 * Fetches by issue id OR tracking code. If `canAdvance`, an MP / local body can
 * push it to the next stage.
 */
const IssueTimeline: React.FC<{ issueId: string; canAdvance?: boolean }> = ({ issueId, canAdvance }) => {
  const { t } = useLang();
  const [tl, setTl] = useState<Timeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiClient
      .get<Timeline>(`/api/v1/suggestions/${encodeURIComponent(issueId)}/timeline`)
      .then((r) => setTl(r.data))
      .catch(() => setTl(null))
      .finally(() => setLoading(false));
  }, [issueId]);
  useEffect(load, [load]);

  const advance = () => {
    if (!tl) return;
    setAdvancing(true);
    apiClient
      .post<Timeline>(`/api/v1/suggestions/${tl.id}/advance`, {})
      .then((r) => setTl(r.data))
      .catch((e) => console.error('advance failed', e))
      .finally(() => setAdvancing(false));
  };

  if (loading) return <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 8 }}><Loader2 size={13} className="animate-spin" /> {t('track.loading')}</div>;
  if (!tl) return <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 8 }}>{t('track.notFound')}</div>;

  const resolved = tl.current_stage === 'resolved';
  const canPush = canAdvance && !tl.rejected && !resolved;

  return (
    <div>
      {/* Tracking code header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('track.trackingId')}</div>
          <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.02em' }}>{tl.tracking_code}</div>
        </div>
        <button
          onClick={() => { navigator.clipboard?.writeText(tl.tracking_code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="glass-input"
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', fontSize: 11, cursor: 'pointer' }}
        >
          {copied ? <Check size={13} color="#16a34a" /> : <Copy size={13} />} {copied ? t('track.copied') : t('track.copy')}
        </button>
      </div>

      {/* Vertical stepper */}
      <div style={{ position: 'relative', paddingLeft: 4 }}>
        {tl.stages.map((s, i) => {
          const color = s.done ? '#16a34a' : s.current ? '#2563eb' : 'var(--border-card, #cbd5e1)';
          const last = i === tl.stages.length - 1;
          return (
            <div key={s.key} style={{ display: 'flex', gap: 12, position: 'relative' }}>
              {/* Dot + connector */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0, zIndex: 1,
                  background: s.done ? color : 'var(--bg-card)', border: `2px solid ${color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: s.current ? '0 0 0 4px rgba(37,99,235,.2)' : 'none',
                }}>
                  {s.done ? <Check size={13} color="#fff" /> : s.current ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} /> : null}
                </div>
                {!last && <div style={{ width: 2, flex: 1, minHeight: 26, background: s.done ? '#16a34a' : 'var(--border-card, #e2e8f0)' }} />}
              </div>
              {/* Label + meta */}
              <div style={{ paddingBottom: last ? 0 : 14, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: s.current ? 800 : s.done ? 600 : 500, color: s.done || s.current ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  {s.label}{s.current && <span style={{ color: '#2563eb', fontSize: 11, fontWeight: 700 }}> · {t('track.current')}</span>}
                </div>
                {s.at && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt(s.at)} · {s.actor}</div>}
                {!s.done && !s.current && <div style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.7 }}>{t('track.pending')}</div>}
              </div>
            </div>
          );
        })}
        {tl.rejected && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontSize: 13, fontWeight: 700, marginTop: 6 }}>
            <XCircle size={18} /> {t('track.closed')}
          </div>
        )}
      </div>

      {/* MP / local body: advance */}
      {canPush && (
        <button
          onClick={advance}
          disabled={advancing}
          style={{ marginTop: 12, width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          {advancing ? <Loader2 size={15} className="animate-spin" /> : <ChevronRight size={15} />} {t('track.advance')}
        </button>
      )}
    </div>
  );
};

export default IssueTimeline;
