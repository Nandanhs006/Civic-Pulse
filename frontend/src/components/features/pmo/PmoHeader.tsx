import React from 'react';
import { NavLink } from 'react-router-dom';
import { Command } from 'lucide-react';

const tabStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
  borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
  padding: '8px 10px',
  paddingBottom: '10px',
  fontWeight: 600,
  textDecoration: 'none',
  fontSize: '14px',
  transition: 'all 0.2s ease',
  whiteSpace: 'nowrap',
});

interface PmoHeaderProps {
  subtitle: string;
}

const PmoHeader: React.FC<PmoHeaderProps> = ({ subtitle }) => (
  <>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
        background: 'linear-gradient(135deg, var(--primary), hsl(222,72%,38%))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Command size={24} color="white" />
      </div>
      <div>
        <h1 style={{ fontSize: '28px', color: 'var(--text-main)', margin: 0 }}>PMO Command Center</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '3px 0 0' }}>{subtitle}</p>
      </div>
    </div>

    <div style={{
      display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-card)',
      paddingBottom: '0', overflowX: 'auto',
    }} className="hide-scrollbar">
      <NavLink to="/pmo" end style={tabStyle}>Representative Directory</NavLink>
      <NavLink to="/pmo/analytics" style={tabStyle}>Dashboard</NavLink>
      <NavLink to="/pmo/leaderboard" style={tabStyle}>Performance Index</NavLink>
    </div>
  </>
);

export default PmoHeader;
