import React, { useState } from 'react';
import { ProposedProject } from '../../../types';
import apiClient from '../../../services/apiClient';
import { Briefcase, Zap, PlusCircle, Check, Loader2, IndianRupee } from 'lucide-react';

interface ProjectPrioritizerProps {
  projects: ProposedProject[];
  onRefresh: () => void;
}

const ProjectPrioritizer: React.FC<ProjectPrioritizerProps> = ({ projects, onRefresh }) => {
  const [runningModel, setRunningModel] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const triggerRecommendations = async () => {
    setRunningModel(true);
    try {
      await apiClient.post('/api/v1/projects/recommend');
      onRefresh();
      alert('AI prioritization model completed! New project proposals generated.');
    } catch (err) {
      console.error(err);
      alert('Failed to generate project suggestions.');
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
      alert('Failed to update project status.');
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
            AI-Prioritized Development Works
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            MPLADS fund allocations ranked dynamically by urgency metrics.
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
              Ranking...
            </>
          ) : (
            <>
              <Zap size={16} />
              Run AI Prioritization
            </>
          )}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
        {projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <p>No recommended projects generated yet.</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Click "Run AI Prioritization" above to scan citizen demands.</p>
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
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Category: {proj.category}</span>
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
                    Priority: {proj.priority_score}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: proj.status === 'Sanctioned' ? 'hsla(142, 70%, 45%, 0.2)' : 'hsla(220, 20%, 30%, 0.2)',
                    color: proj.status === 'Sanctioned' ? 'var(--success)' : 'var(--text-muted)',
                    fontWeight: 600
                  }}>
                    {proj.status}
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
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>ESTIMATED COST</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center' }}>
                      <IndianRupee size={12} style={{ marginRight: '2px' }} />
                      {formatCost(proj.estimated_cost).replace('₹', '')}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>SUPPORTING PETITIONS</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--secondary)' }}>
                      {proj.supporting_suggestions_count} Citizens
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
                    Sanction Work
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
