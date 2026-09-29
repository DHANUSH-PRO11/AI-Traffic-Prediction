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
  FileSpreadsheet
} from 'lucide-react';
import { trafficApi } from '../api/client';
import { SectionHeader, Button, Card, Modal, StatusBadge } from '../components/common';
import { formatDistance, formatDuration, formatTimestamp } from '../utils/formatters';

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
    <div className="space-y-6 max-w-6xl mx-auto pb-6">
      {/* 1. Header Section */}
      <SectionHeader
        title="User Trip History & Continuous Feedback"
        subtitle="Completed driver trip telemetry stored to train and evaluate future ML model versions."
        icon={History}
        action={
          <Button
            onClick={() => setShowModal(true)}
            icon={PlusCircle}
            variant="primary"
          >
            Record Completed Trip
          </Button>
        }
      />

      {/* 2. Hero Information Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
            Continuous Learning Pipeline
          </span>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Every recorded trip logs the predicted vs actual duration, generating real-world residual error metrics that trigger model retraining whenever error boundaries drift.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700/60 text-center font-mono">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Logged Trips</span>
            <span className="text-xl font-black text-white">{trips.length}</span>
          </div>
        </div>
      </div>

      {/* 3. Main Content: Trips Table */}
      <Card
        title="Recorded Commuter Trips"
        subtitle="Chronological list of optimized paths and variance analysis"
        action={<StatusBadge label={`${trips.length} Total`} variant="slate" />}
        bodyClassName="p-0"
      >
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
                  <th className="py-3 px-4">Accuracy / Delta</th>
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
                      <td className="py-3 px-4 text-slate-300">{formatDistance(t.distance)}</td>
                      <td className="py-3 px-4 text-emerald-300">{formatTimeMinutes(pred)}</td>
                      <td className="py-3 px-4 text-white font-bold">{formatTimeMinutes(act)}</td>
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
                        {formatTimestamp(t.created_at)}
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
      </Card>

      {/* 4. Modal: Record New Trip */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Record Completed Driver Trip"
        icon={Navigation}
      >
        <form onSubmit={handleRecordNewTrip} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-300 block mb-1">Origin Hub</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              required
            />
          </div>

          <div>
            <label className="font-semibold text-slate-300 block mb-1">Destination Hub</label>
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
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
            >
              Submit to Database
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
