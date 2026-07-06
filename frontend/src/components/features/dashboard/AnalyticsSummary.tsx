import React from 'react';
import { AnalyticsSummary as SummaryType } from '../../../types';
import { MessageSquare, FolderGit, Activity, Sparkles } from 'lucide-react';

interface AnalyticsSummaryProps {
  summary: SummaryType | null;
}

const AnalyticsSummary: React.FC<AnalyticsSummaryProps> = ({ summary }) => {
  if (!summary) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-panel loading-shimmer" style={{ height: '120px' }}></div>
        ))}
      </div>
    );
  }

  const cardStyle: React.CSSProperties = {
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px'
  };

  const iconContainerStyle = (color: string): React.CSSProperties => ({
    background: color,
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }} className="animate-fade-in">
      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <div className="glass-panel" style={cardStyle}>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>Total Suggestions</div>
            <h2 style={{ fontSize: '32px', marginTop: '4px' }}>{summary.total_suggestions}</h2>
          </div>
          <div style={iconContainerStyle('hsla(263, 70%, 60%, 0.25)')}>
            <MessageSquare size={24} color="var(--primary)" />
          </div>
        </div>

        <div className="glass-panel" style={cardStyle}>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>Recommended Projects</div>
            <h2 style={{ fontSize: '32px', marginTop: '4px' }}>{summary.total_projects}</h2>
          </div>
          <div style={iconContainerStyle('hsla(190, 90%, 50%, 0.25)')}>
            <FolderGit size={24} color="var(--secondary)" />
          </div>
        </div>

        <div className="glass-panel" style={cardStyle}>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>Unresolved Rate</div>
            <h2 style={{ fontSize: '32px', marginTop: '4px' }}>{summary.unresolved_percentage.toFixed(1)}%</h2>
          </div>
          <div style={iconContainerStyle('hsla(325, 90%, 60%, 0.25)')}>
            <Activity size={24} color="var(--accent)" />
          </div>
        </div>
      </div>

      {/* Category Demand Bars */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="var(--secondary)" />
          Sector-wise Grievance Demand (Constituency Metrics)
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Object.entries(summary.category_counts).length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No demand requests registered yet.</p>
          ) : (
            Object.entries(summary.category_counts)
              .sort((a, b) => b[1] - a[1])
              .map(([category, count]) => {
                const maxCount = Math.max(...Object.values(summary.category_counts));
                const percentage = (count / maxCount) * 100;
                
                return (
                  <div key={category} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 40px', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{category}</span>
                    <div style={{ height: '8px', background: 'hsla(224, 25%, 6%, 0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${percentage}%`,
                        background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                        borderRadius: '4px',
                        transition: 'width 1s ease-out'
                      }}></div>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 600, textAlign: 'right' }}>{count}</span>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsSummary;
