import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Radio, LogOut, Vote } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, logout } = useAuth();

  return (
    <aside className="glass-panel" style={{
      width: '280px',
      height: 'calc(100vh - 40px)',
      margin: '20px',
      padding: '30px 20px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'fixed'
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <Vote size={32} color="hsl(263, 70%, 60%)" />
          <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-display)' }}>Civic Pulse</h2>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`btn-secondary ${currentTab === 'dashboard' ? 'active' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              textAlign: 'left',
              border: currentTab === 'dashboard' ? '1px solid var(--primary)' : '1px solid transparent',
              background: currentTab === 'dashboard' ? 'hsla(263, 70%, 60%, 0.15)' : 'transparent',
              color: currentTab === 'dashboard' ? 'var(--text-main)' : 'var(--text-muted)'
            }}
          >
            <LayoutDashboard size={20} />
            MP Dashboard
          </button>

          <button
            onClick={() => setCurrentTab('portal')}
            className={`btn-secondary ${currentTab === 'portal' ? 'active' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              textAlign: 'left',
              border: currentTab === 'portal' ? '1px solid var(--primary)' : '1px solid transparent',
              background: currentTab === 'portal' ? 'hsla(263, 70%, 60%, 0.15)' : 'transparent',
              color: currentTab === 'portal' ? 'var(--text-main)' : 'var(--text-muted)'
            }}
          >
            <Radio size={20} />
            Citizen Portal
          </button>
        </nav>
      </div>

      {user && (
        <div style={{
          borderTop: '1px solid var(--border-card)',
          paddingTop: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>{user.full_name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.email}</div>
          </div>
          <button
            onClick={logout}
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              borderColor: 'var(--danger)',
              color: 'var(--danger)'
            }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
