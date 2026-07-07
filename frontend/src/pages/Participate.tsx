import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import { MapContainer, TileLayer, Polygon, Popup, Marker } from 'react-leaflet';
import { DivIcon, LatLngExpression } from 'leaflet';
import { Shield, Phone, Mail, MapPin, CheckCircle, Navigation, Award, RefreshCw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Pydantic Schema Mappings
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
}

// Fixed coordinates for the mock constituency (matching LiveMap coords)
const MAP_CENTER: LatLngExpression = [12.9716, 77.5946];

// Coordinates boundary approximations for the 4 wards
const WARD_BOUNDARIES: Record<number, LatLngExpression[]> = {
  1: [
    [12.9750, 77.5900],
    [12.9800, 77.5980],
    [12.9700, 77.6000],
    [12.9680, 77.5920]
  ],
  2: [
    [12.9800, 77.5980],
    [12.9850, 77.6050],
    [12.9750, 77.6080],
    [12.9700, 77.6000]
  ],
  3: [
    [12.9700, 77.5900],
    [12.9700, 77.6000],
    [12.9600, 77.6050],
    [12.9550, 77.5950]
  ],
  4: [
    [12.9700, 77.6000],
    [12.9750, 77.6080],
    [12.9650, 77.6150],
    [12.9600, 77.6050]
  ]
};

// Colors matching each grid ward (glassy background color tokens)
const WARD_COLORS = {
  1: '#f97316', // Saffron
  2: '#22c55e', // India Green
  3: '#3b82f6', // Cobalt Blue
  4: '#a855f7'  // Amethyst
};

const Participate: React.FC = () => {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'map' | 'directory' | 'dispatch' | 'citizen'>('map');
  const [officers, setOfficers] = useState<GridOfficer[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [unassignedSuggestions, setUnassignedSuggestions] = useState<Suggestion[]>([]);
  const [selectedOfficer, setSelectedOfficer] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [dispatchMessage, setDispatchMessage] = useState<string>('');

  // Citizen search state
  const [searchLat, setSearchLat] = useState<string>('12.9720');
  const [searchLng, setSearchLng] = useState<string>('77.5950');
  const [matchedOfficer, setMatchedOfficer] = useState<GridOfficer | null>(null);
  const [locating, setLocating] = useState<boolean>(false);

  const fetchGridData = async () => {
    setLoading(true);
    try {
      const officersRes = await apiClient.get<GridOfficer[]>('/api/v1/grid/officers');
      setOfficers(officersRes.data);

      const suggestionsRes = await apiClient.get<Suggestion[]>('/api/v1/suggestions/');
      setSuggestions(suggestionsRes.data);
      
      // Filter suggestions locally to show those unassigned and eligible for dispatch
      const unassigned = suggestionsRes.data.filter(
        (s) => s.dispatch_status === 'Unassigned' || !s.dispatch_status
      );
      setUnassignedSuggestions(unassigned.sort((a, b) => b.priority_score - a.priority_score));
    } catch (err) {
      console.error("Error fetching grid metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGridData();
  }, []);

  const handleDispatch = async (suggestionId: string) => {
    const officerId = selectedOfficer[suggestionId];
    if (!officerId) return;

    try {
      setLoading(true);
      await apiClient.post('/api/v1/grid/dispatch', {
        suggestion_id: suggestionId,
        officer_id: Number(officerId)
      });
      setDispatchMessage('Issue dispatched successfully to grid officer!');
      setTimeout(() => setDispatchMessage(''), 3000);
      fetchGridData();
    } catch (err) {
      console.error("Dispatch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeoLookup = async () => {
    setLocating(true);
    try {
      const res = await apiClient.get<GridOfficer>(
        `/api/v1/grid/my-officer?latitude=${searchLat}&longitude=${searchLng}`
      );
      setMatchedOfficer(res.data);
    } catch (err) {
      console.error("Geo-lookup error:", err);
      setMatchedOfficer(null);
    } finally {
      setLocating(false);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSearchLat(position.coords.latitude.toFixed(6));
        setSearchLng(position.coords.longitude.toFixed(6));
        setLocating(false);
      },
      (error) => {
        console.error("Location detection blocked:", error);
        setLocating(false);
      }
    );
  };

  // Helper to render HTML avatars in leaflet
  const createOfficerIcon = (name: string, color: string) => {
    const initials = name.split(' ').map(n => n[0]).join('');
    return new DivIcon({
      html: `<div style="background: ${color}; width: 36px; height: 36px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.2); font-size: 13px;">${initials}</div>`,
      className: 'custom-leaflet-icon',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Info */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Shield size={28} color="var(--primary)" />
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '24px' }}>
            Grid Governance Command Center
          </h1>
        </div>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5 }}>
          Welcome to Phase 3. Decentralized grid administration allows division of the constituency into localized zones (Wards) for immediate grievance resolution. 
          Coordinators route citizen suggestions directly to Grid Officers to assign accountability.
        </p>
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', overflowX: 'auto' }}>
        <button 
          onClick={() => setActiveTab('map')}
          className={`btn ${activeTab === 'map' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ background: activeTab === 'map' ? 'var(--primary)' : 'var(--bg-card)' }}
        >
          Grid Map
        </button>
        <button 
          onClick={() => setActiveTab('directory')}
          className={`btn ${activeTab === 'directory' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ background: activeTab === 'directory' ? 'var(--primary)' : 'var(--bg-card)' }}
        >
          Officer Directory
        </button>
        
        {/* Only admins and MPs can dispatch reports */}
        {user?.is_admin && (
          <button 
            onClick={() => setActiveTab('dispatch')}
            className={`btn ${activeTab === 'dispatch' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ background: activeTab === 'dispatch' ? 'var(--primary)' : 'var(--bg-card)' }}
          >
            Admin Dispatch Hub
          </button>
        )}

        <button 
          onClick={() => setActiveTab('citizen')}
          className={`btn ${activeTab === 'citizen' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ background: activeTab === 'citizen' ? 'var(--primary)' : 'var(--bg-card)' }}
        >
          Find My Officer
        </button>

        <button 
          onClick={fetchGridData} 
          className="btn btn-secondary" 
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          {!loading ? 'Reload' : 'Syncing'}
        </button>
      </div>

      {dispatchMessage && (
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '12px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: 600 }}>
          {dispatchMessage}
        </div>
      )}

      {/* Tab Contents */}
      
      {/* 1. INTERACTIVE GRID MAP */}
      {activeTab === 'map' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', minHeight: '500px' }}>
          
          {/* Leaflet Map panel */}
          <div className="glass-panel" style={{ height: '550px', overflow: 'hidden', padding: 0, position: 'relative' }}>
            <MapContainer 
              center={MAP_CENTER} 
              zoom={14} 
              style={{ width: '100%', height: '100%', zIndex: 1 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              
              {/* Map Wards overlay polygons */}
              {Object.keys(WARD_BOUNDARIES).map((key) => {
                const wId = Number(key);
                const color = WARD_COLORS[wId as keyof typeof WARD_COLORS];
                const officer = officers.find(o => o.ward_id === wId);
                return (
                  <Polygon 
                    key={wId}
                    positions={WARD_BOUNDARIES[wId]}
                    pathOptions={{ color: color, fillColor: color, fillOpacity: 0.18, weight: 2 }}
                  >
                    <Popup>
                      <div style={{ color: 'black', fontFamily: 'sans-serif' }}>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '14px' }}>Ward Grid {wId}</h4>
                        <p style={{ margin: '0 0 8px 0', fontSize: '12px' }}>
                          <strong>Grid Officer:</strong> {officer ? officer.name : 'Unassigned'}
                        </p>
                        <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>
                          Coordinates bound local grievances inside this sector.
                        </p>
                      </div>
                    </Popup>
                  </Polygon>
                );
              })}

              {/* Grid Officer Markers */}
              {officers.map(officer => {
                const color = WARD_COLORS[officer.ward_id as keyof typeof WARD_COLORS] || 'var(--primary)';
                // Marker placement set at ward boundary average centroid
                const boundary = WARD_BOUNDARIES[officer.ward_id];
                if (!boundary) return null;
                const coordsList = boundary as [number, number][];
                const latAvg = coordsList.reduce((sum, current) => sum + current[0], 0) / coordsList.length;
                const lngAvg = coordsList.reduce((sum, current) => sum + current[1], 0) / coordsList.length;
                
                return (
                  <Marker 
                    key={officer.id} 
                    position={[latAvg, lngAvg]}
                    icon={createOfficerIcon(officer.name, color)}
                  >
                    <Popup>
                      <div style={{ color: 'black', fontFamily: 'sans-serif' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>{officer.name}</h4>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}>Grid Officer - Ward {officer.ward_id}</p>
                        <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: '#666' }}>Active Cases: {officer.active_cases}</p>
                        <p style={{ margin: 0, fontSize: '12px' }}>📞 {officer.phone}</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {/* Grid Side Inspector panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600 }}>Grid Statistics</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Constituency Segments:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>4 Local Grids</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Assigned Grid Officers:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{officers.length} Active</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Suggestions:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{suggestions.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Unassigned issues:</span>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{unassignedSuggestions.length} Pending</span>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', flex: 1 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600 }}>Ward Allocation Maps</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {officers.map(officer => {
                  const color = WARD_COLORS[officer.ward_id as keyof typeof WARD_COLORS];
                  return (
                    <div key={officer.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', padding: '8px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: color, flexShrink: 0 }}></span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{officer.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Grid {officer.ward_id} · {officer.active_cases} open cases</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. OFFICER DIRECTORY */}
      {activeTab === 'directory' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {officers.map(officer => {
            const color = WARD_COLORS[officer.ward_id as keyof typeof WARD_COLORS];
            return (
              <div key={officer.id} className="glass-panel transition-all" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' }}>
                {/* Decorative border color accent */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: color }}></div>
                
                {/* Avatar and name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <img 
                    src={officer.avatar_url} 
                    alt={officer.name}
                    style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${color}` }}
                  />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>{officer.name}</h3>
                    <div style={{ fontSize: '12px', color: color, fontWeight: 700, marginTop: '2px' }}>
                      WARD {officer.ward_id} OFFICER
                    </div>
                  </div>
                </div>

                <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: 0 }} />

                {/* Contact info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={14} /> <span>{officer.phone}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={14} style={{ flexShrink: 0 }} /> 
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{officer.email}</span>
                  </div>
                </div>

                {/* Workload widget */}
                <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Grid Active Workload</span>
                    <span style={{ fontWeight: 600, color: officer.active_cases > 5 ? 'var(--saffron)' : 'var(--india-green)' }}>
                      {officer.active_cases} unresolved cases
                    </span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${Math.min((officer.active_cases / 10) * 100, 100)}%`, 
                      background: officer.active_cases > 5 ? 'var(--saffron)' : color,
                      borderRadius: '3px',
                      transition: 'width 0.4s ease'
                    }}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. ADMIN DISPATCH HUB */}
      {activeTab === 'dispatch' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Navigation size={18} color="var(--primary)" />
            Pending Grievance Routing Queue
          </h2>
          <p style={{ margin: '0 0 20px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            The following suggestions are unassigned. Select a local Grid Officer and hit dispatch to hand over tracking responsibility.
          </p>

          {unassignedSuggestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <CheckCircle size={48} color="var(--india-green)" style={{ margin: '0 auto 12px', opacity: 0.8 }} />
              <p style={{ fontWeight: 600 }}>All citizen complaints dispatched!</p>
              <p style={{ fontSize: '12px' }}>Check back later as new suggestions arrive.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {unassignedSuggestions.map(issue => (
                <div 
                  key={issue.id} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px', 
                    padding: '16px', 
                    borderRadius: '8px', 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid var(--border-color)',
                    position: 'relative'
                  }}
                >
                  {/* Category and priority badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-main)' }}>
                        {issue.category || 'General'}
                      </span>
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        color: issue.priority_score > 70 ? 'var(--saffron)' : 'var(--text-muted)' 
                      }}>
                        Priority: {issue.priority_score}/100
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Geo: {issue.latitude?.toFixed(4)}, {issue.longitude?.toFixed(4)}
                    </span>
                  </div>

                  {/* Suggestion body */}
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-main)', lineHeight: 1.4 }}>
                    {issue.content}
                  </p>

                  <hr style={{ border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', margin: 0 }} />

                  {/* Dispatch Controls */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Assign to Grid Officer:</span>
                      <select 
                        value={selectedOfficer[issue.id] || ''}
                        onChange={(e) => setSelectedOfficer(prev => ({ ...prev, [issue.id]: Number(e.target.value) }))}
                        style={{ 
                          background: 'var(--bg-app)', 
                          color: 'var(--text-main)', 
                          border: '1px solid var(--border-color)', 
                          padding: '6px 12px', 
                          borderRadius: '6px', 
                          fontSize: '12px',
                          outline: 'none'
                        }}
                      >
                        <option value="">-- Choose Officer --</option>
                        {officers.map(o => (
                          <option key={o.id} value={o.id}>
                            {o.name} (Ward {o.ward_id} - Load: {o.active_cases})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button 
                      onClick={() => handleDispatch(issue.id)}
                      className="btn btn-primary"
                      style={{ padding: '6px 16px', fontSize: '12px' }}
                      disabled={!selectedOfficer[issue.id] || loading}
                    >
                      Dispatch To Grid
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. CITIZEN "MY GRID" FINDER */}
      {activeTab === 'citizen' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* Location input card */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Locate Your Ward Segment</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.4 }}>
              Enter your geographic coordinates (latitude and longitude) or click "Detect Location" to find which grid ward you belong to and see who represents you.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Latitude</label>
                <input 
                  type="text" 
                  value={searchLat}
                  onChange={(e) => setSearchLat(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Longitude</label>
                <input 
                  type="text" 
                  value={searchLng}
                  onChange={(e) => setSearchLng(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button 
                onClick={detectLocation}
                className="btn btn-secondary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                disabled={locating}
              >
                <Navigation size={14} /> Detect Location
              </button>
              <button 
                onClick={handleGeoLookup}
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={locating}
              >
                Find Grid Officer
              </button>
            </div>
          </div>

          {/* Results card */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {!matchedOfficer ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <MapPin size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p style={{ fontWeight: 600 }}>No Grid Lookup Performed Yet</p>
                <p style={{ fontSize: '12px' }}>Use the coordinates panel to find your grid representative.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <Award size={36} color="var(--primary)" style={{ margin: '0 auto 8px' }} />
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Your Representative Identified</h3>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '12px' }}>
                    You belong to Ward Grid {matchedOfficer.ward_id}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <img 
                    src={matchedOfficer.avatar_url} 
                    alt={matchedOfficer.name}
                    style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{matchedOfficer.name}</h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Grid Officer · Active</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--text-muted)', padding: '0 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={14} /> <span>{matchedOfficer.phone}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={14} /> <span>{matchedOfficer.email}</span>
                  </div>
                </div>

                <a 
                  href={`tel:${matchedOfficer.phone}`}
                  className="btn btn-primary"
                  style={{ textAlign: 'center', display: 'block', textDecoration: 'none', marginTop: '8px' }}
                >
                  Contact Officer Now
                </a>
              </div>
            )}
          </div>
        </div>
      )}
      
    </div>
  );
};

export default Participate;
