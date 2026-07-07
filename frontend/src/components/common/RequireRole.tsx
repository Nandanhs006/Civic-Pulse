import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';
import { Role } from '../../types';

interface RequireRoleProps {
  role?: Role; // if omitted, any authenticated staff user is allowed
  children: React.ReactNode;
}

/** Route guard: redirects unauthenticated users to /login and enforces role. */
const RequireRole: React.FC<RequireRoleProps> = ({ role, children }) => {
  const { token, user, loading } = useAuth();
  const { t } = useLang();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
        }}
      >
        {t('auth.verifying')}
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    // Send users to their own home rather than showing a forbidden screen.
    return <Navigate to={user.role === 'pmo' ? '/pmo' : '/mp'} replace />;
  }

  return <>{children}</>;
};

export default RequireRole;
