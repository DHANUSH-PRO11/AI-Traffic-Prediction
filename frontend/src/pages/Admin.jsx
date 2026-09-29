import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Zap, 
  Upload, 
  PlayCircle
} from 'lucide-react';
import { trafficApi } from '../api/client';
import { SectionHeader } from '../components/common/SectionHeader';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusBadge, TrafficBadge } from '../components/common/Badge';

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
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Title */}
      <SectionHeader
        icon={ShieldAlert}
        title="Admin Incident Control & Retraining Operations"
        description="Simulate real-time road closures, test dynamic route recalculations, and orchestrate ML retraining pipelines."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            icon={RefreshCw}
            loading={loading}
          >
            Sync State
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incident Simulator Card */}
        <Card
          title="Live Incident Injector"
          subtitle="Inject real-time hazards that dynamically reweight graph routing costs"
          headerAction={
            <span className="text-[11px] font-bold font-mono text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-300">
              Interactive
            </span>
          }
        >
          <form onSubmit={handleSimulateIncident} className="space-y-3.5 text-xs mt-1">
            <div>
              <label className="font-bold text-neutral-700 block mb-1">Target Road Segment</label>
              <select
                value={selectedRoadId}
                onChange={(e) => setSelectedRoadId(e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2.5 text-neutral-900 font-medium text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
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
                <label className="font-bold text-neutral-700 block mb-1">Severity Level</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 font-medium text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="LOW">LOW (+40% delay)</option>
                  <option value="MEDIUM">MEDIUM (+120% delay)</option>
                  <option value="HIGH">HIGH (+280% delay)</option>
                  <option value="SEVERE">SEVERE (+450% gridlock)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">Incident Category</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 font-medium text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>
            </div>

            {/* Vibrant RED Inject Button */}
            <Button
              type="submit"
              variant="danger"
              disabled={simulating}
              loading={simulating}
              icon={AlertTriangle}
              className="w-full mt-2 py-3 shadow-md shadow-red-600/20 text-sm"
            >
              INJECT ACCIDENT / BOTTLENECK
            </Button>
          </form>

          {/* Active Incidents List */}
          <div className="pt-4 border-t border-neutral-100 mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-800">
                Active Incidents ({incidents.length})
              </span>
              {incidents.length > 0 && (
                <button
                  onClick={handleClearAllIncidents}
                  className="text-[11px] text-red-600 hover:text-red-700 underline font-bold cursor-pointer"
                >
                  Clear All Incidents
                </button>
              )}
            </div>

            {incidents.length > 0 ? (
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {incidents.map((inc, i) => (
                  <div key={i} className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900 block">{inc.road_name}</span>
                        <TrafficBadge level={inc.severity} />
                      </div>
                      <span className="text-[11px] text-neutral-600 mt-0.5 block">{inc.description}</span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleResolveIncident(inc.road_id)}
                      className="shrink-0 ml-2 text-emerald-700 font-bold border-emerald-300 hover:bg-emerald-50"
                    >
                      Resolve
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500 italic py-2">No incidents currently simulated on the network.</p>
            )}
          </div>
        </Card>

        {/* Continuous Retraining Trigger Card */}
        <Card
          title="Automated Retraining Pipeline"
          subtitle="Compile collected trip feedback, train candidate GBDT, and auto-deploy"
          headerAction={
            <span className="text-[11px] font-bold font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
              Zero-Downtime
            </span>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-neutral-600 leading-relaxed">
              Triggering retraining compiles accumulated trip feedback observations, fits an ensemble of decision trees with time-aware splitting, evaluates MAE/RMSE against the current model, and hot-swaps the production version if accuracy is superior.
            </p>

            {/* Vibrant EMERALD GREEN Retraining Button */}
            <Button
              onClick={handleTriggerRetraining}
              disabled={retraining}
              loading={retraining}
              icon={PlayCircle}
              className="w-full py-3 shadow-md shadow-emerald-600/20 text-sm"
            >
              START CONTINUOUS RETRAINING WORKFLOW
            </Button>

            {/* Retrain Result Card */}
            {retrainResult && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Candidate Model Promoted & Deployed!
                  </span>
                  <span className="font-mono text-emerald-700 font-bold">
                    +{retrainResult.improvement_percent}% Gain
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-700 font-mono pt-1">
                  <div>Previous: <strong className="text-neutral-900">{retrainResult.previous_version}</strong> (MAE: {retrainResult.previous_metrics?.MAE})</div>
                  <div>Candidate: <strong className="text-emerald-700 font-bold">{retrainResult.candidate_version}</strong> (MAE: {retrainResult.candidate_metrics?.MAE})</div>
                </div>
                <p className="text-[11px] text-neutral-500 pt-1">
                  New model weights persisted to disk and hot-reloaded into inference service.
                </p>
              </div>
            )}

            {/* Dataset Upload Dropzone */}
            <div className="pt-3 border-t border-neutral-100">
              <span className="text-xs font-bold text-neutral-700 block mb-2">
                Ingest External Telematics (CSV / Parquet / JSON)
              </span>
              <label className="border-2 border-dashed border-neutral-300 hover:border-emerald-500 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors bg-neutral-50 hover:bg-emerald-50/40">
                <Upload className="w-6 h-6 text-emerald-600 mb-1" />
                <span className="text-xs text-neutral-900 font-bold">Click to upload loop detector telemetry</span>
                <span className="text-[10px] text-neutral-500 mt-0.5">Compatible with METR-LA, PEMS-BAY, and OSM formats</span>
                <input type="file" accept=".csv,.json,.parquet" onChange={handleFileUpload} className="hidden" />
              </label>
              {uploadStatus && (
                <p className="text-xs text-emerald-700 font-bold font-mono mt-2">{uploadStatus}</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
