import React, { useState, useEffect } from 'react';
import { 
  History, 
  PlusCircle, 
  Navigation, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  Sparkles,
  TrendingUp,
  X
} from 'lucide-react';
import { trafficApi } from '../api/client';

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // New trip form state
  const [source, setSource] = useState('Santa Monica Pier');
  const [destination, setDestination] = useState('Downtown LA Grand');
  const [distance, setDistance] = useState(24.5);
  const [predictedTime, setPredictedTime] = useState(25.0);
  const [actualTime, setActualTime] = useState(26.2);
  const [algorithm, setAlgorithm] = useState('A*');
  const [submitting, setSubmitting] = useState(false);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const [tripsData, nodesData] = await Promise.all([
        trafficApi.getTrips(),
        trafficApi.getNodes()
      ]);
      setTrips(tripsData || []);
      setNodes(nodesData || []);
    } catch (err) {
      console.error("Failed to fetch trips:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  const handleRecordNewTrip = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await trafficApi.recordTrip({
        source,
        destination,
        distance: parseFloat(distance),
        predicted_time: parseFloat(predictedTime),
        actual_time: parseFloat(actualTime),
        algorithm,
        route_geometry: [[-118.4965, 34.0102], [-118.2518, 34.0488]]
      });
      setShowModal(false);
      await loadTrips();
    } catch (err) {
      console.error("Failed to record trip:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-400" />
            User Trip History & Continuous Learning Data
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Historical trip observations stored for validation and ML model periodic retraining.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/30 transition-all"
        >
          <PlusCircle className="w-4 h-4 text-emerald-200" />
          <span>Record Completed Trip</span>
        </button>
      </div>

      {/* Trips Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-base text-white">Recorded Commuter Trips</h3>
          <span className="text-xs text-slate-400 font-mono">{trips.length} Total Records</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : trips.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-slate-400 bg-slate-900/60 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Trip Route</th>
                  <th className="py-3 px-4">Distance</th>
                  <th className="py-3 px-4">Predicted Time</th>
                  <th className="py-3 px-4">Actual Time</th>
                  <th className="py-3 px-4">Variance</th>
                  <th className="py-3 px-4">Algorithm</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {trips.map((t) => {
                  const pred = t.predicted_time;
                  const act = t.actual_time || pred;
                  const diff = Math.round((act - pred) * 10) / 10;
                  const variancePct = Math.round((Math.abs(diff) / pred) * 100);

                  return (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-sans font-medium text-white flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{t.source}</span>
                        <span className="text-slate-500">→</span>
                        <span>{t.destination}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{t.distance} km</td>
                      <td className="py-3 px-4 text-emerald-300">{pred} min</td>
                      <td className="py-3 px-4 text-white font-bold">{act} min</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${Math.abs(diff) <= 2 ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}`}>
                          {diff > 0 ? `+${diff}` : diff}m ({variancePct}%)
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                          {t.algorithm || 'A*'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-slate-400">
            No trip records found. Record your first trip to populate data!
          </div>
        )}
      </div>

      {/* Modal: Record New Trip */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Navigation className="w-4 h-4 text-emerald-400" />
                Record Completed Trip Data
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordNewTrip} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Origin</label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Destination</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Distance (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Algorithm</label>
                  <select
                    value={algorithm}
                    onChange={(e) => setAlgorithm(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="A*">A*</option>
                    <option value="Dijkstra">Dijkstra</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Predicted Time (min)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={predictedTime}
                    onChange={(e) => setPredictedTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Actual Time (min)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={actualTime}
                    onChange={(e) => setActualTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-600/30 flex items-center space-x-1.5"
                >
                  {submitting ? 'Saving...' : 'Submit to Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
