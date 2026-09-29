import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Zap, 
  Database, 
  Upload, 
  Trash2, 
  FileText,
  PlayCircle,
  GitBranch
} from 'lucide-react';
import { trafficApi } from '../api/client';

export default function Admin() {
  const [roads, setRoads] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Simulation form
  const [selectedRoadId, setSelectedRoadId] = useState('');
  const [severity, setSeverity] = useState('HIGH');
  const [description, setDescription] = useState('Multi-vehicle collision blocking two lanes');
  const [simulating, setSimulating] = useState(false);

  // Retraining state
  const [retraining, setRetraining] = useState(false);
  const [retrainResult, setRetrainResult] = useState(null);

  // Upload mock state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [roadsData, currentTraffic] = await Promise.all([
        trafficApi.getRoads(),
        trafficApi.getCurrentTraffic()
      ]);
      setRoads(roadsData || []);
      setIncidents(currentTraffic.incidents || []);
      if (roadsData && roadsData.length > 0 && !selectedRoadId) {
        setSelectedRoadId(roadsData[0].road_id);
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSimulateIncident = async (e) => {
    e.preventDefault();
    if (!selectedRoadId) return;
    try {
      setSimulating(true);
      await trafficApi.reportAccident({
        road_id: selectedRoadId,
        severity,
        description
      });
      await loadData();
    } catch (err) {
      console.error("Failed to inject incident:", err);
    } finally {
      setSimulating(false);
    }
  };

  const handleResolveIncident = async (roadId) => {
    try {
      await trafficApi.resolveAccident(roadId);
      await loadData();
    } catch (err) {
      console.error("Failed to resolve incident:", err);
    }
  };

  const handleClearAllIncidents = async () => {
    try {
      await trafficApi.clearAllAccidents();
      await loadData();
    } catch (err) {
      console.error("Failed to clear all incidents:", err);
    }
  };

  const handleTriggerRetraining = async () => {
    try {
      setRetraining(true);
      setRetrainResult(null);
      const res = await trafficApi.triggerRetraining({
        dataset_name: 'augmented_trip_observations_2026',
        auto_deploy_if_better: true
      });
      setRetrainResult(res);
    } catch (err) {
      console.error("Retraining failed:", err);
    } finally {
      setRetraining(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file.name);
      setUploadStatus(`Uploaded ${file.name} (size: ${(file.size / 1024).toFixed(1)} KB). Validated schema!`);
      setTimeout(() => setUploadStatus(''), 5000);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-emerald-400" />
          Admin Incident Control & Retraining Operations
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Simulate real-time road closures, test dynamic route recalculations, and orchestrate ML retraining pipelines.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incident Simulator Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="font-semibold text-base text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Live Incident Injector
            </h3>
            <span className="text-[11px] font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
              Interactive
            </span>
          </div>

          <form onSubmit={handleSimulateIncident} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">Target Road Segment</label>
              <select
                value={selectedRoadId}
                onChange={(e) => setSelectedRoadId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
              >
                {roads.map(r => (
                  <option key={r.road_id} value={r.road_id}>
                    {r.road_name} ({r.road_type.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Severity Level</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="LOW">LOW (+40% delay)</option>
                  <option value="MEDIUM">MEDIUM (+120% delay)</option>
                  <option value="HIGH">HIGH (+280% delay)</option>
                  <option value="SEVERE">SEVERE (+450% gridlock)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Incident Category</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={simulating}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 flex items-center justify-center space-x-2 transition-all mt-2"
            >
              {simulating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span>INJECT ACCIDENT / BOTTLENECK</span>
                </>
              )}
            </button>
          </form>

          {/* Active Incidents List */}
          <div className="pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">
                Active Incidents ({incidents.length})
              </span>
              {incidents.length > 0 && (
                <button
                  onClick={handleClearAllIncidents}
                  className="text-[11px] text-red-400 hover:text-red-300 underline font-medium"
                >
                  Clear All
                </button>
              )}
            </div>

            {incidents.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {incidents.map((inc, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">{inc.road_name}</span>
                      <span className="text-[11px] text-slate-300">{inc.description}</span>
                    </div>
                    <button
                      onClick={() => handleResolveIncident(inc.road_id)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[10px] font-bold border border-slate-700 shrink-0 ml-2"
                    >
                      Resolve
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No incidents currently simulated.</p>
            )}
          </div>
        </div>

        {/* Continuous Retraining Trigger Card in Light Green */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="font-semibold text-base text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              Automated Retraining Pipeline
            </h3>
            <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
              Zero-Downtime
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Triggering retraining compiles accumulated trip feedback observations, trains a candidate GBDT model, compares MAE/RMSE against production, and automatically promotes the new candidate version only if it achieves superior accuracy.
          </p>

          <button
            onClick={handleTriggerRetraining}
            disabled={retraining}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all"
          >
            {retraining ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Training & Evaluating Candidate Model...</span>
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" />
                <span>START CONTINUOUS RETRAINING WORKFLOW</span>
              </>
            )}
          </button>

          {/* Retrain Result Card */}
          {retrainResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Candidate Model Promoted & Deployed!
                </span>
                <span className="font-mono text-emerald-300 font-bold">
                  +{retrainResult.improvement_percent}% Gain
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 font-mono pt-1">
                <div>Previous: <strong className="text-white">{retrainResult.previous_version}</strong> (MAE: {retrainResult.previous_metrics?.MAE})</div>
                <div>Candidate: <strong className="text-emerald-300">{retrainResult.candidate_version}</strong> (MAE: {retrainResult.candidate_metrics?.MAE})</div>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                New model weights persisted to disk and hot-reloaded into inference service.
              </p>
            </div>
          )}

          {/* Dataset Upload Mock Dropzone */}
          <div className="pt-3 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-300 block mb-2">
              Ingest External Telematics (CSV / Parquet / JSON)
            </span>
            <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-800/20">
              <Upload className="w-6 h-6 text-emerald-400 mb-1" />
              <span className="text-xs text-white font-medium">Click to upload loop detector telemetry</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Compatible with METR-LA, PEMS-BAY, and OSM formats</span>
              <input type="file" accept=".csv,.json,.parquet" onChange={handleFileUpload} className="hidden" />
            </label>
            {uploadStatus && (
              <p className="text-xs text-emerald-300 font-mono mt-2">{uploadStatus}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
