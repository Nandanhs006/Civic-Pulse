import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../services/apiClient';
import { MapIssue, Hierarchy } from '../../../types';
import { useLang } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import RoutingTree from '../../common/RoutingTree';
import IssueTimeline from '../../common/IssueTimeline';
import { severityOf, SEVERITY_COLOR } from './severity';
import { X, Image as ImageIcon, CalendarDays, ListChecks } from 'lucide-react';

interface IssueDetailPanelProps {
  issue: MapIssue;
  onClose: () => void;
}

const chip = (color?: string): React.CSSProperties => ({
  fontSize: '12px',
  fontWeight: 600,
  padding: '3px 10px',
  borderRadius: 999,
  border: `1px solid ${color || 'var(--border-card)'}`,
  color: color || 'var(--text-muted)',
  background: color ? color + '18' : 'var(--bg-card)',
});

const IssueDetailPanel: React.FC<IssueDetailPanelProps> = ({ issue, onClose }) => {
  const { t } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hierarchy, setHierarchy] = useState<Hierarchy | null>(null);
  const [imgBroken, setImgBroken] = useState(false);

  useEffect(() => {
    setHierarchy(null);
    setImgBroken(false);
    if (issue.latitude != null && issue.longitude != null) {
      apiClient
        .get<Hierarchy>('/api/v1/hierarchy/locate', { params: { lat: issue.latitude, lng: issue.longitude } })
        .then((r) => setHierarchy(r.data))
        .catch(() => setHierarchy(null));
    }
  }, [issue]);

  const sev = severityOf(issue);
  const date = new Date(issue.created_at).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
  const text = (issue.english_translation || issue.content || '').replace(/^\[demo\]\s*/, '');

  return (
    <div
      className="glass-panel"
      style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 18, overflowY: 'auto' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={chip(SEVERITY_COLOR[sev])}>{t('sev.' + sev)}</span>
          {issue.category && <span style={chip()}>{t('category.' + issue.category)}</span>}
          {issue.sentiment && <span style={chip()}>{t('sentiment.' + issue.sentiment)}</span>}
        </div>
        <button onClick={onClose} aria-label={t('map.close')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
          <X size={18} />
        </button>
      </div>

      {/* Photo */}
      {issue.image_url && !imgBroken ? (
        <img
          src={issue.image_url}
          alt="Issue"
          onError={() => setImgBroken(true)}
          style={{ width: '100%', height: 170, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border-card)' }}
        />
      ) : (
        <div style={{ height: 96, borderRadius: 10, border: '1px dashed var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '13px' }}>
          <ImageIcon size={16} /> {t('map.noPhoto')}
        </div>
      )}

      <p style={{ fontSize: '14px', color: 'var(--text-main)', margin: 0, lineHeight: 1.5 }}>{text}</p>

      <div style={{ display: 'flex', gap: 16, fontSize: '12.5px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <CalendarDays size={14} /> {t('map.reported')}: {date}
        </span>
        <span>{t('map.priorityLabel')}: <strong style={{ color: 'var(--text-main)' }}>{issue.priority_score}/100</strong></span>
        <span>{t('map.statusLabel')}: <strong style={{ color: 'var(--text-main)' }}>{t('status.' + issue.status)}</strong></span>
      </div>

      {/* Tracking timeline */}
      <div style={{ borderTop: '1px solid var(--border-subtle, rgba(128,128,128,.15))', paddingTop: 12 }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ListChecks size={14} /> {t('track.heading')}
        </div>
        <IssueTimeline issueId={issue.id} canAdvance={user?.role === 'mp' || user?.role === 'pmo'} />
      </div>

      <div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
          {t('map.representatives')}
        </div>
        <RoutingTree
          hierarchy={hierarchy}
          onMpClick={user?.role === 'pmo' ? (cid) => navigate(`/pmo/mp/${cid}`) : undefined}
        />
      </div>
    </div>
  );
};

export default IssueDetailPanel;
