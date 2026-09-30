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

  // Form state
  const [source, setSource] = useState('NODE_SANTA_MONICA');
  const [destination, setDestination] = useState('NODE_DOWNTOWN_LA');
  const [distance, setDistance] = useState('27.8');
  const [predictedTime, setPredictedTime] = useState('17.0');
  const [actualTime, setActualTime] = useState('18.2');
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
      if (nodesData && nodesData.length > 0) {
        setSource(nodesData[0].name);
        setDestination(nodesData[nodesData.length - 1].name);
      }
    } catch (err) {
      console.error("Failed to load trips:", err);
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
        description="Completed driver trip telemetry stored to train and evaluate future ML model versions."
        icon={History}
        actions={
          <Button
            onClick={() => setShowModal(true)}
            icon={PlusCircle}
            variant="primary"
          >
            Record Completed Trip
          </Button>
        }
      />

      {/* 2. Hero Information Card - White Background with Emerald Accent */}
      <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
            Continuous Learning Pipeline
          </span>
          <p className="text-xs text-neutral-600 mt-1 max-w-xl">
            Every recorded trip logs the predicted vs actual duration, generating real-world residual error metrics that trigger model retraining whenever error boundaries drift.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-neutral-50 px-4 py-2 rounded-xl border border-neutral-200 text-center font-mono">
            <span className="text-[10px] text-neutral-500 uppercase font-bold block">Logged Trips</span>
            <span className="text-xl font-black text-neutral-900">{trips.length}</span>
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
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : trips.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 uppercase text-[10px] font-bold border-b border-neutral-200 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Trip ID / Date</th>
                  <th className="py-3 px-4">Origin &rarr; Destination</th>
                  <th className="py-3 px-4">Algorithm</th>
                  <th className="py-3 px-4">Distance</th>
                  <th className="py-3 px-4">Predicted Time</th>
                  <th className="py-3 px-4">Actual Time</th>
                  <th className="py-3 px-4">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-mono">
                {trips.map((t, idx) => {
                  const variance = Math.round((t.actual_time - t.predicted_time) * 10) / 10;
                  const isFaster = variance <= 0;
                  return (
                    <tr key={t.id || idx} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-neutral-900 block font-sans">#TRIP-{t.id || idx + 1}</span>
                        <span className="text-[10px] text-neutral-500">{formatTimestamp(t.created_at)}</span>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <div className="flex items-center gap-1.5 font-bold text-neutral-800">
                          <span>{t.source}</span>
                          <span className="text-neutral-400">→</span>
                          <span>{t.destination}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={t.algorithm || 'A*'} />
                      </td>
                      <td className="py-3 px-4 text-neutral-700 font-medium">
                        {formatDistance(t.distance)}
                      </td>
                      <td className="py-3 px-4 text-neutral-900 font-bold">
                        {formatDuration(t.predicted_time)}
                      </td>
                      <td className="py-3 px-4 text-neutral-900 font-bold">
                        {formatDuration(t.actual_time)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                          isFaster 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}>
                          {variance > 0 ? `+${variance}m` : `${variance}m`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-neutral-500">
            <p>No trips logged yet. Calculate a route and click "Log Completed Trip for Retraining".</p>
          </div>
        )}
      </Card>

      {/* Record Trip Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Log Completed Commuter Trip"
        icon={PlusCircle}
      >
        <form onSubmit={handleRecordNewTrip} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-neutral-700 block mb-1">Origin Location</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 font-medium focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="font-bold text-neutral-700 block mb-1">Destination Location</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 font-medium focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-neutral-700 block mb-1">Distance (km)</label>
              <input
                type="number"
                step="0.1"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 font-medium focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="font-bold text-neutral-700 block mb-1">Routing Strategy</label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 font-medium focus:outline-none focus:border-emerald-500"
              >
                <option value="A*">Fastest Route — Shortest Travel Time (A*)</option>
                <option value="Dijkstra">Shortest Path — Minimum Distance (Dijkstra)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-neutral-700 block mb-1">Predicted Time (min)</label>
              <input
                type="number"
                step="0.1"
                value={predictedTime}
                onChange={(e) => setPredictedTime(e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 font-medium focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="font-bold text-neutral-700 block mb-1">Actual Time (min)</label>
              <input
                type="number"
                step="0.1"
                value={actualTime}
                onChange={(e) => setActualTime(e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 font-medium focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              loading={submitting}
            >
              Save to Continuous DB
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
