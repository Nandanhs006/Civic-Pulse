import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Search, ArrowUpDown, Filter, Star, User, ShieldCheck, Flame, AlertCircle } from 'lucide-react';
import apiClient from '../services/apiClient';
import { useLang } from '../context/LanguageContext';
import { useIsMobile } from '../hooks/useIsMobile';
import PmoHeader from '../components/features/pmo/PmoHeader';

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

const SUBTITLE = 'Performance rating cards, local resolution status, and leadership board scores.';

const PmoLeaderboard: React.FC = () => {
  useLang();
  const isMobile = useIsMobile();
  const [data, setData] = useState<PerformanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [sortBy, setSortBy] = useState<'score' | 'tat' | 'rate'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = isMobile ? 4 : 5;

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get<PerformanceRecord[]>('/api/v1/analytics/performance');
        setData(res.data);
      } catch (err: any) {
        console.error('Failed to load performance metrics:', err);
        setError('Unauthorized or failed to load performance index data.');
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

  const states = ['All', ...Array.from(new Set(data.map(item => item.state)))];

  const processedData = useMemo(() => {
    const list = data.filter(item => {
      const matchesSearch =
        item.constituency_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.mp_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.mla_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesState = selectedState === 'All' || item.state === selectedState;
      return matchesSearch && matchesState;
    });
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'score') cmp = a.governance_score - b.governance_score;
      else if (sortBy === 'tat') cmp = a.avg_tat_days - b.avg_tat_days;
      else if (sortBy === 'rate') cmp = a.resolution_rate - b.resolution_rate;
      return sortOrder === 'desc' ? cmp * -1 : cmp;
    });
    return list;
  }, [data, searchQuery, selectedState, sortBy, sortOrder]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedState, sortBy, sortOrder]);

  const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE);
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedData.slice(start, start + ITEMS_PER_PAGE);
  }, [processedData, currentPage, ITEMS_PER_PAGE]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }} className="animate-fade-in">
      <PmoHeader subtitle={SUBTITLE} />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '16px' }}>
          <RefreshCw size={34} className="animate-spin" color="var(--primary)" />
          <p style={{ color: 'var(--text-muted)' }}>Loading performance index...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', borderColor: 'var(--danger)' }}>
          <AlertCircle size={40} color="#ef4444" style={{ marginBottom: '10px' }} />
          <h3 style={{ color: '#ef4444', margin: '0 0 8px' }}>Access Restricted</h3>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>{error}</p>
        </div>
      ) : (
        <>
          {/* Top 3 podium cards — unfiltered global view only */}
          {selectedState === 'All' && searchQuery === '' && processedData.length >= 3 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {[
                { rank: 1, accent: 'var(--saffron)', bg: 'rgba(249,115,22,0.1)', scale: isMobile ? 1 : 1.02 },
                { rank: 2, accent: '#3b82f6', bg: 'rgba(59,130,246,0.1)', scale: 1 },
                { rank: 3, accent: '#22c55e', bg: 'rgba(34,197,94,0.1)', scale: 1 },
              ].map(({ rank, accent, bg, scale }) => {
                const record = processedData[rank - 1];
                return (
                  <div key={rank} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: `4px solid ${accent}`, transform: `scale(${scale})`, position: 'relative' }}>
                    <span style={{ position: 'absolute', top: '14px', right: '16px', fontSize: '11px', fontWeight: 800, color: rank === 1 ? accent : undefined, opacity: rank === 1 ? 1 : 0.4 }}>
                      {rank === 1 && <Star size={11} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'text-bottom' }} />}
                      RANK {rank}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, fontWeight: 700, flexShrink: 0 }}>{rank}</div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '15px', color: rank === 1 ? accent : undefined }}>{record.mp_name}</h4>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MP, {record.constituency_name}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Governance Index</span>
                      <span style={{ fontWeight: 700, color: accent }}>{record.governance_score}/100</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Resolution Rate</span>
                      <span style={{ fontWeight: 700, color: '#22c55e' }}>{record.resolution_rate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Search & Filter bar */}
          <div className="glass-panel" style={{ padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search constituency, MP, or MLA..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="glass-input"
                style={{ width: '100%', paddingLeft: '36px', height: '38px', fontSize: '13px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={13} color="var(--text-muted)" />
              <select
                value={selectedState}
                onChange={e => setSelectedState(e.target.value)}
                className="glass-input"
                style={{ padding: '6px 10px', height: '38px', fontSize: '13px' }}
              >
                {states.map(state => <option key={state} value={state}>{state}</option>)}
              </select>
            </div>
            {!isMobile && (
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['score', 'rate', 'tat'] as const).map(field => (
                  <button
                    key={field}
                    onClick={() => handleSort(field)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: sortBy === field ? 'var(--primary)' : undefined }}
                  >
                    {field === 'score' ? 'Score' : field === 'rate' ? 'Resolution' : 'TAT'}
                    <ArrowUpDown size={11} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mobile: card list | Desktop: table */}
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {paginatedList.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No matching representatives found.</div>
              ) : paginatedList.map(item => {
                const rank = data.findIndex(x => x.constituency_id === item.constituency_id) + 1;
                return (
                  <div key={item.constituency_id} className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '15px', fontWeight: 700 }}>{item.constituency_name}</span>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.state}</div>
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '20px', color: item.governance_score > 85 ? '#22c55e' : item.governance_score > 70 ? 'var(--saffron)' : 'var(--text-muted)' }}>
                        #{rank}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} /> {item.mp_name}
                        {item.mp_party && (
                          <span style={{ marginLeft: '4px', fontSize: '9px', padding: '1px 5px', borderRadius: '4px', background: 'var(--overlay-med)', fontWeight: 700 }}>{item.mp_party}</span>
                        )}
                      </span>
                    </div>
                    <div style={{ display: 'flex', fontSize: '11px', color: 'var(--text-muted)', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={11} color="var(--primary)" /> {item.mla_name}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '4px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#22c55e' }}>{item.resolution_rate}%</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Resolution</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: item.open_cases > 3 ? 'var(--saffron)' : 'var(--text-main)' }}>{item.open_cases}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Open Cases</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', color: item.governance_score > 85 ? '#22c55e' : item.governance_score > 70 ? 'var(--saffron)' : 'var(--text-muted)' }}>
                          <Flame size={13} />{item.governance_score}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Score</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-panel" style={{ overflowX: 'auto', padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    <th style={{ padding: '16px 20px' }}>Rank</th>
                    <th style={{ padding: '16px' }}>Constituency</th>
                    <th style={{ padding: '16px' }}>MP (Lok Sabha)</th>
                    <th style={{ padding: '16px' }}>MLA (Vidhan Sabha)</th>
                    <th style={{ padding: '16px', textAlign: 'center' }}>Active Backlog</th>
                    <th style={{ padding: '16px', cursor: 'pointer' }} onClick={() => handleSort('rate')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Resolution Rate <ArrowUpDown size={12} /></div>
                    </th>
                    <th style={{ padding: '16px', cursor: 'pointer' }} onClick={() => handleSort('tat')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Avg TAT <ArrowUpDown size={12} /></div>
                    </th>
                    <th style={{ padding: '16px 20px', cursor: 'pointer', color: 'var(--saffron)' }} onClick={() => handleSort('score')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Governance Score <ArrowUpDown size={12} /></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map(item => {
                    const rank = data.findIndex(x => x.constituency_id === item.constituency_id) + 1;
                    return (
                      <tr key={item.constituency_id} style={{ borderBottom: '1px solid var(--border-card)', transition: 'background 0.2s' }} className="hover-highlight">
                        <td style={{ padding: '16px 20px', fontWeight: 700 }}>
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: rank === 1 ? 'rgba(249,115,22,0.1)' : rank === 2 ? 'rgba(59,130,246,0.1)' : rank === 3 ? 'rgba(34,197,94,0.1)' : 'transparent', color: rank === 1 ? 'var(--saffron)' : rank === 2 ? '#3b82f6' : rank === 3 ? '#22c55e' : 'var(--text-muted)' }}>
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
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
                              <User size={13} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 550 }}>{item.mp_name}</span>
                              {item.mp_party && (
                                <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: item.mp_party === 'BJP' ? 'rgba(249,115,22,0.1)' : item.mp_party === 'INC' ? 'rgba(59,130,246,0.1)' : 'var(--bg-subtle)', color: item.mp_party === 'BJP' ? 'var(--saffron)' : item.mp_party === 'INC' ? '#3b82f6' : 'var(--text-muted)', width: 'fit-content', fontWeight: 700, marginTop: '2px' }}>
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
                        <td style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: item.open_cases > 3 ? 'var(--saffron)' : 'var(--text-main)' }}>{item.open_cases}</td>
                        <td style={{ padding: '16px', fontWeight: 600, color: '#22c55e' }}>{item.resolution_rate}%</td>
                        <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{item.avg_tat_days} days</td>
                        <td style={{ padding: '16px 20px', fontWeight: 700, fontSize: '14px', color: item.governance_score > 85 ? '#22c55e' : item.governance_score > 70 ? 'var(--saffron)' : 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Flame size={14} />{item.governance_score}
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
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '13px' }}>Previous</button>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Page {currentPage} of {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '13px' }}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PmoLeaderboard;
