import React, { useState } from 'react';
import Sidebar from './components/layouts/Sidebar';
import Portal from './pages/Portal';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import { useAuth } from './context/AuthContext';

import './styles/index.css';
import './styles/animations.css';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('portal');
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-app)',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px'
      }}>
        Initializing Civic Pulse System...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', background: 'var(--bg-app)', minHeight: '100vh' }}>
      {/* Sidebar Layout */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Content Area */}
      <main style={{
        marginLeft: '320px', // matches sidebar width (280) + padding offsets (40)
        flex: 1,
        padding: '40px 20px',
        minHeight: '100vh'
      }}>
        {currentTab === 'portal' && <Portal />}
        {currentTab === 'dashboard' && (
          token ? <Dashboard /> : <Login />
        )}
      </main>
    </div>
  );
};

export default App;
