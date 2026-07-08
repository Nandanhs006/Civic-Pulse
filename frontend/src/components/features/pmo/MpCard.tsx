import React from 'react';
import { MP } from '../../../types';
import Avatar from '../../common/Avatar';
import { ChevronRight } from 'lucide-react';
import { useLang } from '../../../context/LanguageContext';

interface MpCardProps {
  mp: MP;
  onClick: (mp: MP) => void;
}

const MpCard: React.FC<MpCardProps> = ({ mp, onClick }) => {
  const { t } = useLang();
  const backlogColor =
    mp.unresolved_percentage > 66 ? 'var(--danger)' : mp.unresolved_percentage > 33 ? 'var(--warning)' : 'var(--success)';

  return (
    <button
      onClick={() => onClick(mp)}
      className="glass-panel glass-panel-hover"
      style={{
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        cursor: 'pointer',
        textAlign: 'left',
        border: '1px solid var(--border-card)',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Avatar name={mp.name} photoUrl={mp.photo_url} size={54} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {mp.name}
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {mp.constituency_name}, {mp.state}
          </div>
          <span className="chip" style={{ marginTop: '5px', fontSize: '10.5px', padding: '1px 8px' }}>
            {mp.party_abbr || mp.party || 'IND'}
          </span>
        </div>
        <ChevronRight size={18} color="var(--text-muted)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', borderTop: '1px solid var(--border-card)', paddingTop: '12px' }}>
        <Metric label={t('card.requests')} value={mp.total_suggestions} />
        <Metric label={t('card.resolved')} value={mp.resolved_suggestions} color="var(--india-green)" />
        <Metric label={t('card.pending')} value={mp.pending_suggestions} color={backlogColor} />
        <Metric label={t('card.done')} value={mp.sanctioned_projects} color="var(--secondary)" />
      </div>
    </button>
  );
};

const Metric: React.FC<{ label: string; value: React.ReactNode; color?: string }> = ({ label, value, color }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: '17px', fontWeight: 700, color: color || 'var(--text-main)' }}>{value}</div>
    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
  </div>
);

export default MpCard;
