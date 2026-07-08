import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';
import { RefreshCw, BarChart2, TrendingUp, AlertCircle, Database, Shield } from 'lucide-react';
import PmoHeader from '../components/features/pmo/PmoHeader';
import { useIsMobile } from '../hooks/useIsMobile';

interface OfficerLoad {
  name: string;
  ward_id: number;
  active_cases: number;
}

interface BigQueryData {
  connection_status: string;
  total_suggestions: number;
  total_projects: number;
  category_counts: Record<string, number>;
  sentiment_distribution: Record<string, number>;
  avg_tat_days: number;
  dispatch_saturation: number;
  officer_load: OfficerLoad[];
  resolved_count: number;
}

const SUBTITLE = 'High-performance analytical queries running over Cloud SQL transactional records in real-time.';

const PmoAnalytics: React.FC = () => {
  const isMobile = useIsMobile();
  const [data, setData] = useState<BigQueryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<BigQueryData>('/api/v1/analytics/bigquery');
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to query BigQuery federated connection endpoints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }} className="animate-fade-in">
      <PmoHeader subtitle={SUBTITLE} />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '16px' }}>
          <RefreshCw size={34} className="animate-spin" color="var(--primary)" />
          <p style={{ color: 'var(--text-muted)' }}>Querying Google BigQuery External Connections...</p>
        </div>
      ) : error || !data ? (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
          <AlertCircle size={48} style={{ margin: '0 auto 12px', opacity: 0.8 }} />
          <h3 style={{ margin: 0 }}>Error Fetching OLAP Data</h3>
          <p style={{ fontSize: '13px', margin: '6px 0 16px' }}>{error || 'No analytics metadata returned.'}</p>
          <button onClick={fetchAnalytics} className="btn-primary" style={{ margin: '0 auto' }}>Retry Query</button>
        </div>
      ) : (
        <>
          {/* Connection status badge */}
          <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Database size={18} color="#22c55e" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#22c55e' }}>{data.connection_status}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#22c55e' }}>
              <span style={{ height: '8px', width: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 8px #22c55e' }} />
              Live Sync Active
            </div>
          </div>

          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? '140px' : '220px'}, 1fr))`, gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>TOTAL COMPLAINTS</span>
              <h2 style={{ fontSize: '28px', margin: '8px 0 4px', fontWeight: 700 }}>{data.total_suggestions}</h2>
              <span style={{ fontSize: '11px', color: '#22c55e' }}>★ Ingested from citizen portal</span>
            </div>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>AVG RESPONSE LATENCY (TAT)</span>
              <h2 style={{ fontSize: '28px', margin: '8px 0 4px', fontWeight: 700, color: 'var(--primary)' }}>{data.avg_tat_days} Days</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>⏱ Ticket closure turnaround speed</span>
            </div>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>DISPATCH SATURATION</span>
              <h2 style={{ fontSize: '28px', margin: '8px 0 4px', fontWeight: 700 }}>{data.dispatch_saturation}%</h2>
              <span style={{ fontSize: '11px', color: 'var(--saffron)' }}>✔ Allocated to local Ward Representatives</span>
            </div>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>TOTAL RESOLVED</span>
              <h2 style={{ fontSize: '28px', margin: '8px 0 4px', fontWeight: 700, color: '#22c55e' }}>{data.resolved_count}</h2>
              <span style={{ fontSize: '11px', color: '#22c55e' }}>✔ Successful closures</span>
            </div>
          </div>

          {/* Charts & Audit */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 360px', gap: '20px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                  <BarChart2 size={16} color="var(--primary)" />
                  <h3 style={{ margin: 0, fontSize: '16px' }}>Grievance Categories Distribution</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {Object.entries(data.category_counts).map(([cat, count]) => {
                    const pct = data.total_suggestions > 0 ? (count / data.total_suggestions) * 100 : 0;
                    return (
                      <div key={cat}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 600 }}>{cat}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{count} complaints ({pct.toFixed(0)}%)</span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', borderRadius: '3px' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                  <TrendingUp size={16} color="var(--saffron)" />
                  <h3 style={{ margin: 0, fontSize: '16px' }}>Grievance Sentiment Ratio</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {Object.entries(data.sentiment_distribution).map(([sent, count]) => {
                    const pct = data.total_suggestions > 0 ? (count / data.total_suggestions) * 100 : 0;
                    const color = sent === 'Negative' ? '#ef4444' : sent === 'Positive' ? '#22c55e' : '#eab308';
                    return (
                      <div key={sent}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 600 }}>{sent} Sentiment</span>
                          <span style={{ color: 'var(--text-muted)' }}>{count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                <Shield size={16} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '16px' }}>Ward Officer Case Saturation</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {data.officer_load.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>No ward officers assigned.</p>
                ) : (
                  data.officer_load.map((o, idx) => (
                    <div key={idx} style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-card)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                        <span>{o.name}</span>
                        <span style={{ color: 'var(--text-muted)' }}>Ward {o.ward_id}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>Active Workload</span>
                        <span style={{ color: o.active_cases > 5 ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
                          {o.active_cases} open cases
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PmoAnalytics;
