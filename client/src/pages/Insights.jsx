import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { Radar, Bar } from 'react-chartjs-2';
import './Insights.css';

// Register ChartJS components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

function Insights() {
  const { user } = useAuth();
  const myHandle = user?.codeforcesHandle || user?.cfHandle || user?.handle;

  const [metrics, setMetrics] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [struggles, setStruggles] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      try {
        // 1. Fetch Backend Cache System Metrics
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const metricsRes = await axios.get(`${API_URL}/api/metrics/cache`);
        setMetrics(metricsRes.data);

        if (myHandle) {
          // 2. Fetch User Profile Data for Charts
          const profileRes = await axios.get(`${API_URL}/api/cf/${myHandle}`);
          setProfileData(profileRes.data);

          // 3. Fetch Struggles
          const strugglesRes = await axios.get(`${API_URL}/api/cf/${myHandle}/struggles`);
          setStruggles(strugglesRes.data);
        }
      } catch (error) {
        console.error('Error fetching insights:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [myHandle]);

  if (loading) {
    return (
      <div className="insights-container">
        <div className="loading-spinner">Processing Analytics & Metrics...</div>
      </div>
    );
  }

  // Prepare Radar Chart Data (Tag Mastery)
  let radarData = null;
  if (struggles && struggles.weakTags.length > 0) {
    const topTags = struggles.weakTags.slice(0, 6);
    radarData = {
      labels: topTags.map(t => t.tag),
      datasets: [
        {
          label: 'Error Rate (%)',
          data: topTags.map(t => t.errorRate),
          backgroundColor: 'rgba(99, 102, 241, 0.2)', // Indigo
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 2,
        },
      ],
    };
  }

  // Prepare Bar Chart Data (Last 10 Days Activity)
  let barData = null;
  if (profileData && profileData.submissions) {
    // Process submission array (could be 1000s of items)
    const submissions = profileData.submissions;
    const daysMap = new Map();
    
    // Group by Date
    submissions.forEach(sub => {
      const date = new Date(sub.creationTimeSeconds * 1000).toLocaleDateString();
      if (!daysMap.has(date)) {
        daysMap.set(date, 0);
      }
      daysMap.set(date, daysMap.get(date) + 1);
    });

    // Get last 7 active days
    const activeDates = Array.from(daysMap.keys()).slice(0, 7).reverse();
    const activeCounts = activeDates.map(date => daysMap.get(date));

    barData = {
      labels: activeDates,
      datasets: [
        {
          label: 'Submissions',
          data: activeCounts,
          backgroundColor: 'rgba(168, 85, 247, 0.6)', // Purple
          borderRadius: 4,
        }
      ]
    };
  }

  return (
    <div className="insights-container">
      <button 
        className="btn btn-ghost" 
        onClick={() => window.history.back()} 
        style={{ marginBottom: '16px', padding: '8px 16px' }}
      >
        &larr; Back
      </button>
      <header className="insights-header">
        <h1>System Insights & Analytics</h1>
        <p>Live metrics from the custom In-Memory Cache and personalized algorithmic diagnostics.</p>
      </header>

      <div className="insights-grid">
        {/* Metric Cards */}
        <div className="metrics-panel card">
          <h2>⚡ Backend Performance Metrics</h2>
          <p className="subtitle">Real-time cache tracker. Show this on your resume!</p>
          
          <div className="metric-cards">
            <div className="metric-card">
              <span className="metric-label">Cache Hit Rate</span>
              <span className="metric-value highlight-green">{metrics?.hitRate || '0%'}</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Latency Saved (ms)</span>
              <span className="metric-value highlight-blue">{(metrics?.savedLatencyMs || 0).toLocaleString()}</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Total Queries</span>
              <span className="metric-value">{metrics?.totalQueries || 0}</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Bytes Processed</span>
              <span className="metric-value">{(metrics?.bytesProcessed / 1024).toFixed(2)} KB</span>
            </div>
          </div>
        </div>

        {/* Charts Panel */}
        <div className="charts-panel">
          <div className="chart-card card">
            <h3>Tag Mastery (Error Rate Radar)</h3>
            <div className="chart-wrapper">
              {radarData ? (
                <Radar data={radarData} options={{ maintainAspectRatio: false }} />
              ) : (
                <p className="no-data">Not enough data for radar chart.</p>
              )}
            </div>
          </div>

          <div className="chart-card card">
            <h3>Recent Activity Pipeline</h3>
            <div className="chart-wrapper">
              {barData ? (
                <Bar data={barData} options={{ maintainAspectRatio: false }} />
              ) : (
                <p className="no-data">Not enough data for activity chart.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Insights;
