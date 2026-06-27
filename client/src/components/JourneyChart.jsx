import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid
} from 'recharts';

/**
 * JourneyChart Component
 * Plots two users' rating progressions over "Journey Days" instead of absolute dates.
 * Highlights the comparison natively.
 */
export default function JourneyChart({ myHandle, peerHandle, myTimeline, peerTimeline, comparisonData }) {
  
  // Transform and merge the data for Recharts
  const chartData = useMemo(() => {
    if (!myTimeline || !peerTimeline) return [];

    // Collate all unique days
    const daysSet = new Set();
    myTimeline.forEach(pt => daysSet.add(pt.day));
    peerTimeline.forEach(pt => daysSet.add(pt.day));
    // Always include day 0
    daysSet.add(0);

    const sortedDays = Array.from(daysSet).sort((a, b) => a - b);

    let lastMyRating = 0;
    let lastPeerRating = 0;

    return sortedDays.map(day => {
      const myPoint = myTimeline.find(p => p.day === day);
      const peerPoint = peerTimeline.find(p => p.day === day);

      if (myPoint) lastMyRating = myPoint.rating;
      if (peerPoint) lastPeerRating = peerPoint.rating;

      return {
        day,
        [myHandle]: lastMyRating || null,
        [peerHandle]: lastPeerRating || null,
      };
    });
  }, [myTimeline, peerTimeline, myHandle, peerHandle]);

  if (!chartData || chartData.length === 0) return null;

  const myCurrentDay = comparisonData?.journeyDay;

  // Custom Tooltip Renderer
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const myVal = payload.find(p => p.dataKey === myHandle)?.value || 0;
      const peerVal = payload.find(p => p.dataKey === peerHandle)?.value || 0;
      
      const diff = myVal - peerVal;
      let diffStr = '';
      if (myVal > 0 && peerVal > 0) {
        if (diff > 0) diffStr = `(Ahead by ${diff})`;
        else if (diff < 0) diffStr = `(Behind by ${Math.abs(diff)})`;
        else diffStr = '(Tied)';
      }

      const isFuture = myCurrentDay !== undefined && label > myCurrentDay;

      return (
        <div className="journey-tooltip" style={{
          backgroundColor: '#fff',
          border: '1px solid #e2e8f0',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#0f172a' }}>
            Journey Day {label}
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#3b82f6', fontWeight: '600' }}>
              {myHandle}: {myVal > 0 ? myVal : 'Unrated'}
            </span>
            <span style={{ color: '#f97316', fontWeight: '600' }}>
              {peerHandle}: {peerVal > 0 ? peerVal : 'Unrated'} {diffStr && <span style={{fontSize: '12px', color: '#64748b'}}>{diffStr}</span>}
            </span>
          </div>

          {isFuture && (
            <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontSize: '12px', color: '#64748b' }}>
              <i>Your peer was here {label - myCurrentDay} days ago.</i><br/>
              <b>This is your potential.</b>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="day" 
            tick={{ fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={{ stroke: '#cbd5e1' }}
            label={{ value: 'Journey Days Since Day 1', position: 'bottom', offset: 0, fill: '#64748b' }}
          />
          <YAxis 
            domain={['dataMin - 100', 'dataMax + 100']} 
            tick={{ fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Reference Line for "Today" */}
          {myCurrentDay && (
            <ReferenceLine 
              x={myCurrentDay} 
              stroke="#10b981" 
              strokeDasharray="3 3" 
              label={{ position: 'top', value: 'Today', fill: '#10b981', fontWeight: 'bold' }} 
            />
          )}

          {/* MY Line */}
          <Line 
            type="monotone" 
            dataKey={myHandle} 
            stroke="#3b82f6" 
            strokeWidth={3} 
            dot={false}
            activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
            connectNulls
          />

          {/* PEER Line */}
          <Line 
            type="monotone" 
            dataKey={peerHandle} 
            stroke="#f97316" 
            strokeWidth={3} 
            dot={false} 
            activeDot={{ r: 6, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
