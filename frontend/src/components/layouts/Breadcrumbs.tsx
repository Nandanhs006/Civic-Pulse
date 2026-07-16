import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { useIsMobile } from '../../hooks/useIsMobile';

// Display names for the Participate sub-apps (route slug -> label).
const PARTICIPATE_APPS: Record<string, string> = {
  streetmapper: 'StreetMapper',
  civicfund: 'CivicFund',
  'aegis-ai': 'Aegis AI',
  civictimeline: 'Civic Timeline',
  'hotspot-tracker': 'Hotspot Tracker',
  'command-dispatch': 'Command & Dispatch',
  'sector-directory': 'Sector Directory',
  'citypulse-iot': 'CityPulse IoT',
  'constituency-mailbox': 'Constituency Mailbox',
};

interface Crumb {
  label: string;
  to?: string; // omitted for the current (last) page
}

/** Sticky breadcrumb trail so users always know where they are. */
const Breadcrumbs: React.FC = () => {
  const { t } = useLang();
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const segs = pathname.split('/').filter(Boolean);

  const crumbs: Crumb[] = [];
  const top = segs[0];
  if (!top) {
    crumbs.push({ label: t('nav.portal') });
  } else if (top === 'map') {
    crumbs.push({ label: t('nav.liveMap') });
  } else if (top === 'participate') {
    if (segs[1]) {
      crumbs.push({ label: t('nav.participate'), to: '/participate' });
      crumbs.push({ label: PARTICIPATE_APPS[segs[1]] || segs[1] });
    } else {
      crumbs.push({ label: t('nav.participate') });
    }
  } else if (top === 'pmo') {
    if (segs[1] === 'mp' && segs[2]) {
      crumbs.push({ label: t('nav.pmoCommand'), to: '/pmo' });
      crumbs.push({ label: t('crumb.constituency') });
    } else {
      crumbs.push({ label: t('nav.pmoCommand') });
    }
  } else if (top === 'mp') {
    crumbs.push({ label: t('nav.myConstituency') });
  } else if (top === 'login') {
    crumbs.push({ label: t('nav.staffLogin') });
  } else {
    crumbs.push({ label: segs[segs.length - 1] });
  }

  const linkStyle: React.CSSProperties = {
    color: 'var(--text-muted)',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    whiteSpace: 'nowrap',
    fontWeight: 500,
  };
  const currentStyle: React.CSSProperties = {
    color: 'var(--text-main)',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className="hide-scrollbar"
      style={{
        position: 'sticky',
        top: 'var(--topbar-h, 60px)',
        zIndex: 400,
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        padding: isMobile ? '9px 14px' : '10px 24px',
        fontSize: '13px',
        color: 'var(--text-muted)',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-card)',
        overflowX: 'auto',
      }}
    >
      <Link to="/" style={linkStyle} aria-label={t('nav.home')}>
        <Home size={14} />
        {!isMobile && t('nav.home')}
      </Link>
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <React.Fragment key={i}>
            <ChevronRight size={13} color="var(--text-muted)" style={{ flexShrink: 0, opacity: 0.7 }} />
            {c.to && !isLast ? (
              <Link to={c.to} style={linkStyle}>
                {c.label}
              </Link>
            ) : (
              <span style={currentStyle} aria-current="page">
                {c.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
