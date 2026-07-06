import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';
import MapView from '../components/features/dashboard/MapView';
import AnalyticsSummary from '../components/features/dashboard/AnalyticsSummary';
import ProjectPrioritizer from '../components/features/dashboard/ProjectPrioritizer';
import { Suggestion, ProposedProject, Ward, AnalyticsSummary as SummaryType } from '../types';
import { RefreshCw, Map, Grid, ListTodo } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [projects, setProjects] = useState<ProposedProject[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [summary, setSummary] = useState<SummaryType | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [sugRes, projRes, wardRes, sumRes] = await Promise.all([
        apiClient.get<Suggestion[]>('/api/v1/suggestions/'),
        apiClient.get<ProposedProject[]>('/api/v1/projects/'),
        apiClient.get<Ward[]>('/api/v1/analytics/wards'),
        apiClient.get<SummaryType>('/api/v1/analytics/summary'),
      ]);

      setSuggestions(sugRes.data);
      setProjects(projRes.data);
      setWards(wardRes.data);
      setSummary(sumRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <RefreshCw size={36} className="animate-spin" color="var(--primary)" />
        <p style={{ color: 'var(--text-muted)' }}>Loading MP Planning metrics...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '30px' }} className="animate-fade-in">
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '32px', color: 'var(--text-main)' }}>Constituency Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '2px' }}>
            Real-time public grievance mappings and AI-prioritized project proposals.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={refreshing}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontSize: '13px' }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Sync Data
        </button>
      </div>

      {/* Map & Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
        {/* Left: Map Card */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Map size={18} color="var(--secondary)" />
            Real-time Priority Mapping (GIS Heatmap)
          </h3>
          <MapView suggestions={suggestions} wards={wards} />
        </div>

        {/* Right: Summary Metrics */}
        <AnalyticsSummary summary={summary} />
      </div>

      {/* Proposed Projects Prioritization Rankings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        <ProjectPrioritizer projects={projects} onRefresh={fetchDashboardData} />
      </div>
    </div>
  );
};

export default Dashboard;
