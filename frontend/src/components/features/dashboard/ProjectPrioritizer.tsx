import React, { useState } from 'react';
import { ProposedProject } from '../../../types';
import apiClient from '../../../services/apiClient';
import { useLang } from '../../../context/LanguageContext';
import { Briefcase, Zap, Check, Loader2, IndianRupee } from 'lucide-react';

interface ProjectPrioritizerProps {
  projects: ProposedProject[];
  onRefresh: () => void;
  constituencyId?: number;
}

const ProjectPrioritizer: React.FC<ProjectPrioritizerProps> = ({ projects, onRefresh, constituencyId }) => {
  const { t } = useLang();
  const [runningModel, setRunningModel] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const triggerRecommendations = async () => {
    setRunningModel(true);
    try {
      await apiClient.post('/api/v1/projects/recommend', null, {
        params: constituencyId ? { constituency_id: constituencyId } : {},
      });
      onRefresh();
      alert(t('proj.aiDone'));
    } catch (err) {
      console.error(err);
      alert(t('proj.aiFail'));
    } finally {
      setRunningModel(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      await apiClient.patch(`/api/v1/projects/${id}`, { status });
      onRefresh();
    } catch (err) {
      console.error(err);
      alert(t('proj.updateFail'));
    } finally {
      setUpdatingId(null);
    }
  };

  const formatCost = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase size={18} color="var(--primary)" />
            {t('proj.title')}
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {t('proj.subtitle')}
          </p>
        </div>
        <button
          onClick={triggerRecommendations}
          disabled={runningModel}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontSize: '13px' }}
        >
          {runningModel ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {t('proj.ranking')}
            </>
          ) : (
            <>
              <Zap size={16} />
              {t('proj.runAI')}
            </>
          )}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
        {projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <p>{t('proj.none1')}</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>{t('proj.none2')}</p>
          </div>
        ) : (
          projects.map((proj) => (
            <div key={proj.id} className="glass-panel" style={{
              padding: '16px',
              borderLeft: `4px solid ${proj.priority_score > 75 ? 'var(--danger)' : proj.priority_score > 45 ? 'var(--warning)' : 'var(--success)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: 'hsla(224, 25%, 10%, 0.4)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ fontSize: '15px', color: 'var(--text-main)' }}>{proj.title}</h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('proj.categoryLabel', { cat: t('category.' + proj.category) })}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: proj.priority_score > 75 ? 'hsla(346, 84%, 55%, 0.2)' : 'hsla(38, 92%, 50%, 0.2)',
                    color: proj.priority_score > 75 ? 'var(--danger)' : 'var(--warning)'
                  }}>
                    {t('proj.priority', { score: proj.priority_score })}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: proj.status === 'Sanctioned' ? 'hsla(142, 70%, 45%, 0.2)' : 'hsla(220, 20%, 30%, 0.2)',
                    color: proj.status === 'Sanctioned' ? 'var(--success)' : 'var(--text-muted)',
                    fontWeight: 600
                  }}>
                    {t('status.' + proj.status)}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0' }}>
                {proj.description || proj.ai_justification}
              </p>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid var(--border-card)',
                paddingTop: '12px',
                marginTop: '4px'
              }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>{t('proj.estCost')}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center' }}>
                      <IndianRupee size={12} style={{ marginRight: '2px' }} />
                      {formatCost(proj.estimated_cost).replace('₹', '')}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>{t('proj.supporting')}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--secondary)' }}>
                      {t('proj.citizens', { count: proj.supporting_suggestions_count })}
                    </span>
                  </div>
                </div>

                {proj.status === 'Proposed' && (
                  <button
                    disabled={updatingId === proj.id}
                    onClick={() => handleStatusChange(proj.id, 'Sanctioned')}
                    className="btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      background: 'linear-gradient(135deg, var(--success), hsl(142, 70%, 35%))',
                      boxShadow: 'none'
                    }}
                  >
                    {updatingId === proj.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    {t('proj.sanctionWork')}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProjectPrioritizer;
