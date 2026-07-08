import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import LanguageSwitcher from '../common/LanguageSwitcher';
import {
  Sun, Moon, LogOut, LogIn, LayoutDashboard, Radio, Command,
  MapPinned, Users, Menu, X,
} from 'lucide-react';

const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 14px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  flexShrink: 0,
  textDecoration: 'none',
  color: isActive ? 'white' : 'var(--text-muted)',
  background: isActive ? 'var(--primary)' : 'transparent',
  transition: 'all 0.2s ease',
});

// Full-width row used inside the mobile dropdown menu.
const mobileRowStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '13px 14px',
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: 600,
  textDecoration: 'none',
  color: isActive ? 'white' : 'var(--text-main)',
  background: isActive ? 'var(--primary)' : 'transparent',
});

const iconBtnStyle: React.CSSProperties = {
  padding: '9px',
  display: 'flex',
  flexShrink: 0,
  border: '1px solid var(--border-card)',
};

const TopBar: React.FC = () => {
  const { user, token, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLang();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Publish the top bar's height so the sticky breadcrumb can offset below it.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const publish = () =>
      document.documentElement.style.setProperty('--topbar-h', `${el.offsetHeight}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    logout();
    closeMenu();
    navigate('/');
  };

  // Nav destinations shared by the desktop bar and the mobile menu.
  const navItems = [
    { to: '/', label: t('nav.portal'), icon: Radio, end: true },
    { to: '/map', label: t('nav.liveMap'), icon: MapPinned },
    { to: '/participate', label: t('nav.participate'), icon: Users },
    ...(user?.role === 'mp'
      ? [{ to: '/mp', label: t('nav.myConstituency'), icon: LayoutDashboard }]
      : []),
    ...(user?.role === 'pmo'
      ? [{ to: '/pmo', label: t('nav.pmoCommand'), icon: Command }]
      : []),
  ];

  return (
    <header ref={headerRef} style={{ position: 'sticky', top: 0, zIndex: 500 }}>
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
        <NavLink to="/" onClick={closeMenu} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{ width: isMobile ? 36 : 42, height: isMobile ? 36 : 42, borderRadius: 10, flexShrink: 0, overflow: 'hidden' }}>
            <img
              src={theme === 'light' ? '/logo/logo.png' : '/logo/logo_dark.png'}
              alt="Civic Pulse logo"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
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

        {isMobile ? (
          /* Mobile: hamburger toggle */
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="btn-secondary"
            aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={menuOpen}
            style={iconBtnStyle}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        ) : (
          /* Desktop: inline nav + actions */
          <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} style={navLinkStyle} title={item.label}>
                <item.icon size={16} /> {item.label}
              </NavLink>
            ))}

            <LanguageSwitcher />

            <button
              onClick={toggleTheme}
              className="btn-secondary"
              aria-label="Toggle theme"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              style={iconBtnStyle}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {token && user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '4px', flexShrink: 0 }}>
                <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {user.full_name || user.email}
                  </div>
                  <span className="chip" style={{ fontSize: '10px', padding: '1px 8px' }}>
                    {user.role === 'pmo' ? t('role.pmo') : t('role.mp')}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-secondary"
                  style={{ ...iconBtnStyle, borderColor: 'var(--danger)', color: 'var(--danger)' }}
                  title={t('nav.signOut')}
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <NavLink to="/login" style={navLinkStyle} title={t('nav.staffLogin')}>
                <LogIn size={16} /> {t('nav.staffLogin')}
              </NavLink>
            )}
          </nav>
        )}
      </div>
      <div className="tricolour-bar" />

      {/* Mobile dropdown menu */}
      {isMobile && menuOpen && (
        <>
          {/* Tap-away backdrop */}
          <div
            onClick={closeMenu}
            style={{ position: 'fixed', inset: 0, top: 62, zIndex: 480, background: 'rgba(0,0,0,0.35)' }}
          />
          <div
            className="glass-panel animate-fade-in"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 490,
              borderRadius: '0 0 16px 16px',
              borderTop: 'none',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              maxHeight: 'calc(100vh - 70px)',
              overflowY: 'auto',
            }}
          >
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} onClick={closeMenu} style={mobileRowStyle}>
                <item.icon size={18} /> {item.label}
              </NavLink>
            ))}

            <div style={{ height: 1, background: 'var(--border-card)', margin: '6px 0' }} />

            {/* Language */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px' }}>
              <LanguageSwitcher fullWidth />
            </div>

            {/* Theme */}
            <button
              onClick={toggleTheme}
              style={{ ...mobileRowStyle({ isActive: false }), background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              {theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
            </button>

            <div style={{ height: 1, background: 'var(--border-card)', margin: '6px 0' }} />

            {/* Account */}
            {token && user ? (
              <>
                <div style={{ padding: '6px 14px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {user.full_name || user.email}
                  </div>
                  <span className="chip" style={{ fontSize: '10px', padding: '1px 8px' }}>
                    {user.role === 'pmo' ? t('role.pmo') : t('role.mp')}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  style={{ ...mobileRowStyle({ isActive: false }), color: 'var(--danger)', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                >
                  <LogOut size={18} /> {t('nav.signOut')}
                </button>
              </>
            ) : (
              <NavLink to="/login" onClick={closeMenu} style={mobileRowStyle}>
                <LogIn size={18} /> {t('nav.staffLogin')}
              </NavLink>
            )}
          </div>
        </>
      )}
    </header>
  );
};

export default TopBar;
