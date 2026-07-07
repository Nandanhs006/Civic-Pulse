import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import apiClient from '../services/apiClient';
import { Lock, Mail, Loader2, Landmark } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, user, token } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  // Redirect to the appropriate home once authenticated.
  useEffect(() => {
    if (token && user) {
      navigate(user.role === 'pmo' ? '/pmo' : '/mp', { replace: true });
    }
  }, [token, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    try {
      const response = await apiClient.post<{ access_token: string }>(
        '/api/v1/auth/login',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      await login(response.data.access_token);
      // Redirect handled by the effect above once user profile loads.
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || t('login.invalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ minHeight: '72vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      className="animate-fade-in"
    >
      <div className="glass-panel" style={{ maxWidth: '440px', width: '100%', overflow: 'hidden' }}>
        <div className="tricolour-bar" />
        <div style={{ padding: '40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <Landmark size={44} color="var(--saffron)" style={{ marginBottom: '14px' }} />
            <h2 style={{ fontSize: '26px', color: 'var(--text-main)' }}>{t('login.title')}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
              {t('login.subtitle')}
            </p>
          </div>

          {error && (
            <div
              style={{
                background: 'hsla(4, 78%, 56%, 0.14)',
                border: '1px solid var(--danger)',
                color: 'var(--text-main)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '14px',
                marginBottom: '20px',
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{t('login.email')}</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px' }} />
                <input
                  type="email"
                  placeholder="pmo@civicpulse.gov"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input"
                  style={{ paddingLeft: '48px', width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{t('login.password')}</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px' }} />
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input"
                  style={{ paddingLeft: '48px', width: '100%' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t('login.signingIn')}
                </>
              ) : (
                t('login.signIn')
              )}
            </button>
          </form>

          <div
            style={{
              marginTop: '24px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              background: 'var(--input-bg)',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid var(--border-card)',
              lineHeight: 1.7,
            }}
          >
            <strong>{t('login.demoAccounts')}</strong>
            <div>PMO (national): <code>pmo@civicpulse.gov</code> / <code>pmo@india</code></div>
            <div>Any MP: <code>mp.&lt;constituency&gt;@civicpulse.gov</code> / <code>mp@123</code></div>
            <div style={{ opacity: 0.8 }}>e.g. <code>mp.wayanad@civicpulse.gov</code>, <code>mp.varanasi@civicpulse.gov</code></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
