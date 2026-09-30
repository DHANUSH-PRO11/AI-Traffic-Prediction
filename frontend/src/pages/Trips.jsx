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
  FileSpreadsheet,
  Search,
  Download,
  Filter,
  X,
  Compass
} from 'lucide-react';
import { trafficApi } from '../api/client';
import { SectionHeader, Button, Card, Modal, StatusBadge } from '../components/common';
import { formatDistance, formatDuration, formatTimestamp } from '../utils/formatters';

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [algorithmFilter, setAlgorithmFilter] = useState('ALL');

  // Form state
  const [source, setSource] = useState('Chennai');
  const [destination, setDestination] = useState('Coimbatore');
  const [distance, setDistance] = useState('504.0');
  const [predictedTime, setPredictedTime] = useState('480.0');
  const [actualTime, setActualTime] = useState('492.0');
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
        route_geometry: [[80.2707, 13.0827], [76.9558, 11.0168]]
      });
      setShowModal(false);
      await loadTrips();
    } catch (err) {
      console.error("Failed to record trip:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered trips
  const filteredTrips = trips.filter(t => {
    const sTerm = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      (t.source && t.source.toLowerCase().includes(sTerm)) ||
      (t.destination && t.destination.toLowerCase().includes(sTerm)) ||
      (`TRIP-${t.id}`.toLowerCase().includes(sTerm));
    const matchesAlgo = algorithmFilter === 'ALL' || t.algorithm === algorithmFilter;
    return matchesSearch && matchesAlgo;
  });

  // KPI Calculations
  const totalDistance = trips.reduce((sum, t) => sum + (Number(t.distance) || 0), 0);
  const avgVariance = trips.length > 0 
    ? (trips.reduce((sum, t) => sum + Math.abs((Number(t.actual_time) || 0) - (Number(t.predicted_time) || 0)), 0) / trips.length).toFixed(1)
    : '0.0';
  const onTimeCount = trips.filter(t => (Number(t.actual_time) || 0) <= (Number(t.predicted_time) || 0) + 3).length;
  const onTimeRate = trips.length > 0 ? Math.round((onTimeCount / trips.length) * 100) : 100;

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!filteredTrips.length) return;
    const headers = ['Trip ID', 'Timestamp', 'Origin', 'Destination', 'Algorithm', 'Distance (km)', 'Predicted Time (min)', 'Actual Time (min)', 'Variance (min)'];
    const rows = filteredTrips.map(t => {
      const variance = (Number(t.actual_time || 0) - Number(t.predicted_time || 0)).toFixed(1);
      return [
        `"TRIP-${t.id}"`,
        `"${t.created_at || ''}"`,
        `"${t.source || ''}"`,
        `"${t.destination || ''}"`,
        `"${t.algorithm || 'A*'}"`,
        t.distance || 0,
        t.predicted_time || 0,
        t.actual_time || 0,
        variance
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `traffic_trips_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-6">
      {/* 1. Header Section */}
      <SectionHeader
        title="User Trip History & Continuous Feedback"
        description="Completed driver trip telemetry stored to train and evaluate future ML model versions."
        icon={History}
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExportCSV}
              icon={Download}
              variant="secondary"
              disabled={trips.length === 0}
            >
              Export CSV
            </Button>
            <Button
              onClick={() => setShowModal(true)}
              icon={PlusCircle}
              variant="primary"
            >
              Record Completed Trip
            </Button>
          </div>
        }
      />

      {/* 2. Key Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Logged Trips</span>
            <Compass className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-neutral-900 font-mono">
            {trips.length}
          </div>
          <span className="text-[11px] text-neutral-500 mt-1 block">Continuous database</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Tracked</span>
            <Navigation className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-neutral-900 font-mono">
            {formatDistance(totalDistance)}
          </div>
          <span className="text-[11px] text-neutral-500 mt-1 block">Tamil Nadu highway network</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Mean Variance</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-neutral-900 font-mono">
            ±{avgVariance}m
          </div>
          <span className="text-[11px] text-neutral-500 mt-1 block">Predicted vs actual travel</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">On-Time Accuracy</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            {onTimeRate}%
          </div>
          <span className="text-[11px] text-neutral-500 mt-1 block">Within +3 min margin</span>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="p-3 bg-white rounded-xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by city (e.g. Chennai, Madurai) or Trip ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:border-emerald-500 bg-neutral-50 focus:bg-white text-neutral-900"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <span className="text-xs text-neutral-500 font-semibold shrink-0">Strategy:</span>
          <select
            value={algorithmFilter}
            onChange={(e) => setAlgorithmFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-800 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Strategies</option>
            <option value="A*">Fastest Route (A*)</option>
            <option value="Dijkstra">Shortest Path (Dijkstra)</option>
          </select>
          <span className="text-xs text-neutral-500 font-mono ml-2">
            Showing {filteredTrips.length} of {trips.length}
          </span>
        </div>
      </div>

      {/* 4. Main Content: Trips Table */}
      <Card
        title="Recorded Commuter Trips"
        subtitle="Chronological list of optimized paths and variance analysis"
        action={<StatusBadge label={`${filteredTrips.length} Shown`} variant="slate" />}
        bodyClassName="p-0"
      >
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTrips.length > 0 ? (
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
                {filteredTrips.map((t, idx) => {
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
        ) : trips.length > 0 ? (
          <div className="p-12 text-center text-neutral-500 space-y-3">
            <p className="font-semibold text-neutral-700">No trips matching "{searchTerm || algorithmFilter}"</p>
            <p className="text-xs text-neutral-500">Try adjusting your search query or reset the filter.</p>
            <button
              onClick={() => { setSearchTerm(''); setAlgorithmFilter('ALL'); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold border border-emerald-200 cursor-pointer"
            >
              Reset All Filters
            </button>
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
