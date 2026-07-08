import React, { useState, useEffect, useMemo } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import apiClient from '../services/apiClient';
import { Mic, MicOff, Send, CheckCircle2, Image, MapPin, Loader2, UserCheck, Trash2 } from 'lucide-react';
import { Suggestion, Constituency, MP, Hierarchy } from '../types';
import ConstituencyPicker, { Autofill } from '../components/common/ConstituencyPicker';
import Avatar from '../components/common/Avatar';
import RoutingTree from '../components/common/RoutingTree';
import { useLang } from '../context/LanguageContext';
import { useIsMobile } from '../hooks/useIsMobile';

const Portal: React.FC = () => {
  const isMobile = useIsMobile();
  const [phone, setPhone] = useState('');
  const [content, setContent] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsReal, setGpsReal] = useState(false);
  const [autofill, setAutofill] = useState<Autofill | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [constituency, setConstituency] = useState<Constituency | null>(null);
  const [targetMp, setTargetMp] = useState<MP | null>(null);
  const [hierarchy, setHierarchy] = useState<Hierarchy | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<Suggestion | null>(null);
  const [sentToMp, setSentToMp] = useState<MP | null>(null);

  const { isRecording, audioBlob, duration, startRecording, stopRecording, deleteRecording } = useAudioRecorder();

  // Object URL for reviewing the captured clip; revoked when the blob changes.
  const audioUrl = useMemo(() => (audioBlob ? URL.createObjectURL(audioBlob) : null), [audioBlob]);
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);
  const { t } = useLang();

  // Tree follows the SELECTED constituency. The GPS-derived MLA/civic tiers are
  // only shown when they actually belong to the chosen parliamentary seat.
  const displayHierarchy: Hierarchy | null = useMemo(() => {
    if (!constituency) return null;
    const gpsMatches = hierarchy?.parliamentary?.constituency?.id === constituency.id;
    return {
      parliamentary: { constituency, mp: targetMp },
      assembly: gpsMatches ? hierarchy?.assembly ?? null : null,
      civic: gpsMatches ? hierarchy?.civic ?? null : null,
    };
  }, [constituency, targetMp, hierarchy]);

  // Capture GPS on mount (used as supporting metadata / map pin / auto-detect).
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
          setGpsReal(true);
        },
        () => setCoords({ lat: 22.9734, lng: 78.6569 }) // fallback: centre of India (not auto-detected)
      );
    }
  }, []);

  // Auto-detect constituency from real GPS: precise boundary lookup first,
  // then fall back to reverse-geocoded name matching if that misses.
  useEffect(() => {
    if (!coords || !gpsReal) return;
    setDetecting(true);

    const reverseGeocodeFallback = () =>
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}&accept-language=en`
      )
        .then((r) => r.json())
        .then((d) => {
          const a = d.address || {};
          const state: string = a.state || a.region || '';
          const hints = [
            a.state_district, a.county, a.district, a.city_district,
            a.city, a.town, a.municipality, a.suburb, a.village,
          ].filter(Boolean) as string[];
          if (state) setAutofill({ state, hints });
        })
        .catch(() => {});

    apiClient
      .get<Constituency>('/api/v1/constituencies/locate', {
        params: { lat: coords.lat, lng: coords.lng },
      })
      .then((r) => {
        const c = r.data;
        setAutofill({ state: c.state, constituencyId: c.id, hints: [] });
      })
      .catch(reverseGeocodeFallback)
      .finally(() => setDetecting(false));
  }, [coords, gpsReal]);

  // Resolve the full representative hierarchy (MP → MLA → local body) from GPS.
  useEffect(() => {
    if (!coords || !gpsReal) return;
    apiClient
      .get<Hierarchy>('/api/v1/hierarchy/locate', { params: { lat: coords.lat, lng: coords.lng } })
      .then((r) => setHierarchy(r.data))
      .catch(() => setHierarchy(null));
  }, [coords, gpsReal]);

  // Look up the concerned MP whenever a constituency is chosen.
  useEffect(() => {
    if (!constituency) {
      setTargetMp(null);
      return;
    }
    apiClient
      .get<MP>(`/api/v1/mps/${constituency.id}`)
      .then((r) => setTargetMp(r.data))
      .catch(() => setTargetMp(null));
  }, [constituency]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!constituency) {
      alert(t('portal.selectConstituencyAlert'));
      return;
    }
    if (!content && !audioBlob) {
      alert(t('portal.describeAlert'));
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('citizen_phone', phone);
    formData.append('content', content);
    formData.append('language_code', 'en');
    formData.append('constituency_id', String(constituency.id));
    if (coords) {
      formData.append('latitude', coords.lat.toString());
      formData.append('longitude', coords.lng.toString());
    }
    if (audioBlob) formData.append('audio', audioBlob, 'report_voice.wav');
    if (imageFile) formData.append('image', imageFile, imageFile.name);

    try {
      const response = await apiClient.post<Suggestion>('/api/v1/suggestions/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccessData(response.data);
      setSentToMp(targetMp);
      setPhone('');
      setContent('');
      setImageFile(null);
      setImagePreview(null);
      deleteRecording();
    } catch (err) {
      console.error(err);
      alert('Failed to submit suggestion. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const softPanel: React.CSSProperties = {
    background: 'var(--input-bg)',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid var(--border-card)',
  };

  return (
    <div style={{ maxWidth: '720px', margin: '10px auto', padding: '0 8px' }} className="animate-fade-in">
      <div style={{ marginBottom: '26px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(24px, 6vw, 34px)', marginBottom: '8px', color: 'var(--text-main)' }}>
          {t('portal.heroA')} <span style={{ color: 'var(--saffron)' }}>{t('portal.heroB')}</span>
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {t('portal.subtitle')}
        </p>
      </div>

      {successData ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px' }}>
          <CheckCircle2 size={60} color="var(--success)" />
          <h2 style={{ fontSize: '24px' }}>{t('portal.successTitle')}</h2>
          {displayHierarchy?.parliamentary ? (
            <div style={{ width: '100%', textAlign: 'left' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textAlign: 'center' }}>
                {t('portal.followedUp')}
              </div>
              <RoutingTree hierarchy={displayHierarchy} />
            </div>
          ) : sentToMp ? (
            <div className="glass-panel glass-panel-hover" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px' }}>
              <Avatar name={sentToMp.name} photoUrl={sentToMp.photo_url} size={52} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('portal.routedToMp')}</div>
                <div style={{ fontWeight: 700 }}>{sentToMp.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {sentToMp.party_abbr || sentToMp.party} · {sentToMp.constituency_name}
                </div>
              </div>
            </div>
          ) : null}
          <div style={{ ...softPanel, width: '100%', textAlign: 'left', marginTop: '4px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('portal.yourReport')}</span>
                <p style={{ fontWeight: 500 }}>{successData.english_translation || successData.content}</p>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('portal.aiCategory')}</span>
                <p style={{ fontWeight: 600, color: 'var(--secondary)' }}>{successData.category ? t('category.' + successData.category) : ''}</p>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('portal.sentimentLabel')}</span>
                <p style={{ fontWeight: 600 }}>{successData.sentiment ? t('sentiment.' + successData.sentiment) : ''}</p>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('portal.priorityScore')}</span>
                <p style={{ fontWeight: 600, color: 'var(--accent)' }}>{successData.priority_score}/100</p>
              </div>
            </div>
          </div>
          <button onClick={() => setSuccessData(null)} className="btn-primary" style={{ marginTop: '10px' }}>
            {t('portal.submitAnother')}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Constituency routing */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: isMobile ? 'flex-start' : 'center',
                justifyContent: 'space-between',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '4px' : '8px',
              }}
            >
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                {t('portal.step1')}
              </label>
              {detecting ? (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Loader2 size={12} className="animate-spin" /> {t('portal.detecting')}
                </span>
              ) : gpsReal && autofill ? (
                <span style={{ fontSize: '12px', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MapPin size={12} /> {t('portal.autofilled')}
                </span>
              ) : null}
            </div>
            <ConstituencyPicker value={constituency?.id ?? null} onChange={setConstituency} autofill={autofill} />

            {displayHierarchy?.parliamentary && (
              <div style={{ marginTop: '6px' }}>
                <div style={{ fontSize: '11px', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                  <UserCheck size={13} /> {t('portal.routedTo')}
                </div>
                <RoutingTree
                  hierarchy={displayHierarchy}
                  note={!displayHierarchy.assembly ? t('portal.enableLocation') : undefined}
                />
              </div>
            )}
          </div>

          <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '-8px' }}>
            {t('portal.step2')}
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>{t('portal.recordLabel')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', ...softPanel }}>
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className="pulse-recording"
                style={{
                  width: '56px', height: '56px', borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none',
                  background: isRecording ? 'var(--danger)' : 'var(--primary)',
                  boxShadow: isRecording ? '0 0 15px var(--danger)' : '0 0 15px var(--primary)',
                  color: 'white', animation: isRecording ? 'pulse-glow 1.5s infinite' : 'none', transition: 'all 0.3s ease',
                }}
              >
                {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  {isRecording ? t('portal.recording') : audioBlob ? t('portal.voiceRecorded') : t('portal.tapToRecord')}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {isRecording ? t('portal.lengthLimit', { duration }) : audioBlob ? t('portal.readyToSubmit') : t('portal.voiceLangs')}
                </div>
              </div>
            </div>

            {audioBlob && !isRecording && audioUrl && (
              <div
                style={{
                  ...softPanel,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {t('portal.reviewRecording')}
                </span>
                <audio controls src={audioUrl} style={{ flex: 1, minWidth: '180px', height: '36px' }} />
                <button
                  type="button"
                  onClick={deleteRecording}
                  title={t('portal.deleteRecording')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--danger)',
                    background: 'transparent',
                    color: 'var(--danger)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={16} />
                  {t('portal.deleteRecording')}
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>{t('portal.orWrite')}</label>
            <textarea
              rows={4}
              placeholder={t('portal.writePlaceholder')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="glass-input"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>{t('portal.phone')}</label>
              <input
                type="tel"
                placeholder={t('portal.phonePlaceholder')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="glass-input"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>{t('portal.photo')}</label>
              <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} id="image-upload" />
              <label htmlFor="image-upload" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', cursor: 'pointer' }}>
                <Image size={18} /> {t('portal.attachImage')}
              </label>
            </div>
          </div>

          {imagePreview && (
            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-card)', height: '200px' }}>
              <img src={imagePreview} alt="Upload preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <MapPin size={14} color={coords ? 'var(--secondary)' : 'var(--text-muted)'} />
            {coords ? t('portal.gpsCaptured', { lat: coords.lat.toFixed(3), lng: coords.lng.toFixed(3) }) : t('portal.gpsWaiting')}
          </div>

          <button type="submit" disabled={submitting} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {submitting ? (
              <><Loader2 size={18} className="animate-spin" /> {t('portal.analysing')}</>
            ) : (
              <><Send size={18} /> {t('portal.submit')}</>
            )}
          </button>
        </form>
      )}
    </div>
  );
};

export default Portal;
