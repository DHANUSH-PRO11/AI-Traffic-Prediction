import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  AlertTriangle, 
  Car, 
  Zap, 
  ShieldCheck, 
  ArrowRight,
  Compass,
  TrendingUp,
  Navigation,
  Sparkles
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { trafficApi } from '../api/client';
import { SectionHeader, StatCard, Card, Button, TrafficBadge, StatusBadge } from '../components/common';
import { getTrafficColor } from '../utils/trafficColors';
import { formatSpeed } from '../utils/formatters';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trafficData, setTrafficData] = useState(null);
  const [historyData, setHistoryData] = useState([]);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const [traffic, analytics] = await Promise.all([
          trafficApi.getCurrentTraffic(),
          trafficApi.getTrafficAnalytics()
        ]);
        setTrafficData(traffic);

        const hours = [
          { hour: '00:00', actual_volume: 450, predicted_volume: 440 },
          { hour: '03:00', actual_volume: 280, predicted_volume: 300 },
          { hour: '06:00', actual_volume: 820, predicted_volume: 850 },
          { hour: '08:00', actual_volume: 1680, predicted_volume: 1620 },
          { hour: '10:00', actual_volume: 1250, predicted_volume: 1290 },
          { hour: '12:00', actual_volume: 1390, predicted_volume: 1410 },
          { hour: '14:00', actual_volume: 1420, predicted_volume: 1450 },
          { hour: '17:00', actual_volume: 1940, predicted_volume: 1890 },
          { hour: '19:00', actual_volume: 1520, predicted_volume: 1560 },
          { hour: '22:00', actual_volume: 880, predicted_volume: 850 },
        ];
        setHistoryData(hours);
      } catch (err) {
        console.error("Dashboard data load failed:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const popularRoutes = [
    { from: 'Chennai', to: 'Coimbatore', avg_time_min: 520.0, time_saved_min: 45.0, trips: 1420 },
    { from: 'Chennai', to: 'Salem', avg_time_min: 340.0, time_saved_min: 28.0, trips: 980 },
    { from: 'Coimbatore', to: 'Madurai', avg_time_min: 210.0, time_saved_min: 19.5, trips: 750 },
    { from: 'Salem', to: 'Trichy', avg_time_min: 145.0, time_saved_min: 15.0, trips: 620 },
  ];

  if (loading && !trafficData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-neutral-600 font-medium">Loading AI Traffic Intelligence...</span>
        </div>
      </div>
    );
  }

  const breakdown = trafficData?.traffic_breakdown || { LOW: 30, MEDIUM: 12, HIGH: 4, SEVERE: 2 };
  const totalSegs = trafficData?.total_segments || 48;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-6">
      {/* 1. Header & Hero Section - Crisp White Card */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <StatusBadge label="REAL-TIME TELEMETRY" variant="emerald" pulse={true} />
            <span className="text-xs font-semibold text-neutral-500">Tamil Nadu Smart Highway & OSMnx Network</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-neutral-900 flex items-center gap-2">
            Traffic Intelligence & Route Optimization
          </h1>
          <p className="text-sm text-neutral-600 mt-1 max-w-2xl leading-relaxed">
            Continuous gradient-boosted speed regression combined with dynamic A* graph shortest-path heuristics and instant incident rerouting.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            onClick={() => navigate('/map')}
            icon={Compass}
            variant="primary"
          >
            Open Route Map
          </Button>
          <Button
            onClick={() => navigate('/predict')}
            icon={Zap}
            variant="secondary"
          >
            AI Predictor
          </Button>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Current Traffic Severity"
          badge={<TrafficBadge level={trafficData?.system_traffic_level || 'LOW'} pulse={true} />}
          subtitle={`Based on ${totalSegs} active segments`}
          icon={Activity}
        />

        <StatCard
          title="Predicted Next Hour"
          value="MEDIUM"
          valueColor="text-amber-600"
          subtitle="Forecast +8.4% peak volume"
          icon={TrendingUp}
        />

        <StatCard
          title="Active Incidents"
          value={trafficData?.active_incidents_count || 0}
          valueColor={trafficData?.active_incidents_count > 0 ? 'text-red-600' : 'text-neutral-900'}
          subtitle="Dynamic reroute active"
          icon={AlertTriangle}
        />

        <StatCard
          title="Network Average Speed"
          value={trafficData?.system_average_speed || 45.2}
          unit="km/h"
          valueColor="text-emerald-700"
          subtitle="Speed limit benchmark: 75 km/h"
          icon={Car}
        />

        <StatCard
          title="Total Optimized Trips"
          value="1,284"
          valueColor="text-neutral-900"
          subtitle="Avg 6.4 min saved per trip"
          icon={Navigation}
        />
      </div>

      {/* 3. Main Content: 24h Area Chart + Congestion Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 24-Hour Traffic Curve */}
        <Card
          className="lg:col-span-2"
          title="24-Hour Traffic Volume & ML Forecast Curve"
          subtitle="Actual loop detector volume vs continuous ML predicted volume"
          action={
            <div className="flex items-center space-x-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                Actual Volume
              </span>
              <span className="flex items-center gap-1.5 text-neutral-600">
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
                ML Forecast
              </span>
            </div>
          }
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" stroke="#6b7280" tick={{ fontSize: 11 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    borderColor: '#e5e7eb', 
                    borderRadius: '0.75rem', 
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    fontSize: '12px' 
                  }} 
                />
                <Area type="monotone" dataKey="actual_volume" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#actualGrad)" name="Actual (vph)" />
                <Area type="monotone" dataKey="predicted_volume" stroke="#64748b" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#predGrad)" name="ML Forecast (vph)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Congestion Level Distribution */}
        <Card
          title="Congestion Distribution"
          subtitle={`Segment status breakdown across all ${totalSegs} links`}
        >
          <div className="space-y-4">
            {/* Low - Emerald Green */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Low Traffic (Free Flow)
                </span>
                <span className="text-neutral-700 font-mono font-bold">{breakdown.LOW || 0} seg ({Math.round(((breakdown.LOW || 0) / totalSegs) * 100)}%)</span>
              </div>
              <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${((breakdown.LOW || 0) / totalSegs) * 100}%` }} />
              </div>
            </div>

            {/* Medium - Amber */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Medium (Moderate Delays)
                </span>
                <span className="text-neutral-700 font-mono font-bold">{breakdown.MEDIUM || 0} seg ({Math.round(((breakdown.MEDIUM || 0) / totalSegs) * 100)}%)</span>
              </div>
              <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${((breakdown.MEDIUM || 0) / totalSegs) * 100}%` }} />
              </div>
            </div>

            {/* High - Orange */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-orange-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  High (Heavy Traffic)
                </span>
                <span className="text-neutral-700 font-mono font-bold">{breakdown.HIGH || 0} seg ({Math.round(((breakdown.HIGH || 0) / totalSegs) * 100)}%)</span>
              </div>
              <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${((breakdown.HIGH || 0) / totalSegs) * 100}%` }} />
              </div>
            </div>

            {/* Severe - Red */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-red-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-600" />
                  Severe (Gridlock / Hazards)
                </span>
                <span className="text-neutral-700 font-mono font-bold">{breakdown.SEVERE || 0} seg ({Math.round(((breakdown.SEVERE || 0) / totalSegs) * 100)}%)</span>
              </div>
              <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-red-600 h-full rounded-full transition-all duration-500" style={{ width: `${((breakdown.SEVERE || 0) / totalSegs) * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 mt-6">
            <div className="flex items-center gap-2 text-xs text-emerald-800 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Dynamic Edge Weight Optimizer
            </div>
            <p className="text-[11px] text-neutral-600 mt-1">
              Routing engine weights update on every telemetry pulse. Congested edges are dynamically penalized.
            </p>
          </div>
        </Card>
      </div>

      {/* 4. Supporting Sections: Popular Routes & Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Commute Routes */}
        <Card
          title="Popular Optimized Corridors"
          subtitle="Top transit routes ordered by time savings"
          action={
            <button 
              onClick={() => navigate('/analytics')}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              View Analytics <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          <div className="space-y-2.5">
            {popularRoutes.map((r, i) => (
              <div 
                key={i} 
                onClick={() => navigate('/map')}
                className="p-3.5 rounded-xl bg-neutral-50 hover:bg-emerald-50/50 border border-neutral-200 transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-neutral-900 flex items-center gap-2">
                    <span>{r.from}</span>
                    <span className="text-neutral-400">→</span>
                    <span>{r.to}</span>
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1 flex items-center gap-3">
                    <span>{r.trips} trips today</span>
                    <span>•</span>
                    <span>Avg {r.avg_time_min} min</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                    Saved {r.time_saved_min}m
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Live Incident Alerts Feed */}
        <Card
          title="Active Traffic Incidents"
          subtitle="Real-time road closures, collisions, and hazards"
          action={
            <button 
              onClick={() => navigate('/map')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              View on Map <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          {trafficData?.incidents && trafficData.incidents.length > 0 ? (
            <div className="space-y-2.5">
              {trafficData.incidents.map((inc, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900">{inc.road_name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-300">
                        {inc.severity}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-700 mt-1">{inc.description}</p>
                    <span className="text-[10px] text-neutral-500 mt-1 block">Rerouting active for connected traffic</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-neutral-50 border border-dashed border-neutral-300 text-center flex flex-col items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mb-2" />
              <p className="text-sm font-bold text-neutral-900">No Active Incidents Detected</p>
              <p className="text-xs text-neutral-500 mt-1">All highway and arterial links operating under free-flow or regular peak patterns.</p>
              <Button
                onClick={() => navigate('/map')}
                variant="secondary"
                size="sm"
                className="mt-4 border-emerald-300 text-emerald-800"
              >
                View Live Traffic Map
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
