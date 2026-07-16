import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert, Phone, X, Bell, BellRing, MapPin, Loader2, Users, Navigation, Eye, CheckCircle2, MessageCircle, Send, Camera, ShieldCheck } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { MP } from '../../types';
import { useLang } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import PhoneAuthModal from './PhoneAuthModal';

interface SafetyMessage { id: number; responder_id: string; is_owner: boolean; text: string; }

/**
 * Live SOS chat thread for one incident. Polls so both the person in distress
 * (owner) and responders see new messages. Only VERIFIED citizens may respond —
 * the owner can always chat (it's their own SOS).
 */
const IncidentChat: React.FC<{
  incidentId: number;
  isOwner: boolean;
  responderId: string;
  verified: boolean;
  onVerify: () => void;
}> = ({ incidentId, isOwner, responderId, verified, onVerify }) => {
  const { t } = useLang();
  const [messages, setMessages] = useState<SafetyMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const canSend = isOwner || verified; // responders must be verified to help

  useEffect(() => {
    let stopped = false;
    const load = () =>
      apiClient
        .get<SafetyMessage[]>(`/api/v1/safety/incidents/${incidentId}/messages`)
        .then((r) => { if (!stopped) setMessages(r.data); })
        .catch(() => {});
    load();
    const timer = window.setInterval(load, 4000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [incidentId]);

  const send = () => {
    const text = replyText.trim();
    if (!text || !canSend) return;
    setReplyText('');
    apiClient
      .post<SafetyMessage>(`/api/v1/safety/incidents/${incidentId}/messages`, {
        responder_id: responderId, text, is_owner: isOwner,
      })
      .then((r) => setMessages((m) => [...m, r.data]))
      .catch((e) => console.error('message failed', e));
  };

  return (
    <div style={{ borderTop: '1px solid var(--border-subtle, rgba(128,128,128,.15))', paddingTop: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <MessageCircle size={14} /> {t('sos.thread')} ({messages.length})
      </div>
      <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
        {messages.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t(isOwner ? 'sos.threadEmptyOwner' : 'sos.threadEmpty')}</div>}
        {messages.map((m) => (
          <div key={m.id} style={{ fontSize: 12.5, padding: '6px 9px', borderRadius: 8, background: m.is_owner ? 'rgba(220,38,38,0.08)' : 'var(--bg-subtle, rgba(37,99,235,.06))' }}>
            <b style={{ fontSize: 10.5, color: m.is_owner ? '#dc2626' : 'var(--secondary)' }}>{m.is_owner ? t('sos.person') : t('sos.responder')}</b>
            <div>{m.text}</div>
          </div>
        ))}
      </div>
      {canSend ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            placeholder={t('sos.replyPlaceholder')}
            className="glass-input"
            style={{ flex: 1, minWidth: 0, padding: '9px 11px', fontSize: 13 }}
          />
          <button onClick={send} style={{ padding: '9px 12px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }}>
            <Send size={16} />
          </button>
        </div>
      ) : (
        <button onClick={onVerify} className="btn-secondary"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px', fontSize: 12.5 }}>
          <ShieldCheck size={15} /> {t('sos.verifyToRespond')}
        </button>
      )}
    </div>
  );
};

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
const RESPONDER_KEY = 'sos_responder_id';
const INCIDENT_KEY = 'sos_active_incident';
const POLL_MS = 30000;
const STATUS_POLL_MS = 12000;

interface NearbyAlert {
  id: number;
  distance_km: number;
  minutes_ago: number;
  constituency: string | null;
  latitude: number;
  longitude: number;
  precise: boolean;
  aware_count: number;
  responding_count: number;
  photo_url: string | null;
  note: string | null;
  credibility_score: number | null;
  credibility_level: string | null;
  credibility_note: string | null;
  message_count: number;
}

interface SafetyMessage { id: number; responder_id: string; is_owner: boolean; text: string; }
interface MyIncident { id: number; token: string; share: boolean; }

const CRED_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  corroborated: { bg: '#dcfce7', fg: '#15803d', label: 'Corroborated' },
  'some-signals': { bg: '#fef9c3', fg: '#a16207', label: 'Some signals' },
  unverified: { bg: '#f1f5f9', fg: '#475569', label: 'Unverified' },
};

/** Advisory AI credibility chip — NEVER implies an alert is fake. */
const CredibilityBadge: React.FC<{ level: string | null; score: number | null; note?: string | null }> = ({ level, score, note }) => {
  if (!level) return null;
  const s = CRED_STYLE[level] || CRED_STYLE.unverified;
  return (
    <span title={note || ''} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: s.bg, color: s.fg, borderRadius: 999, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>
      🛡 {s.label}{score != null ? ` · ${score}` : ''}
    </span>
  );
};

/** Stable anonymous responder id (localStorage) — never a name/phone. */
function getResponderId(): string {
  let id = localStorage.getItem(RESPONDER_KEY);
  if (!id) {
    id = 'r_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(RESPONDER_KEY, id);
  }
  return id;
}

const dirUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

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

const SosButton: React.FC = () => {
  const { t } = useLang();
  const { user } = useAuth();
  const verified = !!user?.phone_verified;
  const [showPhoneAuth, setShowPhoneAuth] = useState(false);
  const [open, setOpen] = useState(false);
  const [optIn, setOptIn] = useState<boolean>(() => localStorage.getItem(OPTIN_KEY) === '1');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [mp, setMp] = useState<MP | null>(null);
  const [flagged, setFlagged] = useState(false);
  const [logged, setLogged] = useState(true);
  const [share, setShare] = useState(false);
  // Incoming nearby alert (for the responder toast + card) and the one being responded to.
  const [toastAlert, setToastAlert] = useState<NearbyAlert | null>(null);
  const [respondTo, setRespondTo] = useState<NearbyAlert | null>(null);
  // The user's OWN active SOS + its live status (the victim loop).
  const [myIncident, setMyIncident] = useState<MyIncident | null>(null);
  const [myStatus, setMyStatus] = useState<{ status: string; aware_count: number; responding_count: number } | null>(null);
  // null = unknown (location not yet resolved / denied), true/false = in/out of Bengaluru.
  const [userInBlr, setUserInBlr] = useState<boolean | null>(null);
  // The community feed (all active nearby alerts) + photo-upload state.
  const [feed, setFeed] = useState<NearbyAlert[]>([]);
  const [uploading, setUploading] = useState(false);
  const [myPhoto, setMyPhoto] = useState<string | null>(null);
  const seen = useRef<Set<number>>(new Set());
  const responderId = useRef<string>(getResponderId());

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

  // Restore an in-progress SOS so it survives closing the modal / a refresh.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(INCIDENT_KEY);
      if (raw) {
        const inc = JSON.parse(raw);
        if (inc?.id && inc?.token) {
          seen.current.add(inc.id); // never toast/respond to our own SOS
          setMyIncident(inc);
          setMyStatus({ status: 'active', aware_count: 0, responding_count: 0 });
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

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
                // ...plus an always-visible, actionable in-app toast.
                setToastAlert(a);
                window.setTimeout(() => setToastAlert((cur) => (cur && cur.id === a.id ? null : cur)), 15000);
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

  // When the panel opens, grab location — but KEEP an active SOS visible instead
  // of resetting to a fresh slider (broadcast requires an explicit slide anyway).
  useEffect(() => {
    if (!open) return;
    // A previously-resolved SOS is cleared so a new one can be raised.
    if (myIncident && myStatus?.status === 'resolved') {
      setMyIncident(null);
      setMyStatus(null);
      localStorage.removeItem(INCIDENT_KEY);
    } else if (myIncident) {
      // Still have an active SOS -> keep showing its loop, don't reset.
      setLocating(false);
      return;
    }
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
    // eslint-disable-next-line
  }, [open]);

  // Broadcast the anonymized SOS — only ever called from the slide-to-confirm.
  const broadcast = () => {
    setFlagging(true);
    apiClient
      .post<{ mp: MP | null; logged: boolean; incident_id: number | null; resolve_token: string | null; share_precise: boolean }>(
        '/api/v1/safety/sos',
        { latitude: coords?.lat ?? null, longitude: coords?.lng ?? null, share_precise: share }
      )
      .then((r) => {
        setMp(r.data.mp);
        setLogged(r.data.logged);
        setFlagged(true);
        if (r.data.logged && !optIn) setOptIn(true);
        if (r.data.logged && r.data.incident_id && r.data.resolve_token) {
          const inc = { id: r.data.incident_id, token: r.data.resolve_token, share: r.data.share_precise };
          seen.current.add(inc.id); // never toast/respond to our own SOS
          setMyIncident(inc);
          setMyStatus({ status: 'active', aware_count: 0, responding_count: 0 });
          localStorage.setItem(INCIDENT_KEY, JSON.stringify(inc));
        }
      })
      .catch((e) => console.error('SOS broadcast failed', e))
      .finally(() => setFlagging(false));
  };

  // Victim loop: poll my own incident's status (how many are aware / responding).
  useEffect(() => {
    if (!myIncident || myStatus?.status === 'resolved') return;
    const poll = () => {
      apiClient
        .get<{ status: string; aware_count: number; responding_count: number }>(`/api/v1/safety/incidents/${myIncident.id}/status`)
        .then((r) => setMyStatus(r.data))
        .catch(() => {});
    };
    poll();
    const timer = window.setInterval(poll, STATUS_POLL_MS);
    return () => window.clearInterval(timer);
  }, [myIncident, myStatus?.status]);

  const markSafe = () => {
    if (!myIncident) return;
    apiClient
      .post(`/api/v1/safety/incidents/${myIncident.id}/resolve`, { resolve_token: myIncident.token })
      .then(() => {
        setMyStatus((s) => (s ? { ...s, status: 'resolved' } : s));
        localStorage.removeItem(INCIDENT_KEY);
      })
      .catch((e) => console.error('resolve failed', e));
  };

  const toggleShare = () => {
    if (!myIncident) return;
    const next = !myIncident.share;
    apiClient
      .post(`/api/v1/safety/incidents/${myIncident.id}/share`, { resolve_token: myIncident.token, share_precise: next })
      .then(() => setMyIncident((m) => (m ? { ...m, share: next } : m)))
      .catch((e) => console.error('share toggle failed', e));
  };

  // Responder actions on a nearby alert.
  const ackAlert = (alert: NearbyAlert, responding: boolean) => {
    apiClient
      .post<{ aware_count: number; responding_count: number }>(`/api/v1/safety/incidents/${alert.id}/ack`, {
        responder_id: responderId.current, responding,
      })
      .then((r) => {
        const upd = { ...alert, aware_count: r.data.aware_count, responding_count: r.data.responding_count };
        setRespondTo(upd);
        setToastAlert((cur) => (cur && cur.id === alert.id ? upd : cur));
      })
      .catch((e) => console.error('ack failed', e));
  };

  // Victim attaches a photo to their SOS.
  const uploadPhoto = (file: File) => {
    if (!myIncident) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('resolve_token', myIncident.token);
    fd.append('file', file);
    apiClient
      .post(`/api/v1/safety/incidents/${myIncident.id}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => setMyPhoto((r.data as { photo_url: string }).photo_url))
      .catch((e) => console.error('photo upload failed', e))
      .finally(() => setUploading(false));
  };

  // Load the community feed (all active nearby alerts) when the panel opens.
  useEffect(() => {
    if (!open || !coords) return;
    apiClient
      .get<NearbyAlert[]>('/api/v1/safety/nearby-alerts', { params: { lat: coords.lat, lng: coords.lng, radius_km: 8, minutes: 120 } })
      .then((r) => setFeed(r.data))
      .catch(() => setFeed([]));
  }, [open, coords]);

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
            position: 'fixed', right: 86, bottom: 30, zIndex: 3500, maxWidth: 180,
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
            {!myIncident && !flagged ? (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
                  {t('sos.sharePrecise')}
                </label>
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

            {/* Victim loop: live 'N aware / responding' + share + I'm safe */}
            {myIncident && myStatus && (
              myStatus.status === 'resolved' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px', borderRadius: 10, background: 'rgba(22,163,74,0.1)', color: '#16a34a', fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
                  <CheckCircle2 size={18} /> {t('sos.markedSafe')}
                </div>
              ) : (
                <div style={{ padding: '12px', borderRadius: 10, background: 'var(--bg-subtle, rgba(220,38,38,.06))', border: '1px solid rgba(220,38,38,0.2)', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                    <Eye size={16} color="#dc2626" />
                    <b style={{ color: '#dc2626' }}>{myStatus.aware_count}</b> {t('sos.aware')}
                    {myStatus.responding_count > 0 && <>· <b style={{ color: '#dc2626' }}>{myStatus.responding_count}</b> {t('sos.responding')}</>}
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={myIncident.share} onChange={toggleShare} />
                    {t('sos.sharePrecise')}
                  </label>
                  {/* Attach a photo so responders/MP can see the situation */}
                  {myPhoto ? (
                    <img src={myPhoto} alt="attached" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 8 }} />
                  ) : (
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px', borderRadius: 8, border: '1px dashed var(--border-card, #ccc)', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--text-main)' }}>
                      {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />} {t('sos.addPhoto')}
                      <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />
                    </label>
                  )}
                  <button onClick={markSafe} style={{ padding: '10px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <CheckCircle2 size={17} /> {t('sos.imSafe')}
                  </button>
                  {/* The person in distress sees & replies to responder messages here */}
                  <IncidentChat
                    incidentId={myIncident.id}
                    isOwner
                    responderId={responderId.current}
                    verified={verified}
                    onVerify={() => setShowPhoneAuth(true)}
                  />
                </div>
              )
            )}

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

            {/* Community feed: active SOS alerts nearby (broadcast to everyone) */}
            {feed.filter((a) => a.id !== myIncident?.id).length > 0 && (
              <div style={{ marginTop: 14, borderTop: '1px solid var(--border-subtle, rgba(128,128,128,.15))', paddingTop: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t('sos.feedTitle')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {feed.filter((a) => a.id !== myIncident?.id).map((a) => (
                    <button key={a.id} onClick={() => { setRespondTo(a); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10, border: '1px solid var(--border-card, rgba(128,128,128,.2))', background: 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                      {a.photo_url
                        ? <img src={a.photo_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                        : <span style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ShieldAlert size={18} color="#dc2626" /></span>}
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
                          {a.constituency || t('sos.nearbyYourArea')}
                          <CredibilityBadge level={a.credibility_level} score={a.credibility_score} note={a.credibility_note} />
                        </span>
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)' }}>
                          {a.distance_km < 1 ? `${Math.round(a.distance_km * 1000)} m` : `${a.distance_km} km`} · {a.aware_count} {t('sos.aware')} · 💬 {a.message_count}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 14, lineHeight: 1.4 }}>
              {t('sos.disclaimer')}
            </div>
          </div>
        </div>
      )}

      {/* In-app nearby-alert toast — actionable (opens the responder card) */}
      {toastAlert && toastAlert.id !== myIncident?.id && !respondTo && (
        <div
          className="glass-panel animate-fade-in"
          style={{
            position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 5000,
            maxWidth: 'min(94vw, 440px)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
            borderLeft: '4px solid #dc2626',
          }}
        >
          <BellRing size={20} color="#dc2626" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{t('sos.nearbyTitle')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {t('sos.nearbyBody', {
                dist: toastAlert.distance_km < 1 ? `${Math.round(toastAlert.distance_km * 1000)} m` : `${toastAlert.distance_km} km`,
                area: toastAlert.constituency || t('sos.nearbyYourArea'),
              })}
            </div>
          </div>
          <button onClick={() => { setRespondTo(toastAlert); setToastAlert(null); }} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {t('sos.respond')}
          </button>
          <button onClick={() => setToastAlert(null)} aria-label={t('sos.close')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>
      )}

      {/* Responder card — what a notified nearby user can DO */}
      {respondTo && (
        <div style={overlay} onClick={() => setRespondTo(null)}>
          <div className="glass-panel" onClick={(e) => e.stopPropagation()} style={{ width: 380, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto', padding: 20, borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BellRing size={22} color="#dc2626" />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{t('sos.nearbyTitle')}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {respondTo.constituency || t('sos.nearbyYourArea')} · {respondTo.distance_km < 1 ? `${Math.round(respondTo.distance_km * 1000)} m` : `${respondTo.distance_km} km`} · {respondTo.minutes_ago}m {t('sos.ago')}
                  </div>
                </div>
              </div>
              <button onClick={() => setRespondTo(null)} aria-label={t('sos.close')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            {/* Advisory AI credibility */}
            {respondTo.credibility_level && (
              <div style={{ marginBottom: 10 }}>
                <CredibilityBadge level={respondTo.credibility_level} score={respondTo.credibility_score} note={respondTo.credibility_note} />
                {respondTo.credibility_note && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                    {respondTo.credibility_note} <i>{t('sos.credAdvisory')}</i>
                  </div>
                )}
              </div>
            )}

            {/* Photo + note from the person */}
            {respondTo.photo_url && (
              <img src={respondTo.photo_url} alt="SOS" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, marginBottom: 8 }} />
            )}
            {respondTo.note && (
              <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text-main)', marginBottom: 10 }}>"{respondTo.note}"</div>
            )}

            <div style={{ fontSize: 12.5, color: 'var(--text-main)', marginBottom: 12 }}>
              <Eye size={14} style={{ verticalAlign: -2 }} /> <b>{respondTo.aware_count}</b> {t('sos.aware')}
              {respondTo.responding_count > 0 && <> · <b>{respondTo.responding_count}</b> {t('sos.responding')}</>}
            </div>

            {/* Call 112 */}
            <a href="tel:112" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#dc2626', color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: 16, padding: '12px', borderRadius: 12, marginBottom: 10 }}>
              <Phone size={20} /> {t('sos.callPolice')}
            </a>

            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button onClick={() => ackAlert(respondTo, false)} className="glass-input" style={{ flex: 1, padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <Eye size={16} /> {t('sos.imAware')}
              </button>
              <button onClick={() => ackAlert(respondTo, true)} style={{ flex: 1, padding: '11px', borderRadius: 8, border: 'none', background: '#ea580c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <ShieldAlert size={16} /> {t('sos.imResponding')}
              </button>
            </div>

            <a href={dirUrl(respondTo.latitude, respondTo.longitude)} target="_blank" rel="noreferrer" className="glass-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px', fontSize: 13, fontWeight: 700, textDecoration: 'none', color: 'var(--text-main)' }}>
              <Navigation size={16} /> {respondTo.precise ? t('sos.navigatePrecise') : t('sos.navigateApprox')}
            </a>

            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', margin: '12px 0', lineHeight: 1.4 }}>
              {t('sos.responderCaveat')}
            </div>

            {/* Response thread — responders must be verified to help */}
            <IncidentChat
              incidentId={respondTo.id}
              isOwner={myIncident?.id === respondTo.id}
              responderId={responderId.current}
              verified={verified}
              onVerify={() => setShowPhoneAuth(true)}
            />
          </div>
        </div>
      )}

      <PhoneAuthModal
        open={showPhoneAuth}
        onClose={() => setShowPhoneAuth(false)}
        title={t('sos.verifyToRespond')}
        reason={t('sos.verifyReason')}
      />
    </>
  );
};

export default SosButton;
