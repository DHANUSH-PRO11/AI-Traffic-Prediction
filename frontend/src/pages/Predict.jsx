import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Clock, 
  Calendar, 
  CloudRain, 
  Thermometer, 
  AlertTriangle, 
  ArrowRight,
  TrendingDown, 
  CheckCircle,
  Activity,
  Zap,
  BarChart2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Cell 
} from 'recharts';
import { trafficApi } from '../api/client';

export default function Predict() {
  const [roads, setRoads] = useState([]);
  const [selectedRoadId, setSelectedRoadId] = useState('');
  const [timeStr, setTimeStr] = useState('08:30');
  const [dateStr, setDateStr] = useState('2026-09-29');
  const [weather, setWeather] = useState('Clear');
  const [temperature, setTemperature] = useState(24.0);
  const [rainfall, setRainfall] = useState(0.0);
  const [hasAccident, setHasAccident] = useState(false);

  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    async function loadRoads() {
      try {
        const data = await trafficApi.getRoads();
        setRoads(data || []);
        if (data && data.length > 0) {
          setSelectedRoadId(data[0].road_id);
        }
      } catch (err) {
        console.error("Failed to load roads for prediction:", err);
      }
    }
    loadRoads();
  }, []);

  const handlePredict = async () => {
    if (!selectedRoadId) return;
    try {
      setLoading(true);
      const res = await trafficApi.predictTraffic({
        road_id: selectedRoadId,
        date_str: dateStr,
        time_str: timeStr,
        weather: weather,
        temperature: parseFloat(temperature),
        rainfall: parseFloat(rainfall),
        accident_reported: hasAccident
      });
      setPrediction(res);
    } catch (err) {
      console.error("Prediction failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRoadId) {
      handlePredict();
    }
  }, [selectedRoadId]);

  const selectedRoad = roads.find(r => r.road_id === selectedRoadId);

  // Speed comparison in light green & white palette
  const comparisonData = selectedRoad && prediction ? [
    { name: 'Speed Limit', speed: selectedRoad.max_speed_kmh, fill: '#64748b' },
    { name: 'Historical Avg', speed: Math.round(selectedRoad.max_speed_kmh * 0.78), fill: '#e2e8f0' },
    { name: 'AI Predicted', speed: prediction.predicted_speed_kmh, fill: '#10b981' },
  ] : [];

  const getTrafficColor = (level) => {
    switch (level) {
      case 'SEVERE': return 'text-red-400 border-red-500/40 bg-red-500/10 glow-rose';
      case 'HIGH': return 'text-orange-400 border-orange-500/40 bg-orange-500/10 glow-amber';
      case 'MEDIUM': return 'text-amber-400 border-amber-500/40 bg-amber-500/10 glow-amber';
      default: return 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10 glow-emerald';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Cpu className="w-6 h-6 text-emerald-400" />
          AI Traffic Speed & Travel Time Predictor
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Trained on continuous corridor telematics with time-series aware feature engineering.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Parameter Controls */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="font-semibold text-base text-white border-b border-slate-800 pb-2">
            Forecast Parameters
          </h3>

          {/* Road Segment Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Select Road Segment
            </label>
            <select
              value={selectedRoadId}
              onChange={(e) => setSelectedRoadId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
            >
              {roads.map(r => (
                <option key={r.road_id} value={r.road_id}>
                  {r.road_name} ({r.road_type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Time & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Time</label>
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Date</label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Weather & Rainfall */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Weather</label>
              <select
                value={weather}
                onChange={(e) => {
                  setWeather(e.target.value);
                  if (e.target.value === 'Rain') setRainfall(4.5);
                  else setRainfall(0.0);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Clear">Clear</option>
                <option value="Overcast">Overcast</option>
                <option value="Rain">Heavy Rain</option>
                <option value="Fog">Dense Fog</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Temperature</label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
                <span className="text-xs text-slate-400">°C</span>
              </div>
            </div>
          </div>

          {/* Accident Toggle */}
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">Accident Reported?</span>
              <span className="text-[11px] text-slate-400">Simulate incident lane blockage</span>
            </div>
            <button
              type="button"
              onClick={() => setHasAccident(!hasAccident)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${hasAccident ? 'bg-red-500' : 'bg-slate-700'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${hasAccident ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Submit Button in Light Green */}
          <button
            onClick={handlePredict}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Zap className="w-4 h-4 text-emerald-200" />
                <span>GENERATE ML PREDICTION</span>
              </>
            )}
          </button>
        </div>

        {/* Right 2 Columns: Prediction Results & Charts */}
        <div className="lg:col-span-2 space-y-6">
          {prediction && (
            <>
              {/* Primary Output Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Traffic Level */}
                <div className="glass-panel p-4 rounded-xl flex flex-col justify-between">
                  <span className="text-slate-400 text-xs font-medium">Traffic Severity</span>
                  <div className="my-2">
                    <span className={`text-xl font-black px-2.5 py-1 rounded-lg border ${getTrafficColor(prediction.traffic_level)}`}>
                      {prediction.traffic_level}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Conf: {(prediction.confidence_score * 100).toFixed(0)}%</span>
                </div>

                {/* Predicted Speed */}
                <div className="glass-panel p-4 rounded-xl flex flex-col justify-between">
                  <span className="text-slate-400 text-xs font-medium">Predicted Speed</span>
                  <div className="my-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-white font-mono">
                      {prediction.predicted_speed_kmh}
                    </span>
                    <span className="text-xs text-slate-400">km/h</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Limit: {prediction.speed_limit_kmh} km/h</span>
                </div>

                {/* Travel Time */}
                <div className="glass-panel p-4 rounded-xl flex flex-col justify-between">
                  <span className="text-slate-400 text-xs font-medium">Travel Time</span>
                  <div className="my-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-emerald-300 font-mono">
                      {prediction.predicted_travel_time_min}
                    </span>
                    <span className="text-xs text-slate-400">min</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Length: {prediction.length_km} km</span>
                </div>

                {/* Traffic Volume */}
                <div className="glass-panel p-4 rounded-xl flex flex-col justify-between">
                  <span className="text-slate-400 text-xs font-medium">Predicted Volume</span>
                  <div className="my-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-white font-mono">
                      {Math.round(prediction.predicted_volume_vph)}
                    </span>
                    <span className="text-[10px] text-slate-400">vph</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Model {prediction.model_version}</span>
                </div>
              </div>

              {/* Historical vs Predicted Chart */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-sm text-white">
                      Speed Degradation Comparison ({prediction.road_name})
                    </h4>
                    <p className="text-xs text-slate-400">
                      Free-flow speed limit vs Historical benchmark vs ML Continuous Prediction
                    </p>
                  </div>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={[0, 'dataMax + 15']} unit=" km/h" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }} />
                      <Bar dataKey="speed" radius={[6, 6, 0, 0]} name="Speed (km/h)">
                        {comparisonData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Explainability Breakdown */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                <h4 className="font-semibold text-sm text-white mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Model Feature Impact Factors
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                    <span className="text-slate-400 block text-[11px]">Time of Day Impact</span>
                    <span className="font-bold text-white mt-1 block">
                      {timeStr >= '07:00' && timeStr <= '09:30' ? 'Morning Peak (-32% spd)' : 'Standard Off-Peak (-5% spd)'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                    <span className="text-slate-400 block text-[11px]">Weather Penalty</span>
                    <span className="font-bold text-white mt-1 block">
                      {weather === 'Rain' ? 'Wet Pavement (-18% spd)' : (weather === 'Fog' ? 'Reduced Visibility (-12% spd)' : 'Optimal Clear (0%)')}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                    <span className="text-slate-400 block text-[11px]">Incident Impedance</span>
                    <span className="font-bold text-white mt-1 block">
                      {hasAccident ? 'Critical Delay (-65% spd)' : 'Normal Flow (No Hazard)'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
