import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert, Phone, X, Bell, BellRing, MapPin, Loader2, Users } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { MP } from '../../types';
import { useLang } from '../../context/LanguageContext';

/**
 * Women-safety SOS — "amplify + inform" with community broadcast.
 *
 * It does NOT dispatch police. On SOS it (a) one-taps a call to 112 (India
 * ERSS), (b) broadcasts an anonymized alert that nearby opted-in CivicPulse
 * users receive as a notification, and (c) flags the area for the local MP.
 *
 * This component is mounted globally, so its background watcher polls for
 * nearby SOS pings even when the panel is closed (for users who opted in).
 */

const OPTIN_KEY = 'sos_nearby_optin';
const POLL_MS = 30000;

// The SOS feature is Bengaluru-only; disable the button outside the city.
const BLR_BBOX = { minLng: 77.30, minLat: 12.70, maxLng: 77.90, maxLat: 13.25 };
const inBengaluru = (lat: number, lng: number) =>
  lat >= BLR_BBOX.minLat && lat <= BLR_BBOX.maxLat && lng >= BLR_BBOX.minLng && lng <= BLR_BBOX.maxLng;

/** Slide-to-confirm control — the user must drag the knob to the end to fire. */
const SlideToConfirm: React.FC<{ onConfirm: () => void; label: string; busy: boolean }> = ({ onConfirm, label, busy }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0);
  const dragging = useRef(false);
  const KNOB = 46;

  const maxX = () => (trackRef.current ? trackRef.current.clientWidth - KNOB : 0);

  const move = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    setX(Math.max(0, Math.min(maxX(), clientX - rect.left - KNOB / 2)));
  };

  const end = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (x >= maxX() * 0.9) {
      setX(maxX());
      onConfirm();
    } else {
      setX(0);
    }
  };

  useEffect(() => {
    const mm = (e: PointerEvent) => dragging.current && move(e.clientX);
    const mu = () => end();
    window.addEventListener('pointermove', mm);
    window.addEventListener('pointerup', mu);
    return () => {
      window.removeEventListener('pointermove', mm);
      window.removeEventListener('pointerup', mu);
    };
    // eslint-disable-next-line
  }, [x]);

  const pct = maxX() ? x / maxX() : 0;

  return (
    <div
      ref={trackRef}
      style={{
        position: 'relative', height: 54, borderRadius: 27, background: '#fee2e2',
        overflow: 'hidden', userSelect: 'none', touchAction: 'none',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#b91c1c', fontSize: 14, opacity: 1 - pct }}>
        {label}
      </div>
      <div
        onPointerDown={(e) => { if (!busy) { dragging.current = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); } }}
        style={{
          position: 'absolute', top: 4, left: 4, width: KNOB, height: KNOB, borderRadius: '50%',
          background: '#dc2626', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: busy ? 'default' : 'grab', transform: `translateX(${x}px)`,
          transition: dragging.current ? 'none' : 'transform .2s', boxShadow: '0 2px 6px rgba(0,0,0,.3)',
        }}
      >
        {busy ? <Loader2 size={20} className="animate-spin" /> : <ShieldAlert size={20} />}
      </div>
    </div>
  );
};

interface NearbyAlert {
  id: number;
  distance_km: number;
  minutes_ago: number;
  constituency: string | null;
}

const SosButton: React.FC = () => {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [optIn, setOptIn] = useState<boolean>(() => localStorage.getItem(OPTIN_KEY) === '1');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [mp, setMp] = useState<MP | null>(null);
  const [flagged, setFlagged] = useState(false);
  const [logged, setLogged] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  // null = unknown (location not yet resolved / denied), true/false = in/out of Bengaluru.
  const [userInBlr, setUserInBlr] = useState<boolean | null>(null);
  const seen = useRef<Set<number>>(new Set());

  // Resolve the user's location once to gate the SOS button (Bengaluru-only).
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserInBlr(inBengaluru(latitude, longitude));
        setCoords({ lat: latitude, lng: longitude });
      },
      () => setUserInBlr(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    localStorage.setItem(OPTIN_KEY, optIn ? '1' : '0');
  }, [optIn]);

  // Background watcher: notify opted-in users about nearby SOS pings.
  useEffect(() => {
    if (!optIn || !navigator.geolocation) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    let primed = false;  // first poll seeds `seen` so we only toast NEW pings
    const poll = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          apiClient
            .get<NearbyAlert[]>('/api/v1/safety/nearby-alerts', {
              params: { lat: pos.coords.latitude, lng: pos.coords.longitude, radius_km: 3, minutes: 30 },
            })
            .then((r) => {
              r.data.forEach((a) => {
                if (seen.current.has(a.id)) return;
                seen.current.add(a.id);
                // On the first poll, suppress only STALE pings (>3 min) to avoid a
                // burst of old ones; recent pings still notify (and make testing easy).
                if (!primed && a.minutes_ago > 3) return;
                const body = t('sos.nearbyBody', {
                  dist: a.distance_km < 1 ? `${Math.round(a.distance_km * 1000)} m` : `${a.distance_km} km`,
                  area: a.constituency || t('sos.nearbyYourArea'),
                });
                // OS notification (works while the tab is open + permission granted)...
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification(t('sos.nearbyTitle'), { body });
                }
                // ...plus an always-visible in-app toast.
                setToast(body);
                window.setTimeout(() => setToast(null), 8000);
              });
              primed = true;
            })
            .catch(() => {});
        },
        () => {},
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      );
    };
    poll();
    const timer = window.setInterval(poll, POLL_MS);
    return () => window.clearInterval(timer);
  }, [optIn, t]);

  // When the panel opens, grab location ONLY (do not broadcast — that requires
  // an explicit slide-to-confirm, to avoid accidental / false-positive alerts).
  useEffect(() => {
    if (!open) return;
    setFlagged(false);
    setMp(null);
    setLogged(true);
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [open]);

  // Broadcast the anonymized SOS — only ever called from the slide-to-confirm.
  const broadcast = () => {
    setFlagging(true);
    apiClient
      .post<{ mp: MP | null; logged: boolean }>('/api/v1/safety/sos', {
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      })
      .then((r) => {
        setMp(r.data.mp);
        setLogged(r.data.logged);
        setFlagged(true);
        if (r.data.logged && !optIn) setOptIn(true);
      })
      .catch((e) => console.error('SOS broadcast failed', e))
      .finally(() => setFlagging(false));
  };

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 4000,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  };

  // Disable only when we've CONFIRMED the user is outside Bengaluru.
  const sosDisabled = userInBlr === false;

  return (
    <>
      <button
        onClick={() => !sosDisabled && setOpen(true)}
        disabled={sosDisabled}
        aria-label={t('sos.button')}
        title={sosDisabled ? t('sos.blrOnly') : t('sos.button')}
        style={{
          position: 'fixed', right: 18, bottom: 22, zIndex: 3500,
          width: 60, height: 60, borderRadius: '50%', border: 'none',
          cursor: sosDisabled ? 'not-allowed' : 'pointer',
          background: sosDisabled ? '#9ca3af' : '#dc2626', color: '#fff',
          boxShadow: sosDisabled ? '0 4px 12px rgba(0,0,0,0.25)' : '0 6px 20px rgba(220,38,38,0.5)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 11, letterSpacing: '0.04em', gap: 1,
          opacity: sosDisabled ? 0.8 : 1,
        }}
      >
        <ShieldAlert size={20} />
        SOS
      </button>
      {sosDisabled && (
        <div
          style={{
            position: 'fixed', right: 18, bottom: 86, zIndex: 3500, maxWidth: 180,
            background: 'rgba(17,24,39,0.9)', color: '#fff', fontSize: 11, lineHeight: 1.35,
            padding: '7px 10px', borderRadius: 8, textAlign: 'right', pointerEvents: 'none',
          }}
        >
          {t('sos.blrOnly')}
        </div>
      )}

      {open && (
        <div style={overlay} onClick={() => setOpen(false)}>
          <div
            className="glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 380, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 20, borderRadius: 16 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={22} color="#dc2626" />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 17 }}>{t('sos.title')}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('sos.subtitle')}</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} aria-label={t('sos.close')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {/* Primary action: call the police / 112 */}
            <a
              href="tel:112"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                background: '#dc2626', color: '#fff', textDecoration: 'none', fontWeight: 800,
                fontSize: 18, padding: '14px', borderRadius: 12, margin: '12px 0',
              }}
            >
              <Phone size={22} /> {t('sos.callPolice')}
            </a>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 14 }}>
              {t('sos.call112hint')}
            </div>

            {/* Secondary action: slide to broadcast the anonymized alert */}
            {!flagged ? (
              <>
                <SlideToConfirm onConfirm={broadcast} label={t('sos.slideToAlert')} busy={flagging} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', margin: '8px 0 6px' }}>
                  {t('sos.slideHint')}
                </div>
              </>
            ) : null}

            {/* Status: location, broadcast, MP flag */}
            <div style={{ margin: '4px 0 14px', fontSize: 13, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} />
                {locating ? t('sos.locating') : coords ? t('sos.located') : t('sos.noLocation')}
              </span>
              {flagging ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Loader2 size={13} className="animate-spin" /> {t('sos.broadcasting')}
                </span>
              ) : flagged && !logged ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--warning, #d97706)' }}>
                  <Users size={14} /> {t('sos.outOfArea')}
                </span>
              ) : flagged ? (
                <>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={14} /> {t('sos.broadcasted')}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldAlert size={14} />
                    {mp ? t('sos.flagged', { mp: mp.name }) : t('sos.flaggedNoMp')}
                  </span>
                </>
              ) : null}
            </div>

            {/* Nearby-alerts opt-in */}
            <button
              onClick={() => setOptIn((v) => !v)}
              className="glass-input"
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px',
                fontSize: 13, cursor: 'pointer', textAlign: 'left',
                color: optIn ? '#dc2626' : 'var(--text-main)',
              }}
            >
              {optIn ? <BellRing size={18} /> : <Bell size={18} />}
              <span style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{t('sos.nearbyOptIn')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {optIn ? t('sos.nearbyOn') : t('sos.nearbyOff')}
                </div>
              </span>
              <span style={{
                width: 38, height: 22, borderRadius: 11, background: optIn ? '#dc2626' : 'var(--border-subtle, #ccc)',
                position: 'relative', flexShrink: 0, transition: 'background .2s',
              }}>
                <span style={{
                  position: 'absolute', top: 2, left: optIn ? 18 : 2, width: 18, height: 18,
                  borderRadius: '50%', background: '#fff', transition: 'left .2s',
                }} />
              </span>
            </button>

            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 14, lineHeight: 1.4 }}>
              {t('sos.disclaimer')}
            </div>
          </div>
        </div>
      )}

      {/* In-app nearby-alert toast (works regardless of OS notification permission) */}
      {toast && (
        <div
          className="glass-panel animate-fade-in"
          onClick={() => setToast(null)}
          style={{
            position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 5000,
            maxWidth: 'min(92vw, 420px)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
            borderLeft: '4px solid #dc2626', cursor: 'pointer',
          }}
        >
          <BellRing size={18} color="#dc2626" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{t('sos.nearbyTitle')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{toast}</div>
          </div>
        </div>
      )}
    </>
  );
};

export default SosButton;
