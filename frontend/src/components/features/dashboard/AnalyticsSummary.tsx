import React from 'react';
import { AnalyticsSummary as SummaryType } from '../../../types';
import { useLang } from '../../../context/LanguageContext';
import { MessageSquare, FolderGit, Activity, Sparkles } from 'lucide-react';

interface AnalyticsSummaryProps {
  summary: SummaryType | null;
}

const AnalyticsSummary: React.FC<AnalyticsSummaryProps> = ({ summary }) => {
  const { t } = useLang();
  if (!summary) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
        <div className="glass-panel" style={cardStyle}>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>{t('analytics.totalSuggestions')}</div>
            <h2 style={{ fontSize: '32px', marginTop: '4px' }}>{summary.total_suggestions}</h2>
          </div>
          <div style={iconContainerStyle('hsla(263, 70%, 60%, 0.25)')}>
            <MessageSquare size={24} color="var(--primary)" />
          </div>
        </div>

        <div className="glass-panel" style={cardStyle}>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>{t('analytics.recommendedProjects')}</div>
            <h2 style={{ fontSize: '32px', marginTop: '4px' }}>{summary.total_projects}</h2>
          </div>
          <div style={iconContainerStyle('hsla(190, 90%, 50%, 0.25)')}>
            <FolderGit size={24} color="var(--secondary)" />
          </div>
        </div>

        <div className="glass-panel" style={cardStyle}>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>{t('analytics.unresolvedRate')}</div>
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
          {t('analytics.sectorDemand')}
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Object.entries(summary.category_counts).length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{t('analytics.noDemand')}</p>
          ) : (
            Object.entries(summary.category_counts)
              .sort((a, b) => b[1] - a[1])
              .map(([category, count]) => {
                const maxCount = Math.max(...Object.values(summary.category_counts));
                const percentage = (count / maxCount) * 100;
                
                return (
                  <div key={category} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 40px', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{t('category.' + category)}</span>
                    <div style={{ height: '10px', background: 'var(--bg-subtle, rgba(128,128,128,0.15))', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.max(percentage, count > 0 ? 6 : 0)}%`,
                        background: 'linear-gradient(90deg, var(--saffron, #FF9933), var(--secondary))',
                        borderRadius: '5px',
                        transition: 'width 1s ease-out'
                      }}></div>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 700, textAlign: 'right' }}>{count}</span>
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
