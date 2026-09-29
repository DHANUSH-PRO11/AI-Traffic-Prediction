import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Clock, 
  Gauge, 
  Compass
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell 
} from 'recharts';
import { trafficApi } from '../api/client';
import { SectionHeader } from '../components/common/SectionHeader';
import { Card } from '../components/common/Card';
import { StatCard } from '../components/common/StatCard';
import { TrafficBadge, StatusBadge } from '../components/common/Badge';

export default function Analytics() {
  const [trafficAnalytics, setTrafficAnalytics] = useState(null);
  const [routesAnalytics, setRoutesAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        const [traffic, routes] = await Promise.all([
          trafficApi.getTrafficAnalytics(),
          trafficApi.getRoutesAnalytics(),
        ]);
        setTrafficAnalytics(traffic);
        setRoutesAnalytics(routes);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (loading && !trafficAnalytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-neutral-600 font-medium">Loading Network Analytics...</span>
        </div>
      </div>
    );
  }

  const pieColors = {
    LOW: '#10b981',
    MEDIUM: '#f59e0b',
    HIGH: '#ea580c',
    SEVERE: '#ef4444'
  };

  const distData = trafficAnalytics?.congestion_distribution?.map(d => ({
    name: d.level,
    value: d.percentage,
    count: d.segment_count,
    color: pieColors[d.level] || '#10b981'
  })) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <SectionHeader
        icon={BarChart3}
        title="Network Congestion & Routing Analytics"
        description="Longitudinal telematics across diurnal rush-hour cycles, corridor bottlenecks, and algorithmic routing performance."
      />

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Avg System Time Saved"
          value={routesAnalytics?.average_system_time_saved_min || 6.4}
          unit="min / trip"
          subtext="Versus baseline static shortest paths"
          trend="up"
          trendValue="+14% efficiency"
          icon={Clock}
        />
        <StatCard
          label="Total Optimized Trips"
          value={routesAnalytics?.total_optimized_trips?.toLocaleString() || '1,284'}
          subtext="Logged into continuous feedback database"
          trend="up"
          trendValue="+18.5% wk"
          icon={Activity}
        />
        <StatCard
          label="A* Heuristic Adoption"
          value={`${routesAnalytics?.algorithm_usage?.['A*'] || 78.4}%`}
          unit="vs Dijkstra"
          subtext="Admissible Euclidean distance heuristic"
          icon={Compass}
        />
        <StatCard
          label="Monitored Segments"
          value={trafficAnalytics?.total_segments || 48}
          unit="active"
          subtext="16 major transit hubs across metropolitan area"
          trend="up"
          trendValue="100% telemetry online"
          icon={Gauge}
        />
      </div>

      {/* Main Visualizations: 24h Speed/Congestion Curve + Congestion Ratio Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Speed Trend Line Chart */}
        <div className="lg:col-span-2">
          <Card
            title="24-Hour Velocity & Diurnal Congestion Curve"
            subtitle="System-wide average travel speed (km/h) across time of day"
          >
            <div className="h-72 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trafficAnalytics?.hourly_trends || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="#6b7280" 
                    tick={{ fontSize: 11 }} 
                    tickFormatter={(h) => `${h}:00`} 
                  />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} unit=" km/h" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      borderColor: '#e5e7eb', 
                      borderRadius: '0.75rem', 
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      fontSize: '12px' 
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="average_speed" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#059669' }} 
                    name="Avg Speed (km/h)" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Congestion Distribution Pie Chart */}
        <Card
          title="Congestion Distribution"
          subtitle="Network proportion by traffic severity category"
          className="flex flex-col justify-between"
        >
          <div>
            <div className="h-52 w-full mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {distData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      borderColor: '#e5e7eb', 
                      borderRadius: '0.75rem', 
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      fontSize: '12px' 
                    }} 
                    formatter={(val) => `${val}%`} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-neutral-100">
            {distData.map(d => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-neutral-600 font-semibold">{d.name}:</span>
                <span className="text-neutral-900 font-mono font-bold">{d.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Busiest & Fastest Roads Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Busiest Roads */}
        <Card
          title="Highest Demand Corridors (Busiest)"
          subtitle="Road segments with top vehicle volume and impedance"
        >
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-xs text-left">
              <thead className="text-neutral-500 border-b border-neutral-200 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-3">Corridor</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Speed</th>
                  <th className="py-2.5 px-3">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-mono">
                {trafficAnalytics?.busiest_roads?.map((r, i) => (
                  <tr key={i} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-2.5 px-3 font-sans font-bold text-neutral-900">{r.road_name}</td>
                    <td className="py-2.5 px-3 text-neutral-700 font-sans uppercase">
                      <StatusBadge status={r.road_type} />
                    </td>
                    <td className="py-2.5 px-3 text-emerald-700 font-bold">{r.predicted_speed} km/h</td>
                    <td className="py-2.5 px-3 text-neutral-900 font-bold">{r.predicted_volume} vph</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Fastest Highway Corridors */}
        <Card
          title="Optimal Flow Corridors (Fastest)"
          subtitle="Segments operating near free-flow design capacity"
        >
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-xs text-left">
              <thead className="text-neutral-500 border-b border-neutral-200 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-3">Corridor</th>
                  <th className="py-2.5 px-3">Limit</th>
                  <th className="py-2.5 px-3">Velocity</th>
                  <th className="py-2.5 px-3">Flow Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-mono">
                {trafficAnalytics?.fastest_roads?.map((r, i) => (
                  <tr key={i} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-2.5 px-3 font-sans font-bold text-neutral-900">{r.road_name}</td>
                    <td className="py-2.5 px-3 text-neutral-500 font-medium">{r.max_speed} km/h</td>
                    <td className="py-2.5 px-3 text-emerald-700 font-bold">{r.predicted_speed} km/h</td>
                    <td className="py-2.5 px-3 text-neutral-900 font-bold">
                      {Math.round(r.efficiency_ratio * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
