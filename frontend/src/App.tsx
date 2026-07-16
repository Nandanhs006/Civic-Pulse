import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TopBar from './components/layouts/TopBar';
import Portal from './pages/Portal';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pmo from './pages/Pmo';
import PmoAnalytics from './pages/PmoAnalytics';
import PmoLeaderboard from './pages/PmoLeaderboard';
import LiveMap from './pages/LiveMap';
import Participate from './pages/Participate';
import RequireRole from './components/common/RequireRole';
import { useIsMobile } from './hooks/useIsMobile';

import './styles/index.css';
import './styles/animations.css';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isMobile = useIsMobile();
  return (
    <div style={{ background: 'var(--bg-app)', minHeight: '100vh' }}>
      <TopBar />
      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: isMobile ? '18px 14px 48px' : '28px 24px 64px' }}>
        {children}
      </main>
    </div>
  );
};

// Same app navbar, but the map fills the rest of the viewport full-bleed (no padded main).
const MapLayout: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-app)' }}>
    <TopBar />
    <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
      <LiveMap />
    </div>
  </div>
);

const App: React.FC = () => (
  <Routes>
    <Route path="/" element={<Layout><Portal /></Layout>} />
    <Route path="/login" element={<Layout><Login /></Layout>} />
    <Route
      path="/mp"
      element={
        <RequireRole role="mp">
          <Layout><Dashboard /></Layout>
        </RequireRole>
      }
    />
    <Route
      path="/pmo"
      element={
        <RequireRole role="pmo">
          <Layout><Pmo /></Layout>
        </RequireRole>
      }
    />
    <Route
      path="/pmo/analytics"
      element={
        <RequireRole role="pmo">
          <Layout><PmoAnalytics /></Layout>
        </RequireRole>
      }
    />
    <Route
      path="/pmo/leaderboard"
      element={
        <RequireRole role="pmo">
          <Layout><PmoLeaderboard /></Layout>
        </RequireRole>
      }
    />
    {/* Live map keeps the app navbar; the map fills the rest of the screen */}
    <Route path="/map" element={<MapLayout />} />
    <Route path="/participate" element={<Layout><Participate /></Layout>} />
    <Route path="/participate/streetmapper" element={<Layout><Participate activeApp="fixmystreet" /></Layout>} />
    <Route path="/participate/civicfund" element={<Layout><Participate activeApp="decidim" /></Layout>} />
    <Route path="/participate/aegis-ai" element={<Layout><Participate activeApp="cpgrams" /></Layout>} />
    <Route path="/participate/civictimeline" element={<Layout><Participate activeApp="seeclickfix" /></Layout>} />
    <Route path="/participate/hotspot-tracker" element={<Layout><Participate activeApp="ushahidi" /></Layout>} />
    <Route path="/participate/command-dispatch" element={<Layout><Participate activeApp="hotline" /></Layout>} />
    <Route path="/participate/citypulse-iot" element={<Layout><Participate activeApp="citybrain" /></Layout>} />
    <Route path="/participate/constituency-mailbox" element={<Layout><Participate activeApp="mailbox" /></Layout>} />
    <Route path="/participate/civic-integrate" element={<Layout><Participate activeApp="civic-integrate" /></Layout>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
