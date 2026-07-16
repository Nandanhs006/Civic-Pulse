import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Phone, X, Loader2, KeyRound } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { getFirebaseAuth, isFirebaseConfigured, toE164 } from '../../services/firebase';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  reason?: string;
}

// Demo code accepted only when Firebase isn't configured (no real SMS).
const DEMO_CODE = '123456';

const PhoneAuthModal: React.FC<Props> = ({ open, onClose, onSuccess, title, reason }) => {
  const { login } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Firebase confirmationResult (real mode) is stored across steps.
  const confirmRef = useRef<any>(null);
  const verifierRef = useRef<any>(null);

  useEffect(() => {
    if (!open) {
      setStep('phone'); setCode(''); setError(null); setBusy(false);
      confirmRef.current = null;
    }
  }, [open]);

  // Clean up the invisible reCAPTCHA when the modal unmounts/closes.
  useEffect(() => () => { try { verifierRef.current?.clear?.(); } catch { /* noop */ } }, []);

  if (!open) return null;

  const sendOtp = async () => {
    setError(null);
    const e164 = toE164(phone);
    if (!/^\+\d{8,15}$/.test(e164)) { setError('Enter a valid mobile number.'); return; }
    setBusy(true);
    try {
      const auth = getFirebaseAuth();
      if (auth && isFirebaseConfigured) {
        const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');
        if (!verifierRef.current) {
          verifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
        }
        confirmRef.current = await signInWithPhoneNumber(auth, e164, verifierRef.current);
      }
      // mock mode: no real SMS; the user enters DEMO_CODE on the next step.
      setStep('otp');
    } catch (e: any) {
      setError(e?.message || 'Could not send OTP. Please try again.');
      try { verifierRef.current?.clear?.(); } catch { /* noop */ }
      verifierRef.current = null;
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    setError(null);
    if (!/^\d{4,8}$/.test(code)) { setError('Enter the 6-digit code.'); return; }
    setBusy(true);
    try {
      let idToken: string;
      if (confirmRef.current) {
        const cred = await confirmRef.current.confirm(code);
        idToken = await cred.user.getIdToken();
      } else {
        // demo/mock mode
        if (code !== DEMO_CODE) { setError(`Demo code is ${DEMO_CODE}.`); setBusy(false); return; }
        idToken = `mock:${toE164(phone)}`;
      }
      const res = await apiClient.post('/api/v1/auth/phone/login', {
        id_token: idToken,
        full_name: name.trim() || undefined,
      });
      await login(res.data.access_token);
      onSuccess?.();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Verification failed. Retry.');
    } finally {
      setBusy(false);
    }
  };

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 4000,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div
        className="glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 400, maxWidth: '100%', padding: 24, position: 'relative' }}
      >
        <button onClick={onClose} aria-label="Close"
          style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={20} color="var(--success)" />
          </div>
          <h3 style={{ margin: 0, fontSize: 18 }}>{title || 'Verify your mobile'}</h3>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
          {reason || 'A one-time code confirms you are a real citizen. Your reports then carry a “Verified” badge so your MP can act on them.'}
        </p>

        {step === 'phone' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>NAME (OPTIONAL)</label>
              <input className="glass-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>MOBILE NUMBER</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone size={16} color="var(--text-muted)" />
                <input className="glass-input" style={{ flex: 1 }} type="tel" inputMode="numeric"
                  value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              </div>
            </div>
            {error && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</span>}
            <button className="btn-primary" disabled={busy} onClick={sendOtp}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {busy ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : 'Send OTP'}
            </button>
            {!isFirebaseConfigured && (
              <span style={{ fontSize: 11, color: 'var(--warning)', textAlign: 'center' }}>
                Demo mode (no SMS) — use code {DEMO_CODE} on the next step.
              </span>
            )}
          </div>
        )}

        {step === 'otp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Enter the code sent to <strong style={{ color: 'var(--text-main)' }}>{toE164(phone)}</strong>.
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <KeyRound size={16} color="var(--text-muted)" />
              <input className="glass-input" style={{ flex: 1, letterSpacing: 6, fontSize: 18, textAlign: 'center' }}
                type="tel" inputMode="numeric" maxLength={8} value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" autoFocus />
            </div>
            {error && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</span>}
            <button className="btn-primary" disabled={busy} onClick={verifyOtp}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {busy ? <><Loader2 size={16} className="animate-spin" /> Verifying…</> : 'Verify & Continue'}
            </button>
            <button onClick={() => { setStep('phone'); setError(null); }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>
              ← Change number
            </button>
          </div>
        )}

        {/* Invisible reCAPTCHA mount point (Firebase requirement for web phone auth) */}
        <div id="recaptcha-container" />
      </div>
    </div>
  );
};

export default PhoneAuthModal;
