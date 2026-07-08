import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import { MapContainer, TileLayer, Popup, Marker, CircleMarker } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import { ArrowLeft, Brain, ThumbsUp, Sliders } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';
import 'leaflet/dist/leaflet.css';

// Pydantic Schema interfaces
interface GridOfficer {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar_url: string;
  is_active: boolean;
  ward_id: number;
  active_cases: number;
}

interface Suggestion {
  id: string;
  content: string;
  english_translation?: string;
  category?: string;
  priority_score: number;
  status: string;
  dispatch_status: string;
  latitude?: number;
  longitude?: number;
  sentiment?: string;
}

interface ProposedProject {
  id: number;
  title: string;
  description?: string;
  category: string;
  target_ward_id?: number;
  estimated_cost: number;
  priority_score: number;
  supporting_suggestions_count: number;
  ai_justification?: string;
  status: string;
}

const MAP_CENTER: LatLngExpression = [12.9716, 77.5946];

// Colors matching each grid ward (glassy background color tokens)
const WARD_COLORS = {
  1: '#f97316', // Saffron
  2: '#22c55e', // India Green
  3: '#3b82f6', // Cobalt Blue
  4: '#a855f7'  // Amethyst
};

const MOCK_OFFICERS: GridOfficer[] = [
  {
    id: 1,
    name: "Arjun Mehta",
    email: "arjun.mehta@civicpulse.gov",
    phone: "+91-98765-43210",
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    is_active: true,
    ward_id: 1,
    active_cases: 3
  },
  {
    id: 2,
    name: "Priya Sharma",
    email: "priya.sharma@civicpulse.gov",
    phone: "+91-98765-43211",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    is_active: true,
    ward_id: 2,
    active_cases: 6
  },
  {
    id: 3,
    name: "Rohan Das",
    email: "rohan.das@civicpulse.gov",
    phone: "+91-98765-43212",
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    is_active: true,
    ward_id: 3,
    active_cases: 1
  },
  {
    id: 4,
    name: "Anjali Nair",
    email: "anjali.nair@civicpulse.gov",
    phone: "+91-98765-43213",
    avatar_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
    is_active: true,
    ward_id: 4,
    active_cases: 4
  }
];

const MOCK_PROJECTS: ProposedProject[] = [
  {
    id: 1,
    title: "Ward 1 Water Pipe Restoration",
    description: "Systemic leak repair of main water distribution pipe in Ward 1 district to restore stable daily supply.",
    category: "Water",
    estimated_cost: 350000,
    priority_score: 82,
    supporting_suggestions_count: 14,
    status: "Proposed"
  },
  {
    id: 2,
    title: "Pothole Filling & Tarring - Market Road",
    description: "Re-paving of the central commercial corridor to prevent water logging and vehicle wear.",
    category: "Roads",
    estimated_cost: 180000,
    priority_score: 75,
    supporting_suggestions_count: 9,
    status: "Proposed"
  }
];

const MOCK_SUGGESTIONS: Suggestion[] = [
  {
    id: "s1",
    content: "Potholes are very deep near the market corner, causing constant traffic jams.",
    category: "Roads",
    priority_score: 78,
    status: "Submitted",
    dispatch_status: "Unassigned",
    latitude: 12.972,
    longitude: 77.595
  },
  {
    id: "s2",
    content: "Street lights are completely off on 4th cross road, unsafe for women walking home.",
    category: "Safety",
    priority_score: 85,
    status: "Submitted",
    dispatch_status: "Unassigned",
    latitude: 12.975,
    longitude: 77.591
  }
];

interface ParticipateProps {
  activeApp?: 'hub' | 'fixmystreet' | 'decidim' | 'cpgrams' | 'seeclickfix' | 'ushahidi' | 'hotline' | 'grid' | 'citybrain' | 'mailbox';
}

const Participate: React.FC<ParticipateProps> = ({ activeApp = 'hub' }) => {
  const navigate = useNavigate();
  useAuth();
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  // Theme-aware CARTO basemap (was hardcoded to dark).
  const tileUrl = `https://{s}.basemaps.cartocdn.com/${theme === 'light' ? 'light_all' : 'dark_all'}/{z}/{x}/{y}{r}.png`;

  const [officers, setOfficers] = useState<GridOfficer[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [projects, setProjects] = useState<ProposedProject[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncMsg, setSyncMsg] = useState<string>('');

  // 1. FixMyStreet State
  const [fmsContent, setFmsContent] = useState('');
  const [fmsPhone, setFmsPhone] = useState('');
  const [fmsCoords] = useState<[number, number]>([12.9716, 77.5946]);

  // 2. Decidim State
  const [votedProjects, setVotedProjects] = useState<Record<number, boolean>>({});

  // 3. CPGRAMS State
  const [cpgText, setCpgText] = useState('');
  const [cpgResult, setCpgResult] = useState<any>(null);

  // 8. City Brain State
  const [cityBrainAlerts, setCityBrainAlerts] = useState<Array<{ id: number; msg: string; type: string; grid: number }>>([
    { id: 1, msg: 'Water Flow rate optimal in Sector A', type: 'info', grid: 1 },
    { id: 2, msg: 'Traffic density normal near Market junction', type: 'info', grid: 1 }
  ]);
  const [brainProcessing, setBrainProcessing] = useState(false);

  // 9. Mailbox State
  const [mailContent, setMailContent] = useState('');
  const [mailBoxItems, setMailBoxItems] = useState<Array<{ id: number; text: string; date: string; reply?: string }>>([
    { id: 1, text: "We need a local solar charging hub in Ward 3's community park.", date: "2026-07-06" }
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const officersRes = await apiClient.get<GridOfficer[]>('/api/v1/grid/officers');
      setOfficers(officersRes.data.length > 0 ? officersRes.data : MOCK_OFFICERS);

      const suggestionsRes = await apiClient.get<Suggestion[]>('/api/v1/suggestions/');
      setSuggestions(suggestionsRes.data.length > 0 ? suggestionsRes.data : MOCK_SUGGESTIONS);

      const projectsRes = await apiClient.get<ProposedProject[]>('/api/v1/projects/');
      setProjects(projectsRes.data.length > 0 ? projectsRes.data : MOCK_PROJECTS);
    } catch (err) {
      console.error("Error synchronizing command data:", err);
      setOfficers(MOCK_OFFICERS);
      setSuggestions(MOCK_SUGGESTIONS);
      setProjects(MOCK_PROJECTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 1. FixMyStreet Report Submission
  const handleFmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fmsContent) return;
    setLoading(true);
    try {
      await apiClient.post('/api/v1/suggestions/', {
        content: fmsContent,
        citizen_phone: fmsPhone,
        latitude: fmsCoords[0],
        longitude: fmsCoords[1],
        language_code: 'en'
      });
      setSyncMsg('Report submitted and auto-routed to local Grid Officer!');
      setFmsContent('');
      setFmsPhone('');
      fetchData();
      setTimeout(() => setSyncMsg(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Decidim Project Upvote
  const handleDecidimUpvote = (projectId: number) => {
    if (votedProjects[projectId]) return;
    setVotedProjects(prev => ({ ...prev, [projectId]: true }));
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return { ...p, supporting_suggestions_count: p.supporting_suggestions_count + 1 };
      }
      return p;
    }));
    setSyncMsg('Vote recorded! Project prioritization weighting updated.');
    setTimeout(() => setSyncMsg(''), 3000);
  };

  // 3. CPGRAMS AI Grievance Classification
  const handleCpgAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpgText) return;
    setLoading(true);
    try {
      const res = await apiClient.post<Suggestion>('/api/v1/suggestions/', {
        content: cpgText,
        citizen_phone: '+919000000000',
        latitude: 12.9716,
        longitude: 77.5946,
        language_code: 'en'
      });
      setCpgResult({
        category: res.data.category || 'General',
        priority_score: res.data.priority_score,
        sentiment: res.data.sentiment || 'Neutral',
        english: res.data.english_translation || res.data.content
      });
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 6. 12345 Hotline Dispatch Action
  const [selectedOfficer, setSelectedOfficer] = useState<Record<string, number>>({});
  const handleHotlineDispatch = async (suggestionId: string) => {
    const officerId = selectedOfficer[suggestionId];
    if (!officerId) return;
    setLoading(true);
    try {
      await apiClient.post('/api/v1/grid/dispatch', {
        suggestion_id: suggestionId,
        officer_id: Number(officerId)
      });
      setSyncMsg('Suggestion dispatched to grid representative successfully.');
      fetchData();
      setTimeout(() => setSyncMsg(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 8. City Brain Emergency Simulator
  const triggerCityBrainSim = () => {
    setBrainProcessing(true);
    setCityBrainAlerts(prev => [
      { id: Date.now(), msg: 'CRITICAL: Water pressure dropped in Grid 2 (Pipeline leak)', type: 'error', grid: 2 },
      ...prev
    ]);
    
    setTimeout(() => {
      setCityBrainAlerts(prev => [
        { id: Date.now() + 1, msg: 'City Brain Dispatch: Plumber team dispatched to Grid 2', type: 'dispatch', grid: 2 },
        ...prev
      ]);
      setBrainProcessing(false);
      setSyncMsg('City Brain automated dispatch coordinated successfully.');
      setTimeout(() => setSyncMsg(''), 3000);
    }, 2000);
  };

  // 9. Mailbox Submit
  const handleMailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mailContent) return;
    setMailBoxItems(prev => [
      { id: Date.now(), text: mailContent, date: new Date().toISOString().split('T')[0] },
      ...prev
    ]);
    setMailContent('');
    setSyncMsg('Message delivered directly to MP inbox!');
    setTimeout(() => setSyncMsg(''), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Dynamic Sync Banner */}
      {syncMsg && (
        <div style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', padding: '12px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, zIndex: 1000, position: 'sticky', top: '10px' }}>
          {syncMsg}
        </div>
      )}

      {/* ========================================================= */}
      {/* GLOBAL CIVIC TECH HUB MAIN PAGE */}
      {/* ========================================================= */}
      {activeApp === 'hub' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '30%', background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.05))', pointerEvents: 'none' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <Sliders size={28} color="var(--primary)" />
              <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '24px' }}>
                Participate: Civic Innovation Portal
              </h1>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5 }}>
              Launch an interactive utility below. Each section represents a modern citizen-engagement interface, automated AI routing engine, or smart city coordination simulator.
            </p>
          </div>

          {/* 3x3 Grid of Platforms */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            
            {/* Card 1: StreetMapper */}
            <div className="glass-panel transition-all hover-glow" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>CIVIC PULSE</span>
                <span className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--primary)' }}>Geospatial</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>StreetMapper</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Map-based report system. Drop a coordinates pin to report infrastructure damage with auto-routing to grid officers.
              </p>
              <button onClick={() => navigate('/participate/streetmapper')} className="btn btn-primary" style={{ marginTop: 'auto', width: '100%' }}>
                Open Platform
              </button>
            </div>

            {/* Card 2: CivicFund */}
            <div className="glass-panel transition-all hover-glow" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>CIVIC PULSE</span>
                <span className="badge" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>Budgeting</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>CivicFund</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Participatory budget and policy support center. Citizens support proposals and influence project sanctions.
              </p>
              <button onClick={() => navigate('/participate/civicfund')} className="btn btn-primary" style={{ marginTop: 'auto', width: '100%' }}>
                Open Platform
              </button>
            </div>

            {/* Card 3: Aegis AI Redress */}
            <div className="glass-panel transition-all hover-glow" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>CIVIC PULSE</span>
                <span className="badge" style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--saffron)' }}>AI Redressal</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Aegis AI Redress</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Centralized grievance tracker. Submissions are classified, translated, and scored for priority by Gemini AI.
              </p>
              <button onClick={() => navigate('/participate/aegis-ai')} className="btn btn-primary" style={{ marginTop: 'auto', width: '100%' }}>
                Open Platform
              </button>
            </div>

            {/* Card 4: CivicTimeline */}
            <div className="glass-panel transition-all hover-glow" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>CIVIC PULSE</span>
                <span className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--primary)' }}>Issue Tracking</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>CivicTimeline</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Community ticket timeline. Track status changes {"(Submitted → Dispatched → Resolved)"} and review public analytics.
              </p>
              <button onClick={() => navigate('/participate/civictimeline')} className="btn btn-primary" style={{ marginTop: 'auto', width: '100%' }}>
                Open Platform
              </button>
            </div>

            {/* Card 5: Hotspot Tracker */}
            <div className="glass-panel transition-all hover-glow" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>CIVIC PULSE</span>
                <span className="badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Crisis Map</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Hotspot Tracker</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Crowdsourced incident locator. Heatmaps highlight active grievances and pinpoint infrastructure distress hotspots.
              </p>
              <button onClick={() => navigate('/participate/hotspot-tracker')} className="btn btn-primary" style={{ marginTop: 'auto', width: '100%' }}>
                Open Platform
              </button>
            </div>

            {/* Card 6: Command Dispatch */}
            <div className="glass-panel transition-all hover-glow" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>CIVIC PULSE</span>
                <span className="badge" style={{ background: 'rgba(168,85,247,0.1)', color: 'var(--primary)' }}>Unified Dispatch</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Command Dispatch</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Unified admin dispatch board. Review reports and allocate tasks directly to local grid managers in real-time.
              </p>
              <button onClick={() => navigate('/participate/command-dispatch')} className="btn btn-primary" style={{ marginTop: 'auto', width: '100%' }}>
                Open Platform
              </button>
            </div>

            {/* Card 7: Sector Directory */}
            <div className="glass-panel transition-all hover-glow" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>CIVIC PULSE</span>
                <span className="badge" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>Grid Network</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Sector Directory</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Grid officer roster. Review local representative contacts, emails, assigned sectors, and active workload monitors.
              </p>
              <button onClick={() => navigate('/participate/sector-directory')} className="btn btn-primary" style={{ marginTop: 'auto', width: '100%' }}>
                Open Platform
              </button>
            </div>

            {/* Card 8: CityPulse IoT */}
            <div className="glass-panel transition-all hover-glow" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>CIVIC PULSE</span>
                <span className="badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>IoT Brain</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>CityPulse IoT</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Real-time smart city dashboard simulator. Monitors utility loads and coordinates emergency department alerts.
              </p>
              <button onClick={() => navigate('/participate/citypulse-iot')} className="btn btn-primary" style={{ marginTop: 'auto', width: '100%' }}>
                Open Platform
              </button>
            </div>

            {/* Card 9: Constituency Mailbox */}
            <div className="glass-panel transition-all hover-glow" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>CIVIC PULSE</span>
                <span className="badge" style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--saffron)' }}>Mayor Mailbox</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Constituency Mailbox</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Direct consultation interface. Post long-term structural proposals and track planning replies from the MP.
              </p>
              <button onClick={() => navigate('/participate/constituency-mailbox')} className="btn btn-primary" style={{ marginTop: 'auto', width: '100%' }}>
                Open Platform
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. STREETMAPPER VIEW */}
      {/* ========================================================= */}
      {activeApp === 'fixmystreet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <button onClick={() => navigate('/participate')} className="btn btn-secondary" style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back to Hub
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: '20px' }}>
            {/* Map selection */}
            <div className="glass-panel" style={{ height: isMobile ? '320px' : '480px', padding: 0, position: 'relative', overflow: 'hidden' }}>
              <MapContainer center={MAP_CENTER} zoom={14} style={{ width: '100%', height: '100%' }}>
                <TileLayer key={theme} url={tileUrl} />
                <Marker position={fmsCoords} />
              </MapContainer>
              <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'var(--bg-card)', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', zIndex: 100, border: '1px solid var(--border-card)' }}>
                📍 Coordinates: {fmsCoords[0].toFixed(5)}, {fmsCoords[1].toFixed(5)}
              </div>
            </div>

            {/* Form */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>StreetMapper Geospatial Reporter</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Point out the pothole or infrastructure issue. We will automatically route it to the grid.
              </p>

              <form onSubmit={handleFmsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Describe the issue</label>
                  <textarea 
                    value={fmsContent}
                    onChange={(e) => setFmsContent(e.target.value)}
                    placeholder="E.g., Pothole near Central Market main gate..."
                    style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', border: '1px solid var(--border-card)', padding: '8px 12px', borderRadius: '8px', outline: 'none', height: '100px', fontSize: '13px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Your phone number</label>
                  <input 
                    value={fmsPhone}
                    onChange={(e) => setFmsPhone(e.target.value)}
                    placeholder="+91-98765-XXXXX"
                    style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', border: '1px solid var(--border-card)', padding: '8px 12px', borderRadius: '8px', outline: 'none', fontSize: '13px' }}
                  />
                </div>
                
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                  File StreetMapper Report
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. CIVICFUND VIEW */}
      {/* ========================================================= */}
      {activeApp === 'decidim' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <button onClick={() => navigate('/participate')} className="btn btn-secondary" style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back to Hub
          </button>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>CivicFund Participatory Budgeting</h2>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Support development projects proposed for your constituency. Upvotes affect the prioritization scoring metric directly.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
              {projects.map(project => (
                <div key={project.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>{project.category}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>Est: ₹{project.estimated_cost.toLocaleString()}</span>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '15px' }}>{project.title}</h4>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {project.description}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ThumbsUp size={14} /> {project.supporting_suggestions_count} Supporters
                    </span>
                    <button 
                      onClick={() => handleDecidimUpvote(project.id)}
                      className={`btn ${votedProjects[project.id] ? 'btn-secondary' : 'btn-primary'}`}
                      style={{ padding: '6px 16px', fontSize: '12px' }}
                      disabled={votedProjects[project.id]}
                    >
                      {votedProjects[project.id] ? 'Supported' : 'Support Proposal'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. AEGIS AI REDRESS VIEW */}
      {/* ========================================================= */}
      {activeApp === 'cpgrams' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <button onClick={() => navigate('/participate')} className="btn btn-secondary" style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back to Hub
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>Aegis AI Redress Engine</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Submit a complaint in any language. The AI service will translate to English, predict the issue category, analyze sentiment, and compute a priority score.
              </p>

              <form onSubmit={handleCpgAnalyze} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <textarea 
                  value={cpgText}
                  onChange={(e) => setCpgText(e.target.value)}
                  placeholder="E.g., सड़कों पर बहुत पानी भरा हुआ है, जिससे लोगों का चलना मुश्किल हो गया है..."
                  style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', border: '1px solid var(--border-card)', padding: '12px', borderRadius: '8px', height: '140px', outline: 'none', fontSize: '13px' }}
                />
                <button type="submit" className="btn btn-primary" disabled={loading || !cpgText}>
                  Analyze Grievance
                </button>
              </form>
            </div>

            {/* Analysis Result Card */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {!cpgResult ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Brain size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p style={{ fontWeight: 600 }}>No Analysis Performed Yet</p>
                  <p style={{ fontSize: '12px' }}>Enter text on the left and submit.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>AI Classification Output</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>English Translation:</span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>{cpgResult.english}</p>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Predicted Category:</span>
                      <span style={{ fontWeight: 600 }}>{cpgResult.category}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Sentiment:</span>
                      <span style={{ fontWeight: 600, color: cpgResult.sentiment === 'Negative' ? '#ef4444' : '#22c55e' }}>
                        {cpgResult.sentiment}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Priority Rating:</span>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{cpgResult.priority_score}/100</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. CIVICTIMELINE VIEW */}
      {/* ========================================================= */}
      {activeApp === 'seeclickfix' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <button onClick={() => navigate('/participate')} className="btn btn-secondary" style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back to Hub
          </button>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>CivicTimeline Community Issue Board</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {suggestions.map(s => (
                <div key={s.id} style={{ padding: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: 'var(--text-main)' }}>{s.content}</h4>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>Category: {s.category || 'General'}</span>
                      <span>•</span>
                      <span>Priority: {s.priority_score}/100</span>
                    </div>
                  </div>
                  <span className="badge" style={{ 
                    background: s.status === 'Resolved' ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)',
                    color: s.status === 'Resolved' ? '#22c55e' : 'var(--primary)'
                  }}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. HOTSPOT TRACKER VIEW */}
      {/* ========================================================= */}
      {activeApp === 'ushahidi' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <button onClick={() => navigate('/participate')} className="btn btn-secondary" style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back to Hub
          </button>

          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '18px' }}>Hotspot Tracker Map</h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                Glowing circular markers highlight regions with the highest density of unresolved citizen grievances.
              </p>
            </div>

            <div style={{ height: isMobile ? '320px' : '480px', borderRadius: '8px', overflow: 'hidden' }}>
              <MapContainer center={MAP_CENTER} zoom={14} style={{ width: '100%', height: '100%' }}>
                <TileLayer key={theme} url={tileUrl} />
                
                {suggestions.filter(s => s.latitude && s.longitude).map(s => {
                  const lat = Number(s.latitude);
                  const lng = Number(s.longitude);
                  const radius = s.priority_score > 70 ? 25 : 12;
                  return (
                    <CircleMarker 
                      key={s.id}
                      center={[lat, lng]}
                      radius={radius}
                      pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.45, weight: 1 }}
                    >
                      <Popup>
                        <div style={{ color: 'black' }}>
                          <strong>Complaint:</strong> {s.content}<br/>
                          <strong>Priority:</strong> {s.priority_score}/100
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. COMMAND DISPATCH VIEW */}
      {/* ========================================================= */}
      {activeApp === 'hotline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <button onClick={() => navigate('/participate')} className="btn btn-secondary" style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back to Hub
          </button>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>Command Dispatch Console</h2>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Administrators review incoming grievances and route accountability directly to local grid managers.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {suggestions.filter(s => s.dispatch_status === 'Unassigned' || !s.dispatch_status).map(issue => (
                <div key={issue.id} style={{ padding: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-card)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ margin: 0, fontSize: '14px' }}>{issue.content}</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Route to Officer:</span>
                      <select 
                        value={selectedOfficer[issue.id] || ''}
                        onChange={(e) => setSelectedOfficer(prev => ({ ...prev, [issue.id]: Number(e.target.value) }))}
                        style={{ background: 'var(--bg-app)', color: 'var(--text-main)', border: '1px solid var(--border-card)', padding: '6px', borderRadius: '6px', fontSize: '12px' }}
                      >
                        <option value="">-- Choose Officer --</option>
                        {officers.map(o => (
                          <option key={o.id} value={o.id}>{o.name} (Ward {o.ward_id})</option>
                        ))}
                      </select>
                    </div>

                    <button 
                      onClick={() => handleHotlineDispatch(issue.id)}
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '12px' }}
                      disabled={!selectedOfficer[issue.id] || loading}
                    >
                      Dispatch Ticket
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. SECTOR DIRECTORY VIEW */}
      {/* ========================================================= */}
      {activeApp === 'grid' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <button onClick={() => navigate('/participate')} className="btn btn-secondary" style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back to Hub
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {officers.map(officer => {
              const color = WARD_COLORS[officer.ward_id as keyof typeof WARD_COLORS] || 'var(--primary)';
              return (
                <div key={officer.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: color }}></div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <img src={officer.avatar_url} alt={officer.name} style={{ width: '50px', height: '50px', borderRadius: '50%', border: `2px solid ${color}`, objectFit: 'cover' }} />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px' }}>{officer.name}</h4>
                      <span style={{ fontSize: '11px', color: color, fontWeight: 700 }}>WARD {officer.ward_id} MANAGER</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>📞 {officer.phone}</div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✉️ {officer.email}</div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                      <span>Active cases load</span>
                      <span>{officer.active_cases} open</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(officer.active_cases / 10) * 100}%`, background: color }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8. CITYPULSE IoT VIEW */}
      {/* ========================================================= */}
      {activeApp === 'citybrain' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <button onClick={() => navigate('/participate')} className="btn btn-secondary" style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back to Hub
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '18px' }}>CityPulse IoT Event Monitor</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                  Simulates automated coordination dispatches when infrastructure drops occur.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-card)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Water Flow Rate</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, margin: '6px 0', color: '#22c55e' }}>92%</div>
                  <span style={{ fontSize: '10px', color: '#22c55e' }}>● Stable</span>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-card)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Traffic Speed Avg</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, margin: '6px 0', color: 'var(--saffron)' }}>34 km/h</div>
                  <span style={{ fontSize: '10px', color: 'var(--saffron)' }}>● Delayed</span>
                </div>
              </div>

              <button 
                onClick={triggerCityBrainSim} 
                className="btn btn-primary"
                disabled={brainProcessing}
              >
                {brainProcessing ? 'Processing Alert...' : 'Simulate IoT Infrastructure Alert'}
              </button>
            </div>

            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Dispatch Logs</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '340px' }}>
                {cityBrainAlerts.map(alert => (
                  <div key={alert.id} style={{ 
                    padding: '10px 12px', 
                    borderRadius: '6px', 
                    fontSize: '12px',
                    border: '1px solid var(--border-card)',
                    background: alert.type === 'error' ? 'rgba(239,68,68,0.1)' : 
                               alert.type === 'dispatch' ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)',
                    color: alert.type === 'error' ? '#ef4444' : 
                           alert.type === 'dispatch' ? 'var(--primary)' : 'var(--text-muted)'
                  }}>
                    {alert.msg}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 9. CONSTITUENCY MAILBOX VIEW */}
      {/* ========================================================= */}
      {activeApp === 'mailbox' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <button onClick={() => navigate('/participate')} className="btn btn-secondary" style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back to Hub
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>Constituency Mailbox Manager</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Suggest long-term structural or policy adjustments. The MP team reviews mailboxes periodically.
              </p>

              <form onSubmit={handleMailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <textarea 
                  value={mailContent}
                  onChange={(e) => setMailContent(e.target.value)}
                  placeholder="Type your development suggestion..."
                  style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', border: '1px solid var(--border-card)', padding: '12px', borderRadius: '8px', height: '140px', outline: 'none', fontSize: '13px' }}
                />
                <button type="submit" className="btn btn-primary" disabled={!mailContent}>
                  Deliver to MP Mailbox
                </button>
              </form>
            </div>

            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Mailbox History & Answers</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '340px' }}>
                {mailBoxItems.map(item => (
                  <div key={item.id} style={{ padding: '14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-card)', fontSize: '13px' }}>
                    <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>{item.text}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Filed on {item.date}</div>
                    
                    <div style={{ marginTop: '10px', background: 'rgba(59,130,246,0.05)', padding: '8px', borderRadius: '4px', borderLeft: '3px solid var(--primary)', fontSize: '12px', color: 'var(--text-main)' }}>
                      <strong>MP Reply:</strong> Under consideration for next financial year sanction list.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Participate;
