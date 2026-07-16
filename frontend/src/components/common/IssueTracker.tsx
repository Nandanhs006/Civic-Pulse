import React, { useState } from 'react';
import { Search, X, FileSearch, ArrowLeft } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import IssueTimeline from './IssueTimeline';

/**
 * Floating "Track your report" button (sits above the SOS button). Opens a
 * popup that takes a tracking ID and shows the issue's live timeline.
 */
const IssueTracker: React.FC = () => {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [tracking, setTracking] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim();
    if (c) setTracking(c);
  };

  const close = () => { setOpen(false); setTracking(null); };

  return (
    <>
      {/* Floating trigger — above the SOS button */}
      <button
        onClick={() => setOpen(true)}
        aria-label={t('track.title')}
        title={t('track.title')}
        style={{
          position: 'fixed', right: 22, bottom: 92, zIndex: 3500,
          width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'var(--saffron, #FF9933)', color: '#fff', boxShadow: '0 6px 18px rgba(255,153,51,0.5)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
          fontWeight: 800, fontSize: 9, letterSpacing: '0.04em',
        }}
      >
        <FileSearch size={19} />
        TRACK
      </button>

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={close}
        >
          <div className="glass-panel" onClick={(e) => e.stopPropagation()} style={{ width: 400, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 22, borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {tracking && (
                  <button onClick={() => setTracking(null)} aria-label="back" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <ArrowLeft size={18} />
                  </button>
                )}
                <FileSearch size={20} color="var(--saffron, #FF9933)" />
                <div style={{ fontWeight: 800, fontSize: 16 }}>{tracking ? t('track.heading') : t('track.title')}</div>
              </div>
              <button onClick={close} aria-label={t('track.copy')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            {tracking ? (
              <IssueTimeline issueId={tracking} />
            ) : (
              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('track.subtitle')}</div>
                <input
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder={t('track.placeholder')}
                  className="glass-input"
                  style={{ padding: '12px 14px', fontSize: 15, letterSpacing: '0.04em', textAlign: 'center', fontWeight: 700 }}
                />
                <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px', fontSize: 15, fontWeight: 700 }}>
                  <Search size={17} /> {t('track.button')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default IssueTracker;
