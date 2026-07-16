import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { MapContainer, TileLayer, Marker, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Smartphone,
  Wifi,
  WifiOff,
  Mic,
  MicOff,
  Image as ImageIcon,
  MapPin,
  Send,
  RefreshCw,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Brain
} from 'lucide-react';
import ConstituencyPicker from '../components/common/ConstituencyPicker';
import { Constituency } from '../types';

interface OfflineReport {
  offline_uuid: string;
  content: string;
  citizen_phone: string;
  latitude: number;
  longitude: number;
  constituency_id: number;
  language_code: string;
  timestamp: string;
}

const AppSimulator: React.FC = () => {
  // Simulated Mobile App State
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [phone, setPhone] = useState<string>('9988776655');
  const [content, setContent] = useState<string>('');
  const [constituency, setConstituency] = useState<Constituency | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [gpsCoords] = useState<{ lat: number; lng: number }>({ lat: 12.9716, lng: 77.5946 });

  // Mobile App Navigation & StreetMapper State
  const [mobileTab, setMobileTab] = useState<'report' | 'streetmapper'>('report');
  const [mobFmsContent, setMobFmsContent] = useState('');
  const [mobFmsPhone] = useState('9988776655');
  const [mobFmsCoords, setMobFmsCoords] = useState<[number, number]>([12.9716, 77.5946]);
  const [mobFmsImages, setMobFmsImages] = useState<File[]>([]);
  const [mobFmsImagePreviews, setMobFmsImagePreviews] = useState<string[]>([]);

  // Mobile StreetMapper Audio recorder
  const {
    isRecording: mobFmsIsRecording,
    audioBlob: mobFmsAudioBlob,
    duration: mobFmsDuration,
    startRecording: mobFmsStartRecording,
    stopRecording: mobFmsStopRecording,
    deleteRecording: mobFmsDeleteRecording
  } = useAudioRecorder();
  
  const [mobFmsTranscribing, setMobFmsTranscribing] = useState(false);
  const [mobFmsAudioUrl, setMobFmsAudioUrl] = useState<string>('');

  useEffect(() => {
    if (!mobFmsAudioBlob) {
      setMobFmsAudioUrl('');
      return;
    }
    const url = URL.createObjectURL(mobFmsAudioBlob);
    setMobFmsAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [mobFmsAudioBlob]);

  const [mobMpClassifying, setMobMpClassifying] = useState(false);
  const [mobMpClassResult, setMobMpClassResult] = useState<string | null>(null);

  const [mobOtpSent, setMobOtpSent] = useState(false);
  const [mobOtpCode, setMobOtpCode] = useState('');
  const [mobOtpInput, setMobOtpInput] = useState('');
  const [mobOtpVerified, setMobOtpVerified] = useState(false);

  const [mobMyReports, setMobMyReports] = useState<any[]>([]);
  const [mobSearchQuery, setMobSearchQuery] = useState('');
  const [mobSearchResult, setMobSearchResult] = useState<any | null>(null);
  const [mobSearchLoading, setMobSearchLoading] = useState(false);

  // Voice recorder hooks
  const { isRecording, audioBlob, duration, startRecording, stopRecording, deleteRecording } = useAudioRecorder();
  const [transcribing, setTranscribing] = useState<boolean>(false);
  const [transcriptionPreview, setTranscriptionPreview] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');

  useEffect(() => {
    if (!audioBlob) {
      setAudioUrl('');
      return;
    }
    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioBlob]);

  // Offline queue
  const [offlineQueue, setOfflineQueue] = useState<OfflineReport[]>([]);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // SMS Simulator State
  const [smsPhone, setSmsPhone] = useState<string>('9123456789');
  const [smsBody, setSmsBody] = useState<string>('REPORT Water Pipe leak at crossroad 4');
  const [smsReply, setSmsReply] = useState<string | null>(null);
  const [sendingSms, setSendingSms] = useState<boolean>(false);

  // Active intake channel selection tab
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'sms'>('whatsapp');

  // WhatsApp Chat Simulator State
  const [whatsappPhone] = useState<string>('9876543210');
  const [whatsappInput, setWhatsappInput] = useState<string>('');
  const [whatsappMessages, setWhatsappMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; timestamp: string }>>([
    {
      sender: 'bot',
      text: 'Welcome to Civic Pulse! 🏛️\n\nYou can:\n• Report a civic issue (type "report")\n• Check complaint status (type "status")\n\nWhat would you like to do today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [whatsappParams, setWhatsappParams] = useState<Record<string, any>>({});
  const [sendingWhatsapp, setSendingWhatsapp] = useState<boolean>(false);


  // Load offline queue and mobile streetmapper reports on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem('civic_pulse_offline_queue');
    if (savedQueue) {
      try {
        setOfflineQueue(JSON.parse(savedQueue));
      } catch (e) {
        console.error(e);
      }
    }

    const savedReports = localStorage.getItem('my_streetmapper_reports_mobile');
    if (savedReports) {
      try {
        setMobMyReports(JSON.parse(savedReports));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Set mobile GPS location on tab change
  useEffect(() => {
    if (mobileTab === 'streetmapper' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMobFmsCoords([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => console.warn("Mobile GPS permission denied or unavailable:", err)
      );
    }
  }, [mobileTab]);

  // Save offline queue when updated
  const saveQueue = (queue: OfflineReport[]) => {
    setOfflineQueue(queue);
    localStorage.setItem('civic_pulse_offline_queue', JSON.stringify(queue));
  };

  const handleResetMobileApp = () => {
    setContent('');
    setPhone('9988776655');
    setImageFile(null);
    setImagePreview(null);
    deleteRecording();
    setTranscriptionPreview(null);
    setSyncSuccessMsg(null);
    saveQueue([]);

    // Reset mobile FMS
    setMobFmsContent('');
    setMobFmsImages([]);
    setMobFmsImagePreviews([]);
    setMobMpClassResult(null);
    setMobOtpSent(false);
    setMobOtpVerified(false);
    setMobOtpInput('');
  };

  // Voice transcription logic for Mobile StreetMapper
  useEffect(() => {
    if (!mobFmsAudioBlob) return;
    const runMobTranscription = async () => {
      setMobFmsTranscribing(true);
      const formData = new FormData();
      formData.append('audio', mobFmsAudioBlob, 'mob_streetmapper_voice.webm');
      try {
        const response = await apiClient.post<{ transcript: string }>('/api/v1/suggestions/transcribe', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMobFmsContent(response.data.transcript);
      } catch (err) {
        console.warn('Mobile Audio transcription failed:', err);
      } finally {
        setMobFmsTranscribing(false);
      }
    };
    runMobTranscription();
  }, [mobFmsAudioBlob]);

  const handleMobFmsImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setMobFmsImages(files);
    setMobFmsImagePreviews(files.map(f => URL.createObjectURL(f)));

    if (files.length > 0) {
      setMobMpClassifying(true);
      setMobMpClassResult(null);
      setTimeout(() => {
        setMobMpClassifying(false);
        const lowerName = files[0].name.toLowerCase();
        if (lowerName.includes('garbage') || lowerName.includes('trash') || lowerName.includes('waste')) {
          setMobMpClassResult('Garbage pile (89.5% Confidence)');
        } else if (lowerName.includes('water') || lowerName.includes('flood') || lowerName.includes('leak')) {
          setMobMpClassResult('Water Leak (91.2% Confidence)');
        } else {
          setMobMpClassResult('Pothole / Road Damage (93.1% Confidence)');
        }
      }, 1200);
    }
  };

  const handleMobSendOtp = () => {
    if (!mobFmsPhone.trim()) {
      alert('Please enter a phone number first!');
      return;
    }
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setMobOtpCode(code);
    setMobOtpSent(true);
    setMobOtpVerified(false);
    alert(`📲 [OTP GATEWAY SIMULATOR]\n\nSMS dispatched to ${mobFmsPhone}:\n"Civic Pulse: Your OTP is ${code}. Verified citizen registry code."`);
  };

  const handleMobVerifyOtp = () => {
    if (mobOtpInput.trim() === mobOtpCode) {
      setMobOtpVerified(true);
      alert('✅ Phone verified successfully! Registry unlocked.');
    } else {
      alert('❌ Invalid verification code.');
    }
  };

  const handleMobSearchStatus = async () => {
    if (!mobSearchQuery.trim()) return;
    setMobSearchLoading(true);
    setMobSearchResult(null);
    try {
      const res = await apiClient.get(`/api/v1/suggestions/${mobSearchQuery.trim()}`);
      setMobSearchResult(res.data);
    } catch (e) {
      setMobSearchResult({ error: 'Not found.' });
    } finally {
      setMobSearchLoading(false);
    }
  };

  const handleMobFmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobFmsContent.trim()) {
      alert('Description is mandatory!');
      return;
    }
    if (mobFmsImages.length === 0) {
      alert('At least one photo upload is mandatory!');
      return;
    }
    if (!mobFmsPhone.trim()) {
      alert('Phone number is mandatory!');
      return;
    }
    if (!mobOtpVerified) {
      alert('OTP Verification is required!');
      return;
    }

    if (!isOnline) {
      // Offline mode: Queue report as offline
      const reportUuid = `streetmapper_off_${Math.random().toString(36).substr(2, 9)}`;
      const offlineReport: OfflineReport = {
        offline_uuid: reportUuid,
        content: `[StreetMapper] ${mobFmsContent}`,
        citizen_phone: mobFmsPhone,
        latitude: mobFmsCoords[0],
        longitude: mobFmsCoords[1],
        constituency_id: constituency?.id || 1,
        language_code: 'en',
        timestamp: new Date().toLocaleTimeString(),
      };
      
      const newQueue = [...offlineQueue, offlineReport];
      saveQueue(newQueue);
      alert('📲 Connection Offline! Stored report in local sync queue.');

      // Reset
      setMobFmsContent('');
      setMobFmsImages([]);
      setMobFmsImagePreviews([]);
      setMobMpClassResult(null);
      setMobOtpSent(false);
      setMobOtpVerified(false);
      setMobOtpInput('');
      mobFmsDeleteRecording();
      return;
    }

    setSyncing(true);
    const formData = new FormData();
    formData.append('content', mobFmsContent);
    formData.append('citizen_phone', mobFmsPhone);
    formData.append('latitude', mobFmsCoords[0].toString());
    formData.append('longitude', mobFmsCoords[1].toString());
    formData.append('language_code', 'en');
    formData.append('image', mobFmsImages[0]);
    if (mobFmsAudioBlob) {
      formData.append('audio', mobFmsAudioBlob, 'mob_streetmapper_voice.webm');
    }

    try {
      const res = await apiClient.post('/api/v1/suggestions/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSyncSuccessMsg('StreetMapper report submitted successfully!');
      setTimeout(() => setSyncSuccessMsg(null), 3000);

      const newReport = {
        id: res.data.id,
        content: res.data.content,
        category: res.data.category || 'General',
        status: res.data.status || 'Submitted',
        created_at: res.data.created_at || new Date().toISOString(),
        coords: mobFmsCoords
      };

      const updated = [newReport, ...mobMyReports];
      setMobMyReports(updated);
      localStorage.setItem('my_streetmapper_reports_mobile', JSON.stringify(updated));

      // Reset fields
      setMobFmsContent('');
      setMobFmsImages([]);
      setMobFmsImagePreviews([]);
      setMobMpClassResult(null);
      setMobOtpSent(false);
      setMobOtpVerified(false);
      setMobOtpInput('');
      mobFmsDeleteRecording();
    } catch (err) {
      console.error(err);
      alert('Failed to register complaint.');
    } finally {
      setSyncing(false);
    }
  };

  // Handle local voice recording transcription
  useEffect(() => {
    if (!audioBlob) {
      setTranscriptionPreview(null);
      return;
    }

    if (!isOnline) {
      setTranscriptionPreview('[Audio recorded offline — will be transcribed upon syncing]');
      setContent('Voice Report (recorded offline)');
      return;
    }

    const autoTranscribe = async () => {
      setTranscribing(true);
      const formData = new FormData();
      formData.append('audio', audioBlob, 'temp_audio.webm');
      try {
        const response = await apiClient.post<{ transcript: string }>('/api/v1/suggestions/transcribe', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setTranscriptionPreview(response.data.transcript);
        setContent(response.data.transcript);
      } catch (err) {
        console.warn('Audio transcription failed:', err);
      } finally {
        setTranscribing(false);
      }
    };

    autoTranscribe();
  }, [audioBlob, isOnline]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleMobileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!constituency) {
      alert('Please select your Constituency first.');
      return;
    }

    if (!content && !audioBlob) {
      alert('Please write a message or record your voice.');
      return;
    }

    const reportUuid = `report_${Math.random().toString(36).substr(2, 9)}`;

    if (!isOnline) {
      // Offline mode: Queue the suggestion locally
      const offlineReport: OfflineReport = {
        offline_uuid: reportUuid,
        content: content || 'Voice report (recorded offline)',
        citizen_phone: phone,
        latitude: gpsCoords.lat,
        longitude: gpsCoords.lng,
        constituency_id: constituency.id,
        language_code: 'en',
        timestamp: new Date().toLocaleTimeString(),
      };

      const newQueue = [...offlineQueue, offlineReport];
      saveQueue(newQueue);

      // Reset form
      setContent('');
      setImageFile(null);
      setImagePreview(null);
      deleteRecording();
      alert('📲 Stored locally! Connection is offline. Report added to offline queue.');
    } else {
      // Online mode: Submit suggestion directly to backend suggestion api
      setSyncing(true);
      const formData = new FormData();
      formData.append('citizen_phone', phone);
      formData.append('content', content);
      formData.append('latitude', gpsCoords.lat.toString());
      formData.append('longitude', gpsCoords.lng.toString());
      formData.append('constituency_id', constituency.id.toString());
      formData.append('language_code', 'en');
      if (audioBlob) formData.append('audio', audioBlob, 'report_voice.webm');
      if (imageFile) formData.append('image', imageFile, imageFile.name);

      apiClient.post('/api/v1/suggestions/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      .then(() => {
        setContent('');
        setImageFile(null);
        setImagePreview(null);
        deleteRecording();
        setSyncSuccessMsg('Report submitted successfully to the live database!');
        setTimeout(() => setSyncSuccessMsg(null), 3000);
      })
      .catch((err) => {
        console.error(err);
        alert('API submission failed.');
      })
      .finally(() => setSyncing(false));
    }
  };

  // Perform background sync of queued reports
  const triggerSync = async () => {
    if (offlineQueue.length === 0) return;
    setSyncing(true);
    setSyncSuccessMsg(null);

    // Map offline queue items to API schema
    const payload = offlineQueue.map((item) => ({
      offline_uuid: item.offline_uuid,
      content: item.content,
      citizen_phone: item.citizen_phone,
      latitude: item.latitude,
      longitude: item.longitude,
      constituency_id: item.constituency_id,
      language_code: item.language_code,
      created_at_offline: item.timestamp,
    }));

    try {
      const response = await apiClient.post<any[]>('/api/v1/suggestions/sync', payload);
      const syncedCount = response.data.filter(r => r.status === 'synced').length;
      const dupCount = response.data.filter(r => r.status === 'duplicate').length;

      setSyncSuccessMsg(`🔄 Background Sync Success! Synced: ${syncedCount}, Duplicates flagged: ${dupCount}.`);
      saveQueue([]); // Clear queue
    } catch (err) {
      console.error(err);
      alert('Background Sync failed. Server offline?');
    } finally {
      setSyncing(false);
    }
  };

  // Toggle Network Status
  const toggleNetwork = (online: boolean) => {
    setIsOnline(online);
    if (online && offlineQueue.length > 0) {
      // Auto-trigger sync on network reconnect
      setTimeout(() => triggerSync(), 800);
    }
  };

  // Submit Simulated SMS
  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsBody.trim()) return;

    setSendingSms(true);
    setSmsReply(null);

    const formData = new FormData();
    formData.append('From', smsPhone);
    formData.append('Body', smsBody);

    try {
      const response = await apiClient.post('/api/v1/suggestions/sms/intake', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSmsReply(response.data);
    } catch (err) {
      console.error(err);
      setSmsReply('Error routing SMS. Check server connection.');
    } finally {
      setSendingSms(false);
    }
  };

  // Submit Simulated WhatsApp Message to Dialogflow webhook
  const handleSendWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappInput.trim()) return;

    const userMsg = whatsappInput.trim();
    setWhatsappInput('');

    // Add user message to local chat log
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setWhatsappMessages(prev => [...prev, { sender: 'user', text: userMsg, timestamp: now }]);
    setSendingWhatsapp(true);

    // Intent resolution mapping
    let intentName = "Default Welcome Intent";
    const clean = userMsg.toLowerCase().trim();
    const currentParams: Record<string, any> = { ...whatsappParams, phone: whatsappPhone };

    if (clean === 'hi' || clean === 'hello' || clean === 'default' || clean === 'restart') {
      intentName = "Default Welcome Intent";
      setWhatsappParams({}); // Reset parameters on reset command
    } else if (clean === 'report' || clean === 'complaint') {
      intentName = "civic.complaint.start";
    } else if (clean === 'yes' || clean === 'confirm') {
      intentName = "civic.complaint.submit";
    } else if (clean.startsWith('status') || /^[a-f0-9]{8}$/i.test(clean)) {
      intentName = "civic.status.check";
      const parts = clean.split(/\s+/);
      if (parts.length > 1 && parts[0] === 'status') {
        currentParams.complaint_id = parts[1].toUpperCase();
      } else if (clean !== 'status') {
        currentParams.complaint_id = clean.toUpperCase();
      }
    } else {
      intentName = "civic.complaint.detail";
      currentParams.complaint_text = userMsg;
    }

    try {
      const response = await apiClient.post('/api/v1/dialogflow/webhook', {
        intentInfo: { displayName: intentName },
        sessionInfo: { parameters: currentParams },
        text: userMsg
      });

      const replyMsg = response.data?.fulfillmentResponse?.messages?.[0]?.text?.text?.[0] || 
        "Sorry, I did not receive a valid response from the backend webhook.";
      
      const newParams = response.data?.sessionInfo?.parameters || currentParams;
      setWhatsappParams(newParams);

      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setWhatsappMessages(prev => [...prev, { sender: 'bot', text: replyMsg, timestamp: botTime }]);
    } catch (err) {
      console.error(err);
      const errTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setWhatsappMessages(prev => [...prev, { sender: 'bot', text: '⚠️ Connection failed: Dialogflow webhook offline.', timestamp: errTime }]);
    } finally {
      setSendingWhatsapp(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }} className="animate-fade-in">
      
      {/* Page Title & Pitch Info */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h1 style={{ fontSize: 'clamp(20px, 5vw, 28px)', color: 'var(--text-main)', marginBottom: '8px' }}>
          📱 Mobile App & SMS Gateway <span style={{ color: 'var(--secondary)' }}>Simulator</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto' }}>
          Demonstrate how the citizen app caches reports in an offline queue, syncs automatically upon network recovery, and how SMS keywords bypass internet networks entirely.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', alignItems: 'start' }}>
        
        {/* PANEL 1: Mobile App Simulator */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '15px' }}>
            Flutter / Android App Simulator
          </h2>

          {/* Smartphone Frame Wrapper */}
          <div
            style={{
              width: '100%',
              maxWidth: '350px',
              height: '670px',
              background: '#15171e',
              borderRadius: '40px',
              border: '10px solid #2d313f',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Phone Speaker/Camera notch */}
            <div
              style={{
                width: '120px',
                height: '24px',
                background: '#2d313f',
                borderRadius: '0 0 15px 15px',
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
              }}
            />

            {/* Simulated Phone Status Bar */}
            <div
              style={{
                background: 'var(--bg-card)',
                padding: '30px 18px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              <span>12:00 PM</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '9px' }}>LTE</span>
                {isOnline ? (
                  <Wifi size={14} color="var(--success)" />
                ) : (
                  <WifiOff size={14} color="var(--danger)" />
                )}
              </div>
            </div>

            {/* Smart Screen Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--bg-app)' }}>
              
              {/* Internal Mobile Top Card */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Smartphone size={16} color="var(--secondary)" />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>CivicPulse Native</span>
                </div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleResetMobileApp}
                    style={{
                      border: 'none', background: 'rgba(239, 68, 68, 0.15)',
                      color: 'var(--danger)', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 600, marginRight: '4px'
                    }}
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => toggleNetwork(true)}
                    style={{
                      border: 'none', background: isOnline ? 'var(--success)' : 'transparent',
                      color: isOnline ? 'white' : 'var(--text-muted)', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 600
                    }}
                  >
                    Online
                  </button>
                  <button
                    onClick={() => toggleNetwork(false)}
                    style={{
                      border: 'none', background: !isOnline ? 'var(--danger)' : 'transparent',
                      color: !isOnline ? 'white' : 'var(--text-muted)', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 600
                    }}
                  >
                    Offline
                  </button>
                </div>
              </div>

              {/* Sync Message Status banner */}
              {syncSuccessMsg && (
                <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--success)', borderRadius: '8px', padding: '8px 10px', fontSize: '11px', color: 'var(--success)', display: 'flex', gap: '6px' }}>
                  <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{syncSuccessMsg}</span>
                </div>
              )}

              {/* SCREEN 1: Standard Voice / Text Intake */}
              {mobileTab === 'report' && (
                <>
                  {/* Citizen App Form */}
                  <form onSubmit={handleMobileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {/* 1. Constituency picker */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>1. CHOOSE CONSTITUENCY</label>
                      <ConstituencyPicker value={constituency?.id ?? null} onChange={setConstituency} />
                    </div>

                    {/* 2. Microphone Recorder */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>2. SPEAK Grievance (Optional)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--input-bg)', padding: '8px', borderRadius: '10px' }}>
                        <button
                          type="button"
                          onClick={isRecording ? stopRecording : startRecording}
                          style={{
                            width: '38px', height: '38px', borderRadius: '50%', border: 'none',
                            background: isRecording ? 'var(--danger)' : 'var(--primary)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0
                          }}
                        >
                          {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>
                        <div style={{ fontSize: '11px', flex: 1 }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                            {isRecording ? 'Recording Audio...' : audioBlob ? 'Audio Recorded' : 'Tap to Record'}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                            {isRecording ? `${duration} seconds` : audioBlob ? 'Ready to sync' : 'Speak in your language'}
                          </div>
                        </div>
                        {audioUrl && (
                          <audio controls src={audioUrl} style={{ height: '24px', maxWidth: '140px' }} />
                        )}
                      </div>
                    </div>

                    {/* Speech to text preview bubble */}
                    {(transcribing || transcriptionPreview) && (
                      <div style={{ background: 'rgba(34, 197, 94, 0.04)', border: '1px dashed var(--secondary)', padding: '8px 10px', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 600, color: 'var(--secondary)', marginBottom: '4px' }}>
                          <Brain size={12} className={transcribing ? 'animate-pulse' : ''} />
                          <span>{transcribing ? 'Transcribing via Gemini...' : 'Speech-to-Text Preview'}</span>
                        </div>
                        {transcribing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                            <Loader2 size={10} className="animate-spin" /> Processing...
                          </div>
                        ) : (
                          <p style={{ fontSize: '11px', margin: 0, fontStyle: 'italic', color: 'var(--text-main)' }}>"{transcriptionPreview}"</p>
                        )}
                      </div>
                    )}

                    {/* 3. Text area */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>3. ISSUE DESCRIPTION</label>
                      <textarea
                        rows={3}
                        placeholder="Type details here..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        style={{
                          background: 'var(--input-bg)', border: '1px solid var(--border-card)',
                          borderRadius: '8px', padding: '8px', color: 'var(--text-main)', fontSize: '12px', resize: 'none'
                        }}
                      />
                    </div>

                    {/* 4. Phone input */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>4. PHONE NUMBER</label>
                      <input
                        type="tel"
                        placeholder="Enter phone..."
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        style={{
                          background: 'var(--input-bg)', border: '1px solid var(--border-card)',
                          borderRadius: '8px', padding: '8px', color: 'var(--text-main)', fontSize: '12px'
                        }}
                      />
                    </div>

                    {/* 5. Photo attach */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>5. ATTACH PHOTO</label>
                      <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} id="mob-image-upload" />
                      <label
                        htmlFor="mob-image-upload"
                        style={{
                          background: 'var(--input-bg)', border: '1px solid var(--border-card)', borderRadius: '8px',
                          padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: '8px', fontSize: '11px', color: 'var(--text-main)', cursor: 'pointer'
                        }}
                      >
                        <ImageIcon size={14} /> Attach Camera Image
                      </label>
                      {imagePreview && (
                        <div style={{ height: '70px', borderRadius: '6px', overflow: 'hidden', marginTop: '4px' }}>
                          <img src={imagePreview} alt="Mobile preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                    </div>

                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={syncing}
                      style={{
                        border: 'none', background: 'var(--primary)', color: 'white',
                        padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '5px'
                      }}
                    >
                      {syncing ? (
                        <><Loader2 size={14} className="animate-spin" /> Processing...</>
                      ) : (
                        <><Send size={14} /> {isOnline ? 'Submit Report' : 'Save to Offline Queue'}</>
                      )}
                    </button>

                  </form>

                  {/* Local Offline Queue Status Card */}
                  {offlineQueue.length > 0 && (
                    <div style={{ marginTop: '5px', background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed var(--danger)', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={12} /> {offlineQueue.length} REPORT(S) QUEUED
                        </span>
                        {isOnline && (
                          <button
                            onClick={triggerSync}
                            style={{
                              border: 'none', background: 'var(--success)', color: 'white',
                              padding: '3px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 700,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px'
                            }}
                          >
                            <RefreshCw size={10} /> Sync Now
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '70px', overflowY: 'auto' }}>
                        {offlineQueue.map((item, idx) => (
                          <div key={idx} style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', background: 'var(--input-bg)', padding: '4px 6px', borderRadius: '4px' }}>
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '170px' }}>{item.content}</span>
                            <span>{item.timestamp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* SCREEN 2: Mobile StreetMapper Geospatial Reporter */}
              {mobileTab === 'streetmapper' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '2px' }}>
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>StreetMapper GPS Pin</h4>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Drag pin on map to locate pothole / issue</span>
                  </div>

                  {/* Leaflet map frame */}
                  <div style={{ height: '130px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-card)', position: 'relative' }}>
                    <MapContainer key={mobFmsCoords.toString()} center={mobFmsCoords} zoom={14} style={{ width: '100%', height: '100%' }}>
                      <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png" />
                      <Marker
                        position={mobFmsCoords}
                        draggable={true}
                        eventHandlers={{
                          dragend: (e) => {
                            const { lat, lng } = e.target.getLatLng();
                            setMobFmsCoords([lat, lng]);
                          }
                        }}
                      />
                      <CircleMarker
                        center={mobFmsCoords}
                        radius={16}
                        pathOptions={{ color: 'var(--secondary)', fillColor: 'var(--secondary)', fillOpacity: 0.12, weight: 1 }}
                      />
                    </MapContainer>
                    <div style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(14,17,24,0.85)', color: '#e8eaed', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', zIndex: 100, border: '1px solid var(--border-card)' }}>
                      📍 {mobFmsCoords[0].toFixed(4)}, {mobFmsCoords[1].toFixed(4)}
                    </div>
                  </div>

                  <form onSubmit={handleMobFmsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Content text */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        DESCRIPTION <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <textarea
                        rows={2}
                        placeholder="E.g., Pothole on Sector 4 main street..."
                        value={mobFmsContent}
                        onChange={(e) => setMobFmsContent(e.target.value)}
                        style={{ background: 'var(--input-bg)', border: '1px solid var(--border-card)', borderRadius: '8px', padding: '6px 8px', color: 'var(--text-main)', fontSize: '11px', resize: 'none' }}
                      />
                    </div>

                    {/* SPEAK Grievance (Optional) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>SPEAK (OPTIONAL)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--input-bg)', border: '1px solid var(--border-card)', padding: '6px', borderRadius: '8px' }}>
                        <button
                          type="button"
                          onClick={mobFmsIsRecording ? mobFmsStopRecording : mobFmsStartRecording}
                          style={{
                            width: '28px', height: '28px', borderRadius: '50%', border: 'none',
                            background: mobFmsIsRecording ? 'var(--danger)' : 'var(--primary)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0
                          }}
                        >
                          {mobFmsIsRecording ? <MicOff size={14} /> : <Mic size={14} />}
                        </button>
                        <div style={{ fontSize: '10px', flex: 1 }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                            {mobFmsIsRecording ? 'Recording...' : mobFmsAudioBlob ? 'Recorded' : 'Tap to Record'}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '8px' }}>
                            {mobFmsIsRecording ? `${mobFmsDuration}s` : mobFmsAudioBlob ? 'Transcribed' : 'Speak in your language'}
                          </div>
                        </div>
                        {mobFmsAudioUrl && (
                          <audio controls src={mobFmsAudioUrl} style={{ height: '20px', maxWidth: '80px' }} />
                        )}
                      </div>
                      {mobFmsTranscribing && (
                        <div style={{ fontSize: '9px', color: 'var(--secondary)' }}>
                          Transcribing with Gemini...
                        </div>
                      )}
                    </div>

                    {/* Camera upload */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        PHOTO(S) <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <input type="file" multiple accept="image/*" onChange={handleMobFmsImageChange} style={{ display: 'none' }} id="mob-fms-image" />
                      <label
                        htmlFor="mob-fms-image"
                        style={{ background: 'var(--input-bg)', border: '1px solid var(--border-card)', borderRadius: '8px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-main)', cursor: 'pointer' }}
                      >
                        <ImageIcon size={12} /> {mobFmsImages.length > 0 ? `Selected ${mobFmsImages.length} Photo(s)` : 'Take Issue Photo(s)'}
                      </label>
                      {mobFmsImagePreviews.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', marginTop: '4px', padding: '2px' }}>
                          {mobFmsImagePreviews.map((url, idx) => (
                            <div key={idx} style={{ height: '40px', minWidth: '40px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-card)' }}>
                              <img src={url} alt={`Preview ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* MediaPipe */}
                    {(mobMpClassifying || mobMpClassResult) && (
                      <div style={{ background: 'rgba(34, 197, 94, 0.03)', border: '1px dashed var(--secondary)', padding: '6px 8px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--secondary)' }}>
                          🤖 {mobMpClassifying ? 'MediaPipe processing...' : 'MediaPipe Edge Classifier'}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-main)' }}>
                          {mobMpClassifying ? 'Analyzing frames...' : mobMpClassResult}
                        </span>
                      </div>
                    )}

                    {/* Phone & OTP */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        OTP VERIFICATION <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {!mobOtpVerified && (
                          <button type="button" onClick={handleMobSendOtp} className="btn-secondary" style={{ flex: 1, padding: '6px 8px', fontSize: '10px', borderRadius: '8px' }}>
                            {mobOtpSent ? 'Resend OTP to Registered Phone' : 'Send OTP to Registered Phone'}
                          </button>
                        )}
                      </div>

                      {mobOtpSent && !mobOtpVerified && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                          <input
                            value={mobOtpInput}
                            onChange={(e) => setMobOtpInput(e.target.value)}
                            placeholder="4-digit code"
                            style={{ flex: 1, background: 'var(--input-bg)', border: '1px solid var(--border-card)', borderRadius: '8px', padding: '6px 8px', color: 'var(--text-main)', fontSize: '11px' }}
                          />
                          <button type="button" onClick={handleMobVerifyOtp} className="btn-primary" style={{ padding: '4px 8px', fontSize: '9px', borderRadius: '8px' }}>
                            Verify
                          </button>
                        </div>
                      )}

                      {mobOtpVerified && (
                        <span style={{ fontSize: '9px', color: '#22c55e', fontWeight: 600 }}>✓ Registry Verified</span>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={syncing || !mobOtpVerified || !mobFmsImages.length}
                      style={{ border: 'none', background: 'var(--primary)', color: 'white', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}
                    >
                      <Send size={12} /> {isOnline ? 'Register Issue' : 'Queue Offline'}
                    </button>
                  </form>

                  {/* Tracking widget inside phone screen */}
                  <div style={{ marginTop: '6px', borderTop: '1px solid var(--border-card)', paddingTop: '10px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)' }}>TRACK LIVE STATUS</span>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', marginBottom: '8px' }}>
                      <input
                        value={mobSearchQuery}
                        onChange={(e) => setMobSearchQuery(e.target.value)}
                        placeholder="Enter 8-char ID"
                        style={{ flex: 1, background: 'var(--input-bg)', border: '1px solid var(--border-card)', borderRadius: '8px', padding: '6px 8px', color: 'var(--text-main)', fontSize: '11px' }}
                      />
                      <button onClick={handleMobSearchStatus} className="btn-primary" style={{ padding: '6px 10px', fontSize: '10px', borderRadius: '8px' }} disabled={mobSearchLoading}>
                        Track
                      </button>
                    </div>

                    {mobSearchResult && (
                      <div style={{ background: 'var(--overlay-faint)', border: '1px solid var(--border-card)', padding: '8px', borderRadius: '6px', marginBottom: '8px', fontSize: '11px' }}>
                        {mobSearchResult.error ? (
                          <span style={{ color: 'var(--danger)' }}>Not found.</span>
                        ) : (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '4px' }}>
                              <span>ID: {mobSearchResult.id.slice(0,8).toUpperCase()}</span>
                              <span style={{ color: '#22c55e' }}>{mobSearchResult.status}</span>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', position: 'relative', padding: '0 4px' }}>
                              <div style={{ position: 'absolute', top: '6px', left: '10px', right: '10px', height: '1px', background: 'var(--border-card)', zIndex: 0 }} />
                              <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e', color: 'white', fontSize: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>✓</div>
                                <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>Sent</span>
                              </div>
                              <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: ['Reviewed', 'Processing', 'Resolved', 'Approved'].includes(mobSearchResult.status) ? '#22c55e' : 'var(--border-card)', color: 'white', fontSize: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                  {['Reviewed', 'Processing', 'Resolved', 'Approved'].includes(mobSearchResult.status) ? '✓' : '2'}
                                </div>
                                <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>Routed</span>
                              </div>
                              <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: mobSearchResult.status === 'Resolved' ? '#22c55e' : 'var(--border-card)', color: 'white', fontSize: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                  {mobSearchResult.status === 'Resolved' ? '✓' : '3'}
                                </div>
                                <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>Fixed</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Local FMS report entries list */}
                    {mobMyReports.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '72px', overflowY: 'auto' }}>
                        {mobMyReports.map((r) => (
                          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', background: 'var(--input-bg)', padding: '4px 6px', borderRadius: '4px', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700 }}>ID: {r.id.slice(0, 8).toUpperCase()}</span>
                            <span style={{ color: r.status === 'Resolved' ? '#22c55e' : 'var(--saffron)' }}>{r.status}</span>
                            <button onClick={() => { setMobSearchQuery(r.id.slice(0,8)); setMobSearchResult(r); }} style={{ border: 'none', background: 'var(--primary)', color: 'white', fontSize: '8px', padding: '1px 4px', borderRadius: '2px', cursor: 'pointer' }}>
                              Track
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Simulated smartphone bottom navigation bar tab menu */}
            <div
              style={{
                height: '52px',
                background: 'var(--input-bg)',
                borderTop: '1px solid #2d313f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontWeight: 600,
                zIndex: 10,
              }}
            >
              <button
                type="button"
                onClick={() => setMobileTab('report')}
                style={{
                  flex: 1, height: '100%', border: 'none', background: 'transparent',
                  color: mobileTab === 'report' ? 'var(--secondary)' : 'var(--text-muted)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', cursor: 'pointer'
                }}
              >
                <Smartphone size={16} />
                <span>Report Issue</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('streetmapper')}
                style={{
                  flex: 1, height: '100%', border: 'none', background: 'transparent',
                  color: mobileTab === 'streetmapper' ? 'var(--secondary)' : 'var(--text-muted)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', cursor: 'pointer'
                }}
              >
                <MapPin size={16} />
                <span>StreetMapper</span>
              </button>
            </div>

            {/* Smartphone Home Bar */}
            <div style={{ height: '18px', background: '#15171e', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '4px' }}>
              <div style={{ width: '100px', height: '4px', background: '#2d313f', borderRadius: '2px' }} />
            </div>

          </div>
        </div>

        {/* PANEL 2: Conversational Intake Gateways (WhatsApp & SMS) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Channel Selector Tabs */}
          <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-card)', padding: '6px', borderRadius: '10px', border: '1px solid var(--border-card)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('whatsapp')}
              style={{
                flex: 1, border: 'none', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                background: activeTab === 'whatsapp' ? '#075e54' : 'transparent',
                color: activeTab === 'whatsapp' ? 'white' : 'var(--text-muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <MessageSquare size={16} /> WhatsApp Business
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sms')}
              style={{
                flex: 1, border: 'none', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                background: activeTab === 'sms' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'sms' ? 'white' : 'var(--text-muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <Smartphone size={16} /> Basic SMS Gateway
            </button>
          </div>

          {/* 1. WHATSAPP SIMULATOR */}
          {activeTab === 'whatsapp' && (
            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '480px', border: '1px solid #075e54' }}>
              
              {/* WhatsApp Mock Top Header */}
              <div style={{ background: '#075e54', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#128c7e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', color: 'white' }}>
                  🏛️
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Civic Pulse Bot
                    <span style={{ fontSize: '10px', background: '#128c7e', width: '15px', height: '15px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>✓</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#dcf8c6' }}>Online official MP helper</div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setWhatsappMessages([
                        {
                          sender: 'bot',
                          text: 'Welcome to Civic Pulse! 🏛️\n\nYou can:\n• Report a civic issue (type "report")\n• Check complaint status (type "status")\n\nWhat would you like to do today?',
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        }
                      ]);
                      setWhatsappParams({});
                    }}
                    style={{ border: 'none', background: 'transparent', color: 'white', fontSize: '10px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Reset chat
                  </button>
                </div>
              </div>

              {/* WhatsApp Message Logs Container */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#efe9e2', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {whatsappMessages.map((msg, idx) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div key={idx} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                      <div
                        style={{
                          background: isUser ? '#dcf8c6' : 'white',
                          color: '#303030',
                          padding: '8px 12px',
                          borderRadius: isUser ? '10px 10px 0 10px' : '10px 10px 10px 0',
                          maxWidth: '80%',
                          boxShadow: '0 1px 2.5px rgba(0,0,0,0.15)',
                          position: 'relative'
                        }}
                      >
                        <p style={{ fontSize: '13px', margin: 0, whiteSpace: 'pre-line', lineHeight: '1.4' }}>{msg.text}</p>
                        <span style={{ fontSize: '9px', color: '#909090', float: 'right', marginTop: '4px', marginLeft: '8px' }}>{msg.timestamp}</span>
                      </div>
                    </div>
                  );
                })}
                {sendingWhatsapp && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ background: 'white', padding: '8px 12px', borderRadius: '10px 10px 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Loader2 size={12} className="animate-spin" color="#075e54" />
                      <span style={{ fontSize: '11px', color: '#909090' }}>Typing...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* WhatsApp Mock Footer Input Form */}
              <form onSubmit={handleSendWhatsapp} style={{ background: '#f0f0f0', padding: '8px 12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Type 'report', 'status', or speak to assistant..."
                  value={whatsappInput}
                  onChange={(e) => setWhatsappInput(e.target.value)}
                  style={{
                    flex: 1, background: 'white', border: 'none', borderRadius: '20px',
                    padding: '10px 16px', color: '#303030', fontSize: '13px', outline: 'none',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
                  }}
                />
                <button
                  type="submit"
                  disabled={sendingWhatsapp}
                  style={{
                    width: '38px', height: '38px', borderRadius: '50%', border: 'none',
                    background: '#075e54', color: 'white', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
                  }}
                >
                  <Send size={16} />
                </button>
              </form>

            </div>
          )}

          {/* 2. SMS SIMULATOR */}
          {activeTab === 'sms' && (
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <MessageSquare size={18} color="var(--secondary)" /> Basic SMS Gateway Simulator
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Citizens without smartphones can text grievances to shortcodes. The SMS Gateway forwards this payload via HTTP POST to our `/sms/intake` webhook.
              </p>

              <form onSubmit={handleSendSms} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>SENDER PHONE NUMBER</label>
                  <input
                    type="tel"
                    value={smsPhone}
                    onChange={(e) => setSmsPhone(e.target.value)}
                    style={{
                      background: 'var(--input-bg)', border: '1px solid var(--border-card)',
                      borderRadius: '8px', padding: '10px', color: 'var(--text-main)', fontSize: '13px'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>SMS BODY</label>
                  <textarea
                    rows={2}
                    value={smsBody}
                    onChange={(e) => setSmsBody(e.target.value)}
                    style={{
                      background: 'var(--input-bg)', border: '1px solid var(--border-card)',
                      borderRadius: '8px', padding: '10px', color: 'var(--text-main)', fontSize: '13px', resize: 'none'
                    }}
                    placeholder="e.g. REPORT Roads Pothole on main lane"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingSms}
                  style={{
                    border: 'none', background: 'var(--secondary)', color: 'white',
                    padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  {sendingSms ? (
                    <><Loader2 size={16} className="animate-spin" /> Transmitting...</>
                  ) : (
                    <><Send size={16} /> Send SMS</>
                  )}
                </button>
              </form>

              {/* Gateway Response Message */}
              {smsReply && (
                <div style={{ marginTop: '10px', background: 'var(--input-bg)', border: '1px solid var(--border-card)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                    GATEWAY WEBHOOK RESPONSE (SENT BACK AS SMS TEXT):
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ background: 'var(--secondary)', color: 'white', padding: '8px 12px', borderRadius: '15px 15px 15px 0', fontSize: '13px', maxWidth: '85%' }}>
                      {smsReply}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* How it works info card */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--text-main)', margin: 0 }}>How the sync logic works:</h3>
            <ul style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Local buffering</strong>: Submissions made while offline write directly to LocalStorage to ensure zero citizen data loss.</li>
              <li><strong>Auto Sync Recovery</strong>: Toggling simulated connection back to online automatically flushes the local array queue to the backend.</li>
              <li><strong>Idempotency</strong>: Every synced item sends its pre-generated client UUID. If the server already contains that ID, it skips duplicate writes—saving database health.</li>
            </ul>
          </div>


        </div>

      </div>

    </div>
  );
};

export default AppSimulator;
