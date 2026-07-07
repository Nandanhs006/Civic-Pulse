import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TopBar from './components/layouts/TopBar';
import Portal from './pages/Portal';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pmo from './pages/Pmo';
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
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
