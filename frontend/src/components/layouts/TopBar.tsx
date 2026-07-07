import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { Landmark, Sun, Moon, LogOut, LogIn, LayoutDashboard, Radio, Command, MapPinned } from 'lucide-react';

const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 14px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
  color: isActive ? 'white' : 'var(--text-muted)',
  background: isActive ? 'var(--primary)' : 'transparent',
  transition: 'all 0.2s ease',
});

const TopBar: React.FC = () => {
  const { user, token, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLang();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 500 }}>
      <div
        className="glass-panel"
        style={{
          borderRadius: 0,
          borderLeft: 'none',
          borderRight: 'none',
          borderTop: 'none',
          padding: isMobile ? '10px 14px' : '12px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        {/* Brand */}
        <NavLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              width: isMobile ? 36 : 42,
              height: isMobile ? 36 : 42,
              borderRadius: 10,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, var(--saffron), var(--india-green))',
            }}
          >
            <Landmark size={isMobile ? 20 : 24} color="white" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: isMobile ? '16px' : '18px', color: 'var(--text-main)' }}>
              Civic Pulse
            </div>
            {!isMobile && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                {t('brand.tagline')}
              </div>
            )}
          </div>
        </NavLink>

        {/* Nav + actions */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '8px' }}>
          <NavLink to="/" style={navLinkStyle} end title={t('nav.portal')}>
            <Radio size={16} /> {!isMobile && t('nav.portal')}
          </NavLink>

          <NavLink to="/map" style={navLinkStyle} title={t('nav.liveMap')}>
            <MapPinned size={16} /> {!isMobile && t('nav.liveMap')}
          </NavLink>

          {user?.role === 'mp' && (
            <NavLink to="/mp" style={navLinkStyle} title={t('nav.myConstituency')}>
              <LayoutDashboard size={16} /> {!isMobile && t('nav.myConstituency')}
            </NavLink>
          )}
          {user?.role === 'pmo' && (
            <NavLink to="/pmo" style={navLinkStyle} title={t('nav.pmoCommand')}>
              <Command size={16} /> {!isMobile && t('nav.pmoCommand')}
            </NavLink>
          )}

          <LanguageSwitcher />

          <button
            onClick={toggleTheme}
            className="btn-secondary"
            aria-label="Toggle theme"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            style={{ padding: '9px', display: 'flex', border: '1px solid var(--border-card)' }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {token && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '4px' }}>
              {!isMobile && (
                <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {user.full_name || user.email}
                  </div>
                  <span className="chip" style={{ fontSize: '10px', padding: '1px 8px' }}>
                    {user.role === 'pmo' ? t('role.pmo') : t('role.mp')}
                  </span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="btn-secondary"
                style={{ padding: '9px', display: 'flex', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                title={t('nav.signOut')}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <NavLink to="/login" style={navLinkStyle} title={t('nav.staffLogin')}>
              <LogIn size={16} /> {!isMobile && t('nav.staffLogin')}
            </NavLink>
          )}
        </nav>
      </div>
      <div className="tricolour-bar" />
    </header>
  );
};

export default TopBar;
