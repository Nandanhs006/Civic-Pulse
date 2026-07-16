import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { MP } from '../types';
import ConstituencyDashboard from '../components/features/dashboard/ConstituencyDashboard';
import Avatar from '../components/common/Avatar';
import { ArrowLeft, MapPin, RefreshCw } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useIsMobile } from '../hooks/useIsMobile';

/** A single constituency's page (MP header + dashboard), reached by clicking an
 *  MP card. Route-based so the URL/breadcrumb reflect it and Back works. */
const ConstituencyView: React.FC = () => {
  const { constituencyId } = useParams();
  const id = Number(constituencyId);
  const navigate = useNavigate();
  const { t } = useLang();
  const isMobile = useIsMobile();
  const [mp, setMp] = useState<MP | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient
      .get<MP>(`/api/v1/mps/${id}`)
      .then((r) => active && setMp(r.data))
      .catch((e) => console.error('Failed to load MP', e))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="btn-secondary"
        style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 14px', fontSize: '13px' }}
      >
        <ArrowLeft size={15} /> {t('pmo.backToAll')}
      </button>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
          <RefreshCw size={28} className="animate-spin" color="var(--primary)" />
        </div>
      ) : mp ? (
        <div
          className="glass-panel"
          style={{
            padding: isMobile ? '18px' : '22px',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '14px' : '18px',
            flexDirection: isMobile ? 'column' : 'row',
            textAlign: isMobile ? 'center' : 'left',
          }}
        >
          <Avatar name={mp.name} photoUrl={mp.photo_url} size={isMobile ? 72 : 64} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: isMobile ? '21px' : '25px', color: 'var(--text-main)', lineHeight: 1.2 }}>{mp.name}</h1>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
                justifyContent: isMobile ? 'center' : 'flex-start',
                color: 'var(--text-muted)',
                fontSize: '14px',
                marginTop: '6px',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MapPin size={14} color="var(--saffron)" /> {mp.constituency_name}, {mp.state}
              </span>
              {mp.party && <span className="chip">{mp.party_abbr || mp.party}</span>}
            </div>
          </div>
        </div>
      ) : null}

      <ConstituencyDashboard constituencyId={id} />
    </div>
  );
};

export default ConstituencyView;
