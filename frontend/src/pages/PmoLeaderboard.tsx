import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Award, Search, ArrowUpDown, Filter, Star, User, ShieldCheck, Flame } from 'lucide-react';
import apiClient from '../services/apiClient';
import { useLang } from '../context/LanguageContext';

interface PerformanceRecord {
  constituency_id: number;
  constituency_name: string;
  state: string;
  mp_name: string;
  mp_party: string;
  mla_name: string;
  total_cases: number;
  resolved_cases: number;
  open_cases: number;
  resolution_rate: number;
  avg_tat_days: number;
  governance_score: number;
}

const PmoLeaderboard: React.FC = () => {
  const { t } = useLang();
  const [data, setData] = useState<PerformanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [sortBy, setSortBy] = useState<'score' | 'tat' | 'rate'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get<PerformanceRecord[]>('/api/v1/analytics/performance');
        setData(res.data);
      } catch (err: any) {
        console.error('Failed to load performance metrics:', err);
        setError('Unauthorized or Failed to load performance index data.');
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  }, []);

  const handleSort = (field: 'score' | 'tat' | 'rate') => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Get unique states for filter
  const states = ['All', ...Array.from(new Set(data.map(item => item.state)))];

  // Process data (Search, Filter, Sort)
  const processedData = data
    .filter(item => {
      const matchesSearch =
        item.constituency_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.mp_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.mla_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesState = selectedState === 'All' || item.state === selectedState;
      return matchesSearch && matchesState;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'score') {
        comparison = a.governance_score - b.governance_score;
      } else if (sortBy === 'tat') {
        comparison = a.avg_tat_days - b.avg_tat_days;
      } else if (sortBy === 'rate') {
        comparison = a.resolution_rate - b.resolution_rate;
      }
      return sortOrder === 'desc' ? comparison * -1 : comparison;
    });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', borderColor: 'var(--danger)' }}>
        <h3 style={{ color: 'var(--danger)', margin: '0 0 10px 0' }}>Access Restricted</h3>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }} className="animate-fade-in">
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '30px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Award size={32} color="var(--saffron)" /> {t('pmo.title') || 'PMO Administrative Control'}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '2px' }}>
          Performance rating cards, local resolution status, and leadership board scores.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <NavLink 
          to="/pmo" 
          end
          style={({ isActive }) => ({
            color: isActive ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
            paddingBottom: '8px',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          })}
        >
          Representative Directory
        </NavLink>
        <NavLink 
          to="/pmo/analytics" 
          style={({ isActive }) => ({
            color: isActive ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
            paddingBottom: '8px',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          })}
        >
          Dashboard
        </NavLink>
        <NavLink 
          to="/pmo/leaderboard" 
          style={({ isActive }) => ({
            color: isActive ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
            paddingBottom: '8px',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          })}
        >
          Performance Index
        </NavLink>
      </div>

      {/* Leaderboard Cards Grid (Top 3 Performers) */}
      {selectedState === 'All' && searchQuery === '' && processedData.length >= 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Rank 2 */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '4px solid #3b82f6', position: 'relative' }}>
            <span style={{ position: 'absolute', top: '14px', right: '16px', fontSize: '11px', fontWeight: 800, opacity: 0.15 }}>RANK 2</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontWeight: 700 }}>2</div>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px' }}>{processedData[1].mp_name}</h4>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MP, {processedData[1].constituency_name}</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Governance Index</span>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{processedData[1].governance_score}/100</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Resolution Rate</span>
              <span style={{ fontWeight: 700, color: '#22c55e' }}>{processedData[1].resolution_rate}%</span>
            </div>
          </div>

          {/* Rank 1 */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '4px solid var(--saffron)', transform: 'scale(1.02)', boxShadow: '0 8px 30px rgba(249,115,22,0.1)', position: 'relative' }}>
            <span style={{ position: 'absolute', top: '14px', right: '16px', fontSize: '11px', fontWeight: 800, color: 'var(--saffron)' }}>
              <Star size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />RANK 1
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--saffron)', fontWeight: 700 }}>1</div>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--saffron)' }}>{processedData[0].mp_name}</h4>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MP, {processedData[0].constituency_name}</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Governance Index</span>
              <span style={{ fontWeight: 700, color: 'var(--saffron)' }}>{processedData[0].governance_score}/100</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Resolution Rate</span>
              <span style={{ fontWeight: 700, color: '#22c55e' }}>{processedData[0].resolution_rate}%</span>
            </div>
          </div>

          {/* Rank 3 */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '4px solid #22c55e', position: 'relative' }}>
            <span style={{ position: 'absolute', top: '14px', right: '16px', fontSize: '11px', fontWeight: 800, opacity: 0.15 }}>RANK 3</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e', fontWeight: 700 }}>3</div>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px' }}>{processedData[2].mp_name}</h4>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MP, {processedData[2].constituency_name}</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Governance Index</span>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{processedData[2].governance_score}/100</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Resolution Rate</span>
              <span style={{ fontWeight: 700, color: '#22c55e' }}>{processedData[2].resolution_rate}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search constituency, MP, or MLA representative..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="glass-input"
            style={{ width: '100%', paddingLeft: '38px', height: '40px', fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} color="var(--text-muted)" />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>State:</span>
          </div>
          <select
            value={selectedState}
            onChange={e => setSelectedState(e.target.value)}
            className="glass-input"
            style={{ padding: '6px 12px', height: '40px', fontSize: '13px' }}
          >
            {states.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparative Roster Table */}
      <div className="glass-panel" style={{ overflowX: 'auto', padding: '0px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              <th style={{ padding: '16px 20px' }}>Rank</th>
              <th style={{ padding: '16px' }}>Constituency</th>
              <th style={{ padding: '16px' }}>MP (Lok Sabha)</th>
              <th style={{ padding: '16px' }}>MLA (Vidhan Sabha)</th>
              <th style={{ padding: '16px', textAlign: 'center' }}>Active Backlog</th>
              <th style={{ padding: '16px', cursor: 'pointer' }} onClick={() => handleSort('rate')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Resolution Rate <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ padding: '16px', cursor: 'pointer' }} onClick={() => handleSort('tat')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Avg TAT <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ padding: '16px 20px', cursor: 'pointer', color: 'var(--saffron)' }} onClick={() => handleSort('score')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Governance Score <ArrowUpDown size={12} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {processedData.map(item => {
              const rank = data.findIndex(x => x.constituency_id === item.constituency_id) + 1;
              return (
                <tr key={item.constituency_id} style={{ borderBottom: '1px solid var(--border-card)', transition: 'background 0.2s' }} className="hover-highlight">
                  <td style={{ padding: '16px 20px', fontWeight: 700 }}>
                    <span style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%',
                      background: rank === 1 ? 'rgba(249,115,22,0.1)' : rank === 2 ? 'rgba(59,130,246,0.1)' : rank === 3 ? 'rgba(34,197,94,0.1)' : 'transparent',
                      color: rank === 1 ? 'var(--saffron)' : rank === 2 ? '#3b82f6' : rank === 3 ? '#22c55e' : 'var(--text-muted)'
                    }}>
                      {rank}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>{item.constituency_name}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.state}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <User size={13} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 550 }}>{item.mp_name}</span>
                        {item.mp_party && (
                          <span style={{ 
                            fontSize: '9px', 
                            padding: '1px 6px', 
                            borderRadius: '4px', 
                            background: item.mp_party === 'BJP' ? 'rgba(249,115,22,0.1)' : item.mp_party === 'INC' ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)',
                            color: item.mp_party === 'BJP' ? 'var(--saffron)' : item.mp_party === 'INC' ? '#3b82f6' : 'var(--text-muted)',
                            width: 'fit-content',
                            fontWeight: 700,
                            marginTop: '2px'
                          }}>
                            {item.mp_party}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShieldCheck size={14} color="var(--primary)" />
                      <span>{item.mla_name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: item.open_cases > 3 ? 'var(--saffron)' : 'var(--text-main)' }}>
                    {item.open_cases}
                  </td>
                  <td style={{ padding: '16px', fontWeight: 600, color: '#22c55e' }}>
                    {item.resolution_rate}%
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                    {item.avg_tat_days} days
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 700, fontSize: '14px', color: item.governance_score > 85 ? '#22c55e' : item.governance_score > 70 ? 'var(--saffron)' : 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Flame size={14} />
                      {item.governance_score}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {processedData.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No matching representatives or constituencies found.
          </div>
        )}
      </div>
    </div>
  );
};

export default PmoLeaderboard;
