import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import { MapContainer, TileLayer, Popup, Marker, CircleMarker } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import { ArrowLeft, Brain, ThumbsUp, Sliders, Search, Filter, MapPin, MessageSquare, Send, Activity, PlusCircle, ArrowUpDown, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const CATEGORIES = [
  "Water",
  "Roads",
  "Education",
  "Health",
  "Sanitation",
  "Public Spaces",
  "Electricity",
  "Safety"
];

// Pydantic Schema interfaces
interface WardOfficer {
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
  ward_id?: number;
  assigned_officer_id?: number;
  image_url?: string;
  audio_url?: string;
  created_at?: string;
  updated_at?: string;
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

const MOCK_OFFICERS: WardOfficer[] = [
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

const DUMMY_SUGGESTIONS: Suggestion[] = [
  {
    id: "s_mock_1",
    content: "Major drainage overflow causing contamination near primary school sector.",
    category: "Sanitation",
    priority_score: 92,
    status: "Resolved",
    dispatch_status: "Resolved",
    latitude: 12.973,
    longitude: 77.593,
    image_url: "/images/bfr_aft/bfr6.webp"
  },
  {
    id: "s_mock_2",
    content: "Dumped garbage and broken park benches in community footpath.",
    category: "Public Spaces",
    priority_score: 45,
    status: "Resolved",
    dispatch_status: "Resolved",
    latitude: 12.970,
    longitude: 77.596,
    image_url: "/images/bfr_aft/bfr2.jpg"
  },
  {
    id: "s_mock_3",
    content: "Hanging loose electrical wires posing hazard near apartment entrance.",
    category: "Electricity",
    priority_score: 88,
    status: "Resolved",
    dispatch_status: "Resolved",
    latitude: 12.974,
    longitude: 77.592,
    image_url: "/images/bfr_aft/bfr8.webp"
  },
  {
    id: "s_mock_4",
    content: "Deep potholes on the main junction leading to major traffic congestion.",
    category: "Roads",
    priority_score: 79,
    status: "Resolved",
    dispatch_status: "Resolved",
    latitude: 12.976,
    longitude: 77.597,
    image_url: "/images/bfr_aft/bfr9.webp"
  },
  {
    id: "s_mock_5",
    content: "Garbage pile-up near commercial market blocking public walkway.",
    category: "Sanitation",
    priority_score: 65,
    status: "Resolved",
    dispatch_status: "Resolved",
    latitude: 12.971,
    longitude: 77.594,
    image_url: "/images/bfr_aft/bfr5.jpg"
  },
  {
    id: "s2",
    content: "Street lights are completely off on 4th cross road, unsafe for women walking home.",
    category: "Safety",
    priority_score: 85,
    status: "Resolved",
    dispatch_status: "Resolved",
    latitude: 12.975,
    longitude: 77.591,
    image_url: "/images/bfr_aft/bfr7.webp"
  },
  {
    id: "s_mock_6",
    content: "Piled up garbage since one week, causing sanitation issue",
    category: "Sanitation",
    priority_score: 80,
    status: "Resolved",
    dispatch_status: "Resolved",
    latitude: 12.9725,
    longitude: 77.6015,
    image_url: "/images/bfr_aft/bfr1.jpg"
  }
];

const MOCK_SUGGESTIONS: Suggestion[] = [];

interface ParticipateProps {
  activeApp?: 'hub' | 'fixmystreet' | 'decidim' | 'cpgrams' | 'seeclickfix' | 'ushahidi' | 'hotline' | 'ward' | 'citybrain' | 'mailbox';
}

const Participate: React.FC<ParticipateProps> = ({ activeApp = 'hub' }) => {
  const navigate = useNavigate();
  useAuth();

  const [officers, setOfficers] = useState<WardOfficer[]>([]);
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

  // 4. CivicTimeline SeeClickFix State
  const [timelineCategory, setTimelineCategory] = useState('All');
  const [timelineStatus, setTimelineStatus] = useState('All');
  const [timelineSearch, setTimelineSearch] = useState('');
  const [timelineSort, setTimelineSort] = useState('newest');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [localUpvotes, setLocalUpvotes] = useState<Record<string, number>>({});
  const [upvotedIssues, setUpvotedIssues] = useState<Record<string, boolean>>({});

  const [issueComments, setIssueComments] = useState<Record<string, Array<{ id: number; author: string; text: string; date: string; isOfficer?: boolean }>>>({

    's2': [
      { id: 1, author: 'System Dispatch', text: 'Ticket registered. Waiting for assignment to local ward electricity unit.', date: '2026-07-07' },
      { id: 2, author: 'System', text: '✅ RESOLUTION: Street lights repaired and power supply restored.', date: '2026-07-08', isOfficer: true }
    ],
    's_mock_1': [
      { id: 1, author: 'Citizen', text: 'Water is leaking out of the drain and flooding the primary school entrance.', date: '2026-07-05' },
      { id: 2, author: 'Arjun Mehta', text: 'Sewerage department cleaning crew has cleared the blockage and repaired the cracked duct.', date: '2026-07-06', isOfficer: true },
      { id: 3, author: 'System', text: '✅ RESOLUTION: Issue resolved and verified by representative.', date: '2026-07-07', isOfficer: true }
    ],
    's_mock_2': [
      { id: 1, author: 'Citizen', text: 'The playground benches are completely broken and unusable.', date: '2026-07-05' },
      { id: 2, author: 'Priya Sharma', text: 'Carpenter team has replaced the damaged wooden planks and painted the benches.', date: '2026-07-07', isOfficer: true }
    ],
    's_mock_3': [
      { id: 1, author: 'Citizen', text: 'Electrical wire is hanging dangerously low after the storm.', date: '2026-07-06' },
      { id: 2, author: 'Rohan Das', text: 'Electricity board technician has safely re-tensioned the cable and cleared the hazard.', date: '2026-07-07', isOfficer: true }
    ],
    's_mock_4': [
      { id: 1, author: 'Citizen', text: 'Potholes are causing severe traffic delays here.', date: '2026-07-05' },
      { id: 2, author: 'Anjali Nair', text: 'Road tarring crew has leveled the potholes and applied fresh asphalt patch.', date: '2026-07-07', isOfficer: true }
    ],
    's_mock_5': [
      { id: 1, author: 'Citizen', text: 'Massive pile of trash accumulated, blocking the entire pedestrian path.', date: '2026-07-05' },
      { id: 2, author: 'Priya Sharma', text: 'Sanitation department waste collection vehicle has cleared the trash pile and sanitized the area.', date: '2026-07-06', isOfficer: true }
    ],
    's_mock_6': [
      { id: 1, author: 'Citizen', text: 'Drain is clogged with plastic bags and silt near school gates.', date: '2026-07-05' },
      { id: 2, author: 'Arjun Mehta', text: 'Drainage clearing team has removed the garbage blockages and flushed the pipe.', date: '2026-07-07', isOfficer: true }
    ]
  });
  const [newCommentText, setNewCommentText] = useState('');

  // Ticket reporting modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [newReportText, setNewReportText] = useState('');
  const [newReportCategory, setNewReportCategory] = useState('Water');
  const [newReportWard, setNewReportWard] = useState(1);

  // Before/After evidence states
  const [resolvedImages, setResolvedImages] = useState<Record<string, string>>({});
  const [isResolving, setIsResolving] = useState(false);
  const [resolveImagePreview, setResolveImagePreview] = useState<string | null>(null);
  const [resolveCommentText, setResolveCommentText] = useState('');

  // Image states for the new report modal
  const [reportImageFile, setReportImageFile] = useState<File | null>(null);
  const [reportImagePreview, setReportImagePreview] = useState<string | null>(null);

  const handleReportImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReportImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReportImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResolveImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setResolveImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResolveSubmit = (issueId: string, assignedOfficerName: string) => {
    // Update local suggestion
    setSuggestions(prev => prev.map(s => {
      if (s.id === issueId) {
        return { ...s, status: 'Resolved', dispatch_status: 'Resolved' };
      }
      return s;
    }));

    // Save image if uploaded
    if (resolveImagePreview) {
      setResolvedImages(prev => ({ ...prev, [issueId]: resolveImagePreview }));
    }

    // Append resolution note to activity feed
    const noteText = resolveCommentText.trim() || 'Work completed and verified.';
    const newComment = {
      id: Date.now(),
      author: assignedOfficerName || 'Ward Officer',
      text: `✅ RESOLUTION: ${noteText}`,
      date: new Date().toISOString().split('T')[0],
      isOfficer: true
    };
    setIssueComments(prev => ({
      ...prev,
      [issueId]: [...(prev[issueId] || []), newComment]
    }));

    // Reset state
    setResolveImagePreview(null);
    setResolveCommentText('');
    setIsResolving(false);
    setSyncMsg('Issue resolved successfully! Timeline updated.');
    setTimeout(() => setSyncMsg(''), 3000);
  };

  const handleTimelineReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReportText) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('content', newReportText);
    formData.append('citizen_phone', '+919999999999');
    formData.append('latitude', String(MAP_CENTER[0] + (Math.random() - 0.5) * 0.02));
    formData.append('longitude', String(MAP_CENTER[1] + (Math.random() - 0.5) * 0.02));
    formData.append('language_code', 'en');
    formData.append('constituency_id', '1');
    formData.append('category', newReportCategory);
    if (reportImageFile) {
      formData.append('image', reportImageFile, reportImageFile.name);
    }

    try {
      await apiClient.post<Suggestion>('/api/v1/suggestions/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSyncMsg('Issue successfully reported and added to CivicTimeline!');
      setNewReportText('');
      setReportImageFile(null);
      setReportImagePreview(null);
      setShowReportModal(false);
      fetchData();
      setTimeout(() => setSyncMsg(''), 4000);
    } catch (err) {
      console.error(err);
      const mockNew: Suggestion = {
        id: 's_' + Date.now(),
        content: newReportText,
        category: newReportCategory,
        priority_score: 55,
        status: 'Submitted',
        dispatch_status: 'Unassigned',
        latitude: MAP_CENTER[0] + (Math.random() - 0.5) * 0.01,
        longitude: MAP_CENTER[1] + (Math.random() - 0.5) * 0.01,
        image_url: reportImagePreview || undefined
      };
      setSuggestions(prev => [mockNew, ...prev]);
      setSyncMsg('Issue added locally (Server offline fallback).');
      setNewReportText('');
      setReportImageFile(null);
      setReportImagePreview(null);
      setShowReportModal(false);
      setTimeout(() => setSyncMsg(''), 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = (suggestionId: string) => {
    if (!newCommentText.trim()) return;
    const newComment = {
      id: Date.now(),
      author: 'Citizen',
      text: newCommentText,
      date: new Date().toISOString().split('T')[0]
    };
    setIssueComments(prev => ({
      ...prev,
      [suggestionId]: [...(prev[suggestionId] || []), newComment]
    }));
    setNewCommentText('');
  };

  const handleTimelineUpvote = (suggestionId: string) => {
    if (upvotedIssues[suggestionId]) return;
    setUpvotedIssues(prev => ({ ...prev, [suggestionId]: true }));
    setLocalUpvotes(prev => ({ ...prev, [suggestionId]: (prev[suggestionId] || 0) + 1 }));
    setSyncMsg('Upvote registered! This boosts the priority of this issue.');
    setTimeout(() => setSyncMsg(''), 3000);
  };

  const getFilteredSuggestions = () => {
    return suggestions
      .filter(s => {
        const matchesCategory = timelineCategory === 'All' || s.category === timelineCategory;
        const matchesStatus = timelineStatus === 'All' || s.status === timelineStatus;
        const matchesSearch = s.content.toLowerCase().includes(timelineSearch.toLowerCase()) ||
          (s.english_translation && s.english_translation.toLowerCase().includes(timelineSearch.toLowerCase()));
        return matchesCategory && matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (timelineSort === 'priority') {
          return b.priority_score - a.priority_score;
        } else if (timelineSort === 'upvotes') {
          const upA = localUpvotes[a.id] || 0;
          const upB = localUpvotes[b.id] || 0;
          return upB - upA;
        } else {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          if (dateA && dateB) return dateB - dateA;
          return b.id.localeCompare(a.id);
        }
      });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch ward officers (public/auth)
      try {
        const officersRes = await apiClient.get<WardOfficer[]>('/api/v1/ward/officers');
        setOfficers(officersRes.data.length > 0 ? officersRes.data : MOCK_OFFICERS);
      } catch (e) {
        console.warn("Failed to fetch officers, using mock:", e);
        setOfficers(MOCK_OFFICERS);
      }

      // 2. Fetch suggestions (try authenticated suggestions first, fall back to public map suggestions)
      let loadedSuggestions: Suggestion[] = [];
      try {
        const suggestionsRes = await apiClient.get<Suggestion[]>('/api/v1/suggestions/?limit=500');
        if (suggestionsRes.data && suggestionsRes.data.length > 0) {
          loadedSuggestions = suggestionsRes.data;
        }
      } catch (e) {
        console.warn("Auth suggestions failed, trying public map suggestions:", e);
      }

      // If auth suggestions was empty or failed, load the 300 public map suggestions
      if (loadedSuggestions.length === 0) {
        try {
          const mapIssuesRes = await apiClient.get<any[]>('/api/v1/suggestions/map');
          if (mapIssuesRes.data && mapIssuesRes.data.length > 0) {
            loadedSuggestions = mapIssuesRes.data.map(item => ({
              ...item,
              dispatch_status: item.status === 'Resolved' ? 'Resolved' :
                item.status === 'Reviewed' || item.status === 'Processing' ? 'Dispatched' : 'Unassigned'
            }));
          }
        } catch (e) {
          console.error("Failed to fetch public map suggestions:", e);
        }
      }

      const baseSuggestions = loadedSuggestions.length > 0 ? loadedSuggestions : MOCK_SUGGESTIONS;
      const filteredBase = baseSuggestions.filter(
        baseItem => !DUMMY_SUGGESTIONS.some(dummyItem => dummyItem.id === baseItem.id)
      );
      setSuggestions([...DUMMY_SUGGESTIONS, ...filteredBase]);

      // 3. Fetch proposed projects
      try {
        const projectsRes = await apiClient.get<ProposedProject[]>('/api/v1/projects/');
        setProjects(projectsRes.data.length > 0 ? projectsRes.data : MOCK_PROJECTS);
      } catch (e) {
        console.warn("Failed to fetch projects, using mock:", e);
        setProjects(MOCK_PROJECTS);
      }

    } catch (err) {
      console.error("Error in synchronizing command data:", err);
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
      setSyncMsg('Report submitted and auto-routed to local Ward Officer!');
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
      await apiClient.post('/api/v1/ward/dispatch', {
        suggestion_id: suggestionId,
        officer_id: Number(officerId)
      });
      setSyncMsg('Suggestion dispatched to ward officer successfully.');
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
                Map-based report system. Drop a coordinates pin to report infrastructure damage with auto-routing to ward officers.
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
                Unified admin dispatch board. Review reports and allocate tasks directly to local ward officers in real-time.
              </p>
              <button onClick={() => navigate('/participate/command-dispatch')} className="btn btn-primary" style={{ marginTop: 'auto', width: '100%' }}>
                Open Platform
              </button>
            </div>

            {/* Card 7: Ward Directory */}
            <div className="glass-panel transition-all hover-glow" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>CIVIC PULSE</span>
                <span className="badge" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>Ward Committee Network</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Ward Directory</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Ward officer roster. Review local representative contacts, emails, assigned wards, and active workload monitors.
              </p>
              <button onClick={() => navigate('/participate/ward-directory')} className="btn btn-primary" style={{ marginTop: 'auto', width: '100%' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
            {/* Map selection */}
            <div className="glass-panel" style={{ height: '480px', padding: 0, position: 'relative', overflow: 'hidden' }}>
              <MapContainer center={MAP_CENTER} zoom={14} style={{ width: '100%', height: '100%' }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                <Marker position={fmsCoords} />
              </MapContainer>
              <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'var(--bg-card)', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', zIndex: 100, border: '1px solid var(--border-color)' }}>
                📍 Coordinates: {fmsCoords[0].toFixed(5)}, {fmsCoords[1].toFixed(5)}
              </div>
            </div>

            {/* Form */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>StreetMapper Geospatial Reporter</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Point out the pothole or infrastructure issue. We will automatically route it to the ward.
              </p>

              <form onSubmit={handleFmsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Describe the issue</label>
                  <textarea
                    value={fmsContent}
                    onChange={(e) => setFmsContent(e.target.value)}
                    placeholder="E.g., Pothole near Central Market main gate..."
                    style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '8px', outline: 'none', height: '100px', fontSize: '13px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Your phone number</label>
                  <input
                    value={fmsPhone}
                    onChange={(e) => setFmsPhone(e.target.value)}
                    placeholder="+91-98765-XXXXX"
                    style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '8px', outline: 'none', fontSize: '13px' }}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
                  style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px', height: '140px', outline: 'none', fontSize: '13px' }}
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
      {/* 4. CIVICTIMELINE VIEW (SEECLICKFIX) */}
      {/* ========================================================= */}
      {activeApp === 'seeclickfix' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Header Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <button onClick={() => navigate('/participate')} className="btn btn-secondary" style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowLeft size={16} /> Back to Hub
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <PlusCircle size={16} /> Report an Issue
            </button>
          </div>

          {/* Metric Overview Panels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Issues</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)' }}>{suggestions.length}</div>
            </div>
            <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Submitted (Under Review)</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>
                {suggestions.filter(s => s.status === 'Submitted' || s.status === 'Processing').length}
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Dispatched (In Progress)</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--saffron)' }}>
                {suggestions.filter(s => s.dispatch_status === 'Dispatched' || s.assigned_officer_id).length}
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Resolved</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e' }}>
                {suggestions.filter(s => s.status === 'Resolved').length}
              </div>
            </div>
          </div>

          {/* Search, Sort and Filter Toolbar */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 12px', flex: '1', minWidth: '240px' }}>
              <Search size={16} style={{ color: 'var(--text-muted)', opacity: 0.7 }} />
              <input
                type="text"
                value={timelineSearch}
                onChange={(e) => setTimelineSearch(e.target.value)}
                placeholder="Search issues or English translations..."
                style={{ background: 'none', border: 'none', color: 'var(--text-main)', width: '100%', outline: 'none', fontSize: '13px' }}
              />
              {timelineSearch && (
                <X size={14} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setTimelineSearch('')} />
              )}
            </div>

            {/* Filter selectors */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              {/* Category Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                <select
                  value={timelineCategory}
                  onChange={(e) => setTimelineCategory(e.target.value)}
                  style={{ background: 'var(--bg-app)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', outline: 'none' }}
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map((cat: string) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="General">General</option>
                </select>
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={14} style={{ color: 'var(--text-muted)' }} />
                <select
                  value={timelineStatus}
                  onChange={(e) => setTimelineStatus(e.target.value)}
                  style={{ background: 'var(--bg-app)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', outline: 'none' }}
                >
                  <option value="All">All Statuses</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Processing">Processing</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              {/* Sort selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowUpDown size={14} style={{ color: 'var(--text-muted)' }} />
                <select
                  value={timelineSort}
                  onChange={(e) => setTimelineSort(e.target.value)}
                  style={{ background: 'var(--bg-app)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', outline: 'none' }}
                >
                  <option value="newest">Newest First</option>
                  <option value="priority">Highest Priority</option>
                  <option value="upvotes">Most Supported</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main Board Layout (Split Panel) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '20px', alignItems: 'start' }}>

            {/* Left Column: Tickets List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '680px', overflowY: 'auto', paddingRight: '4px' }}>
              {getFilteredSuggestions().length === 0 ? (
                <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Search size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p style={{ fontWeight: 600, margin: 0 }}>No Matching Issues Found</p>
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>Try adjusting your search criteria or filters.</p>
                </div>
              ) : (
                getFilteredSuggestions().map(s => {
                  const supports = (localUpvotes[s.id] || 0);
                  const isUpvoted = upvotedIssues[s.id];
                  const hasComments = issueComments[s.id]?.length || 0;
                  const isSelected = selectedIssueId === s.id;

                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedIssueId(s.id)}
                      className={`glass-panel transition-all hover-glow`}
                      style={{
                        padding: '18px',
                        cursor: 'pointer',
                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                        background: isSelected ? 'rgba(59,130,246,0.03)' : 'rgba(255,255,255,0.02)'
                      }}
                    >


                      <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600, lineHeight: 1.4, color: 'var(--text-main)' }}>
                        {s.content}
                      </h4>
                      {s.english_translation && s.english_translation !== s.content && (
                        <p style={{ margin: '-6px 0 10px 0', fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                          📝 {s.english_translation}
                        </p>
                      )}

                      {/* Card Footer Info */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ThumbsUp size={12} color={isUpvoted ? 'var(--primary)' : 'currentColor'} /> {supports} supports
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MessageSquare size={12} /> {hasComments} comments
                          </span>
                        </div>
                        {s.ward_id && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={12} /> Ward {s.ward_id}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Column: Ticket Timeline & Details */}
            <div className="glass-panel" style={{ padding: '24px', position: 'sticky', top: '20px', minHeight: '480px', display: 'flex', flexDirection: 'column' }}>
              {(() => {
                const issue = suggestions.find(s => s.id === selectedIssueId);
                if (!issue) {
                  return (
                    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                      <Activity size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                      <h4 style={{ margin: 0, fontWeight: 600, fontSize: '16px' }}>Select an Issue</h4>
                      <p style={{ fontSize: '12px', marginTop: '6px', maxWidth: '280px' }}>
                        Select any reported ticket from the list to view its real-time workflow status, dispatch updates, and comments.
                      </p>
                    </div>
                  );
                }

                // Match assigned representative
                const assignedOfficer = officers.find(o => o.id === issue.assigned_officer_id) ||
                  (issue.ward_id ? officers.find(o => o.ward_id === issue.ward_id) : null);

                const comments = issueComments[issue.id] || [];
                const isUpvoted = upvotedIssues[issue.id];
                const upvoteCount = (localUpvotes[issue.id] || 0);

                // Define step states
                const stepDispatched = !!issue.assigned_officer_id || issue.dispatch_status === 'Dispatched';
                const stepResolved = issue.status === 'Resolved';

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: '1' }}>
                    <div>
                      <span className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--primary)', marginBottom: '8px' }}>
                        {issue.category || 'General'}
                      </span>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, lineHeight: 1.4 }}>{issue.content}</h3>
                    </div>

                    {/* Stepper Timeline Visualizer */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ticket Workflow Timeline</h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '24px' }}>
                        {/* Line connector */}
                        <div style={{ position: 'absolute', top: '8px', left: '7px', bottom: '8px', width: '2px', background: 'rgba(255,255,255,0.05)' }}></div>

                        {/* Step 1: Submitted */}
                        <div style={{ position: 'relative' }}>
                          <span style={{
                            position: 'absolute', left: '-22px', top: '3px', width: '12px', height: '12px', borderRadius: '50%',
                            background: '#22c55e', border: '2px solid var(--bg-card)'
                          }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Submitted & Prioritized</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Report registered at priority score **{issue.priority_score}/100**.
                          </div>
                        </div>

                        {/* Step 2: Dispatched */}
                        <div style={{ position: 'relative' }}>
                          <span style={{
                            position: 'absolute', left: '-22px', top: '3px', width: '12px', height: '12px', borderRadius: '50%',
                            background: stepDispatched ? 'var(--saffron)' : 'rgba(255,255,255,0.1)',
                            border: '2px solid var(--bg-card)'
                          }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, color: stepDispatched ? 'var(--text-main)' : 'var(--text-muted)' }}>
                            Dispatched to Ward Representative
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {stepDispatched ? (
                              <span>Assigned to Ward Officer **{assignedOfficer?.name}** for inspection.</span>
                            ) : (
                              <span>Awaiting dispatch queue allocation.</span>
                            )}
                          </div>
                        </div>

                        {/* Step 3: Resolved */}
                        <div style={{ position: 'relative' }}>
                          <span style={{
                            position: 'absolute', left: '-22px', top: '3px', width: '12px', height: '12px', borderRadius: '50%',
                            background: stepResolved ? '#22c55e' : 'rgba(255,255,255,0.1)',
                            border: '2px solid var(--bg-card)'
                          }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, color: stepResolved ? 'var(--text-main)' : 'var(--text-muted)' }}>
                            Resolution Verified
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {stepResolved ? (
                              <span style={{ color: '#22c55e', fontWeight: 600 }}>Resolved: Issue verified closed.</span>
                            ) : (
                              <span>Awaiting field execution and community sign-off.</span>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Before & After evidence block */}
                    {(() => {
                      const beforeImage = issue.image_url;

                      const categoryMockAfters: Record<string, string> = {
                        'Water': 'https://images.unsplash.com/photo-1542013936693-8848e574047a?w=400',
                        'Roads': 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=400',
                        'Education': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400',
                        'Health': 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400',
                        'Sanitation': 'https://images.unsplash.com/photo-1616963172089-a038f8cfc8d3?w=400',
                        'Safety': 'https://images.unsplash.com/photo-1508849789987-4e5333c12b78?w=400',
                        'Electricity': 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400',
                        'General': 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=400'
                      };

                      const dummyAfters: Record<string, string> = {
                        's_mock_1': '/images/bfr_aft/aft6.png',
                        's_mock_2': '/images/bfr_aft/aft2.jpg',
                        's_mock_3': '/images/bfr_aft/aft8.png',
                        's_mock_4': '/images/bfr_aft/aft9.png',
                        's_mock_5': '/images/bfr_aft/aft5.jpg',
                        's2': '/images/bfr_aft/aft7.png',
                        's_mock_6': '/images/bfr_aft/aft1.jpg',
                      };

                      const afterImage = resolvedImages[issue.id] || dummyAfters[issue.id] || categoryMockAfters[issue.category || 'General'];

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Resolution Evidence (Before / After)</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {/* Before Image */}
                            <div className="glass-panel" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.01)' }}>
                              <div style={{ height: '90px', borderRadius: '4px', overflow: 'hidden', background: 'rgba(0,0,0,0.2)', position: 'relative' }}>
                                {beforeImage ? (
                                  <img src={beforeImage} alt="Before" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>No Photo Attached</div>
                                )}
                                <span className="badge" style={{ position: 'absolute', top: '4px', left: '4px', background: 'rgba(239,68,68,0.8)', color: 'white', fontSize: '9px', padding: '2px 4px' }}>BEFORE</span>
                              </div>
                            </div>
                            {/* After Image */}
                            <div className="glass-panel" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.01)' }}>
                              <div style={{ height: '90px', borderRadius: '4px', overflow: 'hidden', background: 'rgba(0,0,0,0.2)', position: 'relative' }}>
                                {stepResolved ? (
                                  <img src={afterImage} alt="After" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--text-muted)', padding: '4px', textAlign: 'center' }}>
                                    <span>Resolution Pending</span>
                                  </div>
                                )}
                                <span className="badge" style={{ position: 'absolute', top: '4px', left: '4px', background: stepResolved ? 'rgba(34,197,94,0.8)' : 'rgba(255,255,255,0.2)', color: 'white', fontSize: '9px', padding: '2px 4px' }}>AFTER</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Officer info */}
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assigned Ward Officer</h4>
                      {assignedOfficer ? (
                        <div className="glass-panel" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.01)' }}>
                          <img src={assignedOfficer.avatar_url} alt={assignedOfficer.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                          <div style={{ display: 'flex', flexDirection: 'column', flex: '1' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{assignedOfficer.name}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Ward {assignedOfficer.ward_id} Officer</span>
                          </div>
                          <a href={`tel:${assignedOfficer.phone}`} className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--primary)', fontSize: '10px', cursor: 'pointer', textDecoration: 'none' }}>
                            Contact
                          </a>
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Awaiting representative allocation...
                        </div>
                      )}
                    </div>

                    {/* Support and Upvote Action */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => handleTimelineUpvote(issue.id)}
                        className={`btn ${isUpvoted ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1', justifyContent: 'center', padding: '10px', fontSize: '13px' }}
                        disabled={isUpvoted}
                      >
                        <ThumbsUp size={16} />
                        {isUpvoted ? 'Supported' : `Support Issue (${upvoteCount})`}
                      </button>
                    </div>

                    {/* Resolve Form trigger and panel */}
                    {!stepResolved && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {!isResolving ? (
                          <button
                            onClick={() => setIsResolving(true)}
                            className="btn btn-secondary"
                            style={{ width: '100%', padding: '10px', fontSize: '13px', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', background: 'rgba(34,197,94,0.05)' }}
                          >
                            Verify & Resolve Ticket
                          </button>
                        ) : (
                          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(34,197,94,0.02)', border: '1px solid rgba(34,197,94,0.2)' }}>
                            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#22c55e' }}>Complete Ticket Resolution</h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '11px', fontWeight: 600 }}>Resolution Report / Note</label>
                              <textarea
                                value={resolveCommentText}
                                onChange={(e) => setResolveCommentText(e.target.value)}
                                placeholder="Explain what was fixed to resolve this issue..."
                                style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '6px 8px', borderRadius: '6px', outline: 'none', height: '60px', fontSize: '12px' }}
                                required
                              />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '11px', fontWeight: 600 }}>Upload Evidence (After Photo)</label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleResolveImageChange}
                                style={{ fontSize: '11px', color: 'var(--text-muted)' }}
                              />
                              {resolveImagePreview && (
                                <img src={resolveImagePreview} alt="Preview" style={{ height: '60px', width: '60px', objectFit: 'cover', borderRadius: '4px', marginTop: '4px' }} />
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                              <button
                                onClick={() => {
                                  setIsResolving(false);
                                  setResolveImagePreview(null);
                                  setResolveCommentText('');
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '4px 10px', fontSize: '12px' }}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleResolveSubmit(issue.id, assignedOfficer?.name || 'Grid Representative')}
                                className="btn btn-primary"
                                style={{ padding: '4px 10px', fontSize: '12px', background: '#22c55e', borderColor: '#22c55e' }}
                              >
                                Complete Resolution
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Comments / Activity Feed Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', flex: '1' }}>
                      <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Activity Feed</h4>

                      {/* Comments Feed List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '160px', flex: '1' }}>
                        {comments.length === 0 ? (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
                            No citizen comments posted yet.
                          </div>
                        ) : (
                          comments.map(c => (
                            <div key={c.id} style={{
                              padding: '10px', borderRadius: '6px',
                              background: c.isOfficer ? 'rgba(59,130,246,0.05)' : 'rgba(255,255,255,0.02)',
                              border: c.isOfficer ? '1px solid rgba(59,130,246,0.2)' : '1px solid var(--border-color)'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 600, color: c.isOfficer ? 'var(--primary)' : 'var(--text-main)' }}>{c.author}</span>
                                <span>{c.date}</span>
                              </div>
                              <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.3 }}>{c.text}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add comment Form */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 8px' }}>
                        <input
                          type="text"
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          placeholder="Write a comment or status update..."
                          style={{ background: 'none', border: 'none', color: 'var(--text-main)', width: '100%', outline: 'none', fontSize: '12px' }}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddComment(issue.id)}
                        />
                        <button
                          onClick={() => handleAddComment(issue.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '2px' }}
                          disabled={!newCommentText}
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* New Issue Report Modal Dialog */}
          {showReportModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
              <div className="glass-panel" style={{ width: '450px', padding: '24px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <button
                  onClick={() => setShowReportModal(false)}
                  style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>

                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>File a SeeClickFix Report</h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                  Submit a localized developmental ticket. It will automatically load on the community board and alert local ward managers.
                </p>

                <form onSubmit={handleTimelineReportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>Describe the issue</label>
                    <textarea
                      value={newReportText}
                      onChange={(e) => setNewReportText(e.target.value)}
                      placeholder="Explain what is broken or needed..."
                      style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '8px', outline: 'none', height: '100px', fontSize: '13px' }}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600 }}>Category</label>
                      <select
                        value={newReportCategory}
                        onChange={(e) => setNewReportCategory(e.target.value)}
                        style={{ background: 'var(--bg-app)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '8px 10px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                      >
                        {CATEGORIES.map((cat: string) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600 }}>Target Ward</label>
                      <select
                        value={newReportWard}
                        onChange={(e) => setNewReportWard(Number(e.target.value))}
                        style={{ background: 'var(--bg-app)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '8px 10px', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                      >
                        <option value={1}>Ward 1 (Saffron)</option>
                        <option value={2}>Ward 2 (Green)</option>
                        <option value={3}>Ward 3 (Blue)</option>
                        <option value={4}>Ward 4 (Amethyst)</option>
                      </select>
                    </div>
                  </div>

                  {/* Photo upload input for Before evidence */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>Attach Photo (Before Evidence)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReportImageChange}
                      style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '6px 8px', borderRadius: '8px', fontSize: '12px' }}
                    />
                    {reportImagePreview && (
                      <div style={{ position: 'relative', width: '80px', height: '80px', marginTop: '6px', borderRadius: '4px', overflow: 'hidden' }}>
                        <img src={reportImagePreview} alt="Before preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => { setReportImageFile(null); setReportImagePreview(null); }}
                          style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px' }}
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <button type="button" onClick={() => setShowReportModal(false)} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={loading}>
                      {loading ? 'Filing...' : 'Submit Report'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

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

            <div style={{ height: '480px', borderRadius: '8px', overflow: 'hidden' }}>
              <MapContainer center={MAP_CENTER} zoom={14} style={{ width: '100%', height: '100%' }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

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
                          <strong>Complaint:</strong> {s.content}<br />
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
              Administrators review incoming grievances and route accountability directly to local ward officers.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {suggestions.filter(s => s.dispatch_status === 'Unassigned' || !s.dispatch_status).map(issue => (
                <div key={issue.id} style={{ padding: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ margin: 0, fontSize: '14px' }}>{issue.content}</p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Route to Officer:</span>
                      <select
                        value={selectedOfficer[issue.id] || ''}
                        onChange={(e) => setSelectedOfficer(prev => ({ ...prev, [issue.id]: Number(e.target.value) }))}
                        style={{ background: 'var(--bg-app)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '6px', borderRadius: '6px', fontSize: '12px' }}
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
      {/* 7. WARD DIRECTORY VIEW */}
      {/* ========================================================= */}
      {activeApp === 'ward' && (
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '18px' }}>CityPulse IoT Event Monitor</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                  Simulates automated coordination dispatches when infrastructure drops occur.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Water Flow Rate</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, margin: '6px 0', color: '#22c55e' }}>92%</div>
                  <span style={{ fontSize: '10px', color: '#22c55e' }}>● Stable</span>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
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
                    border: '1px solid var(--border-color)',
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
                  style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px', height: '140px', outline: 'none', fontSize: '13px' }}
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
                  <div key={item.id} style={{ padding: '14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', fontSize: '13px' }}>
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
