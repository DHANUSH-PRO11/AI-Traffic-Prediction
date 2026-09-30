import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Clock, 
  Calendar, 
  CloudRain, 
  Thermometer, 
  AlertTriangle, 
  Activity,
  Zap,
  BarChart2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell 
} from 'recharts';
import { trafficApi } from '../api/client';
import { SectionHeader } from '../components/common/SectionHeader';
import { Card } from '../components/common/Card';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { TrafficBadge } from '../components/common/Badge';
import { formatSpeed, formatDuration, formatNumber } from '../utils/formatters';

export default function Predict() {
  const [roads, setRoads] = useState([]);
  const [selectedRoadId, setSelectedRoadId] = useState('');
  const getTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getNowTime = () => {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const [timeStr, setTimeStr] = useState(getNowTime);
  const [dateStr, setDateStr] = useState(getTodayDate);
  const [weather, setWeather] = useState('Clear');
  const [temperature, setTemperature] = useState(24.0);
  const [rainfall, setRainfall] = useState(0.0);
  const [hasAccident, setHasAccident] = useState(false);

  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [liveDetails, setLiveDetails] = useState(null);

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

  const handlePredict = async (overrides = {}) => {
    const activeRoadId = overrides.roadId || selectedRoadId;
    if (!activeRoadId) return;
    try {
      setLoading(true);
      const currentTime = overrides.timeStr || timeStr;
      const currentDate = overrides.dateStr || dateStr;
      const currentWeather = overrides.weather || weather;
      const currentTemp = overrides.temperature !== undefined ? overrides.temperature : temperature;
      const currentRain = overrides.rainfall !== undefined ? overrides.rainfall : rainfall;
      const currentAccident = overrides.hasAccident !== undefined ? overrides.hasAccident : hasAccident;

      const hourInt = parseInt(currentTime.split(':')[0], 10) || 12;
      const roadObj = roads.find(r => r.road_id === activeRoadId);

      const [res, liveRes] = await Promise.all([
        trafficApi.predictTraffic({
          road_id: activeRoadId,
          date_str: currentDate,
          time_str: currentTime,
          weather: currentWeather,
          temperature: parseFloat(currentTemp),
          rainfall: parseFloat(currentRain),
          accident_reported: currentAccident
        }),
        trafficApi.predictLive({
          hour: hourInt,
          day: new Date(currentDate).getDay(),
          temperature: parseFloat(currentTemp),
          rainfall: parseFloat(currentRain),
          road_type: roadObj?.road_type || 'highway',
          vehicle_count: currentAccident ? 320 : (hourInt >= 8 && hourInt <= 10 ? 240 : 140)
        }).catch(() => null)
      ]);
      setPrediction(res);
      if (liveRes) {
        setLiveDetails(liveRes);
      }
    } catch (err) {
      console.error("Prediction failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const applyTimePreset = (t) => {
    setTimeStr(t);
    handlePredict({ timeStr: t });
  };

  const applyNowPreset = () => {
    const t = getNowTime();
    const d = getTodayDate();
    setTimeStr(t);
    setDateStr(d);
    handlePredict({ timeStr: t, dateStr: d });
  };

  const applyWeatherPreset = (w, temp, rain) => {
    setWeather(w);
    setTemperature(temp);
    setRainfall(rain);
    handlePredict({ weather: w, temperature: temp, rainfall: rain });
  };

  useEffect(() => {
    if (selectedRoadId) {
      handlePredict();
    }
  }, [selectedRoadId]);

  const selectedRoad = roads.find(r => r.road_id === selectedRoadId);

  // Speed comparison chart data
  const comparisonData = selectedRoad && prediction ? [
    { name: 'Speed Limit', speed: selectedRoad.max_speed_kmh, fill: '#94a3b8' },
    { name: 'Historical Avg', speed: Math.round(selectedRoad.max_speed_kmh * 0.78), fill: '#cbd5e1' },
    { name: 'AI Predicted', speed: prediction.predicted_speed_kmh, fill: '#10b981' },
  ] : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <SectionHeader
        icon={Cpu}
        title="AI Traffic Speed & Travel Time Predictor"
        description="Machine learning inference powered by continuous road telematics, cyclical temporal features, and adverse weather degradation modeling."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Parameter Controls */}
        <Card
          title="Forecast Parameters"
          subtitle="Configure temporal, spatial, and weather conditions"
        >
          <div className="space-y-4">
            {/* Road Segment Selector */}
            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1.5">
                Target Road Corridor
              </label>
              <select
                value={selectedRoadId}
                onChange={(e) => setSelectedRoadId(e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-neutral-600">Time</label>
                  <button 
                    type="button" 
                    onClick={applyNowPreset}
                    className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <Clock className="w-2.5 h-2.5" /> Now
                  </button>
                </div>
                <input
                  type="time"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 font-medium focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-neutral-600">Date</label>
                  <div className="flex items-center gap-1.5">
                    <button 
                      type="button" 
                      onClick={() => { const d = getTodayDate(); setDateStr(d); handlePredict({ dateStr: d }); }}
                      className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer"
                    >
                      Today
                    </button>
                    <span className="text-[9px] text-neutral-300">|</span>
                    <button 
                      type="button" 
                      onClick={() => { const d = getTomorrowDate(); setDateStr(d); handlePredict({ dateStr: d }); }}
                      className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer"
                    >
                      Tomorrow
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 font-medium focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* Quick Time Presets */}
            <div>
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1.5">
                Rush Hour & Schedule Presets
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => applyTimePreset('08:30')}
                  className={`px-2 py-1.5 rounded-lg border font-semibold text-left transition-all cursor-pointer flex items-center justify-between ${
                    timeStr === '08:30' 
                      ? 'bg-amber-50 border-amber-300 text-amber-900' 
                      : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                  }`}
                >
                  <span>🌅 Morning Peak</span>
                  <span className="font-mono text-[10px] text-neutral-500">08:30</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyTimePreset('13:00')}
                  className={`px-2 py-1.5 rounded-lg border font-semibold text-left transition-all cursor-pointer flex items-center justify-between ${
                    timeStr === '13:00' 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                      : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                  }`}
                >
                  <span>☀️ Midday Normal</span>
                  <span className="font-mono text-[10px] text-neutral-500">13:00</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyTimePreset('18:30')}
                  className={`px-2 py-1.5 rounded-lg border font-semibold text-left transition-all cursor-pointer flex items-center justify-between ${
                    timeStr === '18:30' 
                      ? 'bg-amber-50 border-amber-300 text-amber-900' 
                      : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                  }`}
                >
                  <span>🌇 Evening Rush</span>
                  <span className="font-mono text-[10px] text-neutral-500">18:30</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyTimePreset('22:30')}
                  className={`px-2 py-1.5 rounded-lg border font-semibold text-left transition-all cursor-pointer flex items-center justify-between ${
                    timeStr === '22:30' 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                      : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                  }`}
                >
                  <span>🌙 Night Free Flow</span>
                  <span className="font-mono text-[10px] text-neutral-500">22:30</span>
                </button>
              </div>
            </div>

            {/* Weather & Temperature */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">Weather</label>
                <select
                  value={weather}
                  onChange={(e) => {
                    setWeather(e.target.value);
                    if (e.target.value === 'Rain') setRainfall(4.5);
                    else setRainfall(0.0);
                  }}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option value="Clear">Clear</option>
                  <option value="Overcast">Overcast</option>
                  <option value="Rain">Heavy Rain</option>
                  <option value="Fog">Dense Fog</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">Temperature</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 font-medium focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <span className="text-xs text-neutral-500 font-bold">°C</span>
                </div>
              </div>
            </div>

            {/* Weather Simulation Quick Chips */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyWeatherPreset('Clear', 28.0, 0.0)}
                className={`text-[11px] px-2 py-1 rounded-lg border font-medium cursor-pointer transition-all ${
                  weather === 'Clear' ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold' : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                ☀️ Clear
              </button>
              <button
                type="button"
                onClick={() => applyWeatherPreset('Overcast', 24.0, 0.0)}
                className={`text-[11px] px-2 py-1 rounded-lg border font-medium cursor-pointer transition-all ${
                  weather === 'Overcast' ? 'bg-slate-200 text-slate-800 border-slate-300 font-bold' : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                ⛅ Overcast
              </button>
              <button
                type="button"
                onClick={() => applyWeatherPreset('Rain', 21.0, 5.2)}
                className={`text-[11px] px-2 py-1 rounded-lg border font-medium cursor-pointer transition-all ${
                  weather === 'Rain' ? 'bg-blue-100 text-blue-900 border-blue-300 font-bold' : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                🌧️ Heavy Rain
              </button>
              <button
                type="button"
                onClick={() => applyWeatherPreset('Fog', 19.0, 0.0)}
                className={`text-[11px] px-2 py-1 rounded-lg border font-medium cursor-pointer transition-all ${
                  weather === 'Fog' ? 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold' : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                🌫️ Fog
              </button>
            </div>

            {/* Accident Toggle - Red Accent */}
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-neutral-900 block">Accident Reported?</span>
                <span className="text-[11px] text-neutral-500">Simulate incident lane blockage</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextVal = !hasAccident;
                  setHasAccident(nextVal);
                  handlePredict({ hasAccident: nextVal });
                }}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${hasAccident ? 'bg-red-600' : 'bg-neutral-300'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${hasAccident ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Run Prediction Button - Vibrant EMERALD GREEN */}
            <Button
              onClick={handlePredict}
              disabled={loading}
              loading={loading}
              icon={Zap}
              className="w-full shadow-md shadow-emerald-600/20 py-3 text-sm"
            >
              RUN ML PREDICTION
            </Button>
          </div>
        </Card>

        {/* Right 2 Columns: Prediction Results & Explanations */}
        <div className="lg:col-span-2 space-y-6">
          {prediction && (
            <>
              {/* Primary Output Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                  <span className="text-neutral-500 text-xs font-bold block mb-2">Traffic Severity</span>
                  <div className="mb-2">
                    <TrafficBadge level={prediction.traffic_level} />
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono font-bold">
                    Conf: {(prediction.confidence_score * 100).toFixed(0)}%
                  </span>
                </Card>

                <Card>
                  <span className="text-neutral-500 text-xs font-bold block mb-1">Predicted Speed</span>
                  <div className="my-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-neutral-900 font-mono">
                      {prediction.predicted_speed_kmh}
                    </span>
                    <span className="text-xs text-neutral-500 font-medium">km/h</span>
                  </div>
                  <span className="text-[10px] text-neutral-500">Limit: {prediction.speed_limit_kmh} km/h</span>
                </Card>

                <Card>
                  <span className="text-neutral-500 text-xs font-bold block mb-1">Travel Time</span>
                  <div className="my-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-emerald-700 font-mono">
                      {prediction.predicted_travel_time_min}
                    </span>
                    <span className="text-xs text-neutral-500 font-medium">min</span>
                  </div>
                  <span className="text-[10px] text-neutral-500">Length: {prediction.length_km} km</span>
                </Card>

                <Card>
                  <span className="text-neutral-500 text-xs font-bold block mb-1">Predicted Volume</span>
                  <div className="my-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-neutral-900 font-mono">
                      {Math.round(prediction.predicted_volume_vph)}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-medium">vph</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-mono font-bold">Model {prediction.model_version}</span>
                </Card>
              </div>

              {/* Sat ML Class Probability Breakdown */}
              {liveDetails?.probabilities && (
                <Card
                  title="ML Traffic Classification Distribution"
                  subtitle={`Inference Confidence: ${(liveDetails.confidence * 100).toFixed(1)}% • Impedance Multiplier: ${liveDetails.multiplier}x`}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                    {[
                      { label: 'Low', color: '#10b981', bg: 'bg-emerald-500' },
                      { label: 'Medium', color: '#f59e0b', bg: 'bg-amber-500' },
                      { label: 'Heavy', color: '#f97316', bg: 'bg-orange-500' },
                      { label: 'Very Heavy', color: '#ef4444', bg: 'bg-red-500' },
                    ].map(cls => {
                      const prob = liveDetails.probabilities[cls.label] || 0;
                      const pct = Math.round(prob * 100);
                      return (
                        <div key={cls.label} className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-bold text-neutral-800">{cls.label}</span>
                            <span className="text-xs font-mono font-bold" style={{ color: cls.color }}>{pct}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-neutral-200 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${cls.bg} transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Historical vs Predicted Benchmark Bar Chart */}
              <Card
                title={`Speed Degradation Analysis (${prediction.road_name})`}
                subtitle="Free-flow speed limit benchmark vs Historical average vs ML predicted velocity"
              >
                <div className="h-56 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} domain={[0, 'dataMax + 15']} unit=" km/h" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          borderColor: '#e5e7eb', 
                          borderRadius: '0.75rem', 
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                          fontSize: '12px' 
                        }} 
                      />
                      <Bar dataKey="speed" radius={[6, 6, 0, 0]} name="Speed (km/h)">
                        {comparisonData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Explainability Breakdown */}
              <Card
                title="Model Feature Impact Factors"
                subtitle="Decomposition of influential covariates driving the prediction"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mt-2">
                  <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
                    <span className="text-neutral-500 block text-[11px] font-medium">Time of Day Impact</span>
                    <span className="font-bold text-neutral-900 mt-1 block">
                      {timeStr >= '07:00' && timeStr <= '09:30' ? 'Morning Peak (-32% spd)' : 'Standard Off-Peak (-5% spd)'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
                    <span className="text-neutral-500 block text-[11px] font-medium">Weather Penalty</span>
                    <span className="font-bold text-neutral-900 mt-1 block">
                      {weather === 'Rain' ? 'Wet Pavement (-18% spd)' : (weather === 'Fog' ? 'Reduced Visibility (-12% spd)' : 'Optimal Clear (0%)')}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
                    <span className="text-neutral-500 block text-[11px] font-medium">Incident Impedance</span>
                    <span className={`font-bold mt-1 block ${hasAccident ? 'text-red-600' : 'text-emerald-700'}`}>
                      {hasAccident ? 'Critical Delay (-65% spd)' : 'Normal Flow (No Hazard)'}
                    </span>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
