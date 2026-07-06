import React, { useState, useEffect } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import apiClient from '../services/apiClient';
import { Mic, MicOff, Send, CheckCircle2, Image, MapPin, Loader2 } from 'lucide-react';
import { Suggestion } from '../types';

const Portal: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [content, setContent] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<Suggestion | null>(null);

  const { isRecording, audioBlob, duration, startRecording, stopRecording } = useAudioRecorder();

  // Capture location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Geolocation capture failed. Falling back to default center.', error);
          // Set mock location for test demo purposes
          setCoords({ lat: 27.7172, lng: 85.3240 });
        }
      );
    }
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content && !audioBlob) {
      alert('Please enter a description or record a voice message.');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('citizen_phone', phone);
    formData.append('content', content);
    formData.append('language_code', 'en');

    if (coords) {
      formData.append('latitude', coords.lat.toString());
      formData.append('longitude', coords.lng.toString());
    }

    if (audioBlob) {
      formData.append('audio', audioBlob, 'report_voice.wav');
    }

    if (imageFile) {
      formData.append('image', imageFile, imageFile.name);
    }

    try {
      const response = await apiClient.post<Suggestion>('/api/v1/suggestions/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccessData(response.data);
      // Reset form fields
      setPhone('');
      setContent('');
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error(err);
      alert('Failed to submit suggestion. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '40px auto', padding: '0 20px' }} className="animate-fade-in">
      <div style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '36px', marginBottom: '8px', color: 'var(--text-main)' }}>Constituency Portal</h1>
        <p style={{ color: 'var(--text-muted)' }}>Empower your local MP with your priorities. Submit concerns via text, voice, or photos.</p>
      </div>

      {successData ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <CheckCircle2 size={64} color="var(--success)" />
          <h2 style={{ fontSize: '24px' }}>Thank you for your feedback!</h2>
          <p style={{ color: 'var(--text-muted)' }}>Your concern has been submitted and classified by our AI prioritization engine.</p>
          
          <div style={{
            background: 'hsla(224, 25%, 6%, 0.4)',
            borderRadius: '12px',
            padding: '20px',
            width: '100%',
            textAlign: 'left',
            border: '1px solid var(--border-card)',
            marginTop: '10px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>TRANSCRIPTION/TEXT</span>
                <p style={{ fontWeight: 500 }}>{successData.english_translation || successData.content}</p>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>AI CATEGORY</span>
                <p style={{ fontWeight: 600, color: 'var(--secondary)' }}>{successData.category}</p>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SENTIMENT</span>
                <p style={{ fontWeight: 600 }}>{successData.sentiment}</p>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PRIORITY SCORE</span>
                <p style={{ fontWeight: 600, color: 'var(--accent)' }}>{successData.priority_score}/100</p>
              </div>
            </div>
          </div>

          <button onClick={() => setSuccessData(null)} className="btn-primary" style={{ marginTop: '20px' }}>
            Submit Another Concern
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>Phone Number (Optional)</label>
            <input
              type="tel"
              placeholder="e.g., +977 98XXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="glass-input"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>Record Voice Request (Multilingual)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'hsla(224, 25%, 6%, 0.4)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className="pulse-recording"
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: 'none',
                  background: isRecording ? 'var(--danger)' : 'var(--primary)',
                  boxShadow: isRecording ? '0 0 15px var(--danger)' : '0 0 15px var(--primary)',
                  color: 'white',
                  animation: isRecording ? 'pulse-glow 1.5s infinite' : 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  {isRecording ? 'Recording is active...' : audioBlob ? 'Voice clip recorded' : 'Press to record voice'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {isRecording ? `Length: ${duration}s (Standard 60s Limit)` : audioBlob ? 'Voice captured. Ready to submit.' : 'Speaks in English, Nepali, etc.'}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>Or write your request</label>
            <textarea
              rows={4}
              placeholder="Explain the problem in detail (e.g. Broken pipelines on main street, lack of streetlights)..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="glass-input"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>Photo Attachment (Optional)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', cursor: 'pointer' }}>
                  <Image size={18} />
                  Attach Image
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>Location Captured</label>
              <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', fontSize: '12px', color: coords ? 'var(--text-main)' : 'var(--text-muted)' }}>
                <MapPin size={16} color={coords ? 'var(--secondary)' : 'var(--text-muted)'} />
                {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Waiting for GPS...'}
              </div>
            </div>
          </div>

          {imagePreview && (
            <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-card)', height: '200px' }}>
              <img src={imagePreview} alt="Upload preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Analyzing with AI engine...
              </>
            ) : (
              <>
                <Send size={18} />
                Submit Priorities
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};

export default Portal;
