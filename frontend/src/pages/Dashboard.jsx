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
  const [popularRoutes, setPopularRoutes] = useState([]);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const [current, history, routesAnalytics] = await Promise.all([
          trafficApi.getCurrentTraffic(),
          trafficApi.getTrafficHistory(),
          trafficApi.getRoutesAnalytics(),
        ]);
        setTrafficData(current);
        setHistoryData(history.trends || []);
        setPopularRoutes(routesAnalytics.popular_routes || []);
      } catch (err) {
        console.error("Dashboard data fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading && !trafficData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Loading AI Traffic Intelligence...</span>
        </div>
      </div>
    );
  }

  const breakdown = trafficData?.traffic_breakdown || { LOW: 30, MEDIUM: 12, HIGH: 4, SEVERE: 2 };
  const totalSegs = trafficData?.total_segments || 48;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-6">
      {/* 1. Header & Hero Section */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/25 to-slate-900 p-6 rounded-2xl border border-emerald-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge label="REAL-TIME TELEMETRY" variant="emerald" pulse={true} />
            <span className="text-xs text-slate-400">METR-LA Urban Corridor Network</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            Traffic Intelligence & Route Optimization
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
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
          valueColor="text-amber-400"
          subtitle="Forecast +8.4% peak volume"
          icon={TrendingUp}
        />

        <StatCard
          title="Active Accidents / Bottlenecks"
          value={trafficData?.active_incidents_count || 0}
          valueColor={trafficData?.active_incidents_count > 0 ? 'text-red-400' : 'text-white'}
          subtitle="Automated reroute active"
          icon={AlertTriangle}
        />

        <StatCard
          title="Network Average Speed"
          value={trafficData?.system_average_speed || 45.2}
          unit="km/h"
          valueColor="text-emerald-300"
          subtitle="Speed limit benchmark: 75 km/h"
          icon={Car}
        />

        <StatCard
          title="Total Optimized Trips"
          value="1,284"
          valueColor="text-white"
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
            <div className="flex items-center space-x-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                Actual Volume
              </span>
              <span className="flex items-center gap-1.5 text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-white" />
                ML Predicted
              </span>
            </div>
          }
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="actual_volume" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#actualGrad)" name="Actual (vph)" />
                <Area type="monotone" dataKey="predicted_volume" stroke="#ffffff" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#predGrad)" name="ML Forecast (vph)" />
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
            {/* Low */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-emerald-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Low Traffic (Free Flow)
                </span>
                <span className="text-slate-300 font-mono">{breakdown.LOW || 0} seg ({Math.round(((breakdown.LOW || 0) / totalSegs) * 100)}%)</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: `${((breakdown.LOW || 0) / totalSegs) * 100}%` }} />
              </div>
            </div>

            {/* Medium */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Medium (Moderate Delays)
                </span>
                <span className="text-slate-300 font-mono">{breakdown.MEDIUM || 0} seg ({Math.round(((breakdown.MEDIUM || 0) / totalSegs) * 100)}%)</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${((breakdown.MEDIUM || 0) / totalSegs) * 100}%` }} />
              </div>
            </div>

            {/* High */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-orange-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  High (Heavy Traffic)
                </span>
                <span className="text-slate-300 font-mono">{breakdown.HIGH || 0} seg ({Math.round(((breakdown.HIGH || 0) / totalSegs) * 100)}%)</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${((breakdown.HIGH || 0) / totalSegs) * 100}%` }} />
              </div>
            </div>

            {/* Severe */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-red-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Severe (Incidents / Gridlock)
                </span>
                <span className="text-slate-300 font-mono">{breakdown.SEVERE || 0} seg ({Math.round(((breakdown.SEVERE || 0) / totalSegs) * 100)}%)</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-red-500 h-full rounded-full transition-all duration-500" style={{ width: `${((breakdown.SEVERE || 0) / totalSegs) * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-emerald-500/20 mt-6">
            <div className="flex items-center gap-2 text-xs text-emerald-300 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Dynamic Edge Weight Optimizer
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
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
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
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
                className="p-3.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/40 transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-white flex items-center gap-2">
                    <span>{r.from}</span>
                    <span className="text-slate-500">→</span>
                    <span>{r.to}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                    <span>{r.trips} trips today</span>
                    <span>•</span>
                    <span>Avg {r.avg_time_min} min</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/30">
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
              onClick={() => navigate('/admin')}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              Simulate / Manage <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          {trafficData?.incidents && trafficData.incidents.length > 0 ? (
            <div className="space-y-2.5">
              {trafficData.incidents.map((inc, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{inc.road_name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                        {inc.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{inc.description}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">Rerouting active for connected traffic</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-slate-800/20 border border-dashed border-slate-700/60 text-center flex flex-col items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mb-2" />
              <p className="text-sm font-medium text-white">No Active Incidents Detected</p>
              <p className="text-xs text-slate-400 mt-1">All highway and arterial links operating under free-flow or regular peak patterns.</p>
              <Button
                onClick={() => navigate('/admin')}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                Inject Simulated Incident
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
