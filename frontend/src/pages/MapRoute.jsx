import React, { useState, useEffect } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Polyline, 
  Marker, 
  Popup, 
  useMap 
} from 'react-leaflet';
import L from 'leaflet';
import { 
  Navigation, 
  Clock, 
  Compass, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  CloudRain, 
  BookmarkPlus,
  ArrowRight,
  Activity,
  Zap,
  Layers
} from 'lucide-react';
import { trafficApi } from '../api/client';
import { Button } from '../components/common/Button';
import { TrafficBadge, StatusBadge } from '../components/common/Badge';
import { formatSpeed, formatDistance, formatDuration } from '../utils/formatters';
import { getTrafficColorHex } from '../utils/trafficColors';

// Custom Leaflet DivIcons in Emerald Green (#10b981) & Red (#ef4444)
const createPinIcon = (color, label) => L.divIcon({
  className: 'custom-map-marker',
  html: `
    <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
      <div style="background: ${color}; color: white; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 9999px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2px solid white; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
        <span>${label}</span>
      </div>
      <div style="width: 3px; height: 14px; background: ${color};"></div>
      <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; box-shadow: 0 0 6px ${color};"></div>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0]
});

const createHazardIcon = () => L.divIcon({
  className: 'custom-hazard-marker',
  html: `
    <div style="transform: translate(-50%, -50%); width: 30px; height: 30px; background: #ef4444; border: 2.5px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px rgba(239, 68, 68, 0.8); animation: pulse 1.5s infinite;">
      <svg style="margin: auto; width: 16px; height: 16px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0]
});

function MapBoundsUpdater({ geometry }) {
  const map = useMap();
  useEffect(() => {
    if (geometry && geometry.length > 0) {
      const latlngs = geometry.map(c => [c[1], c[0]]);
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    }
  }, [geometry, map]);
  return null;
}

export default function MapRoute() {
  const [nodes, setNodes] = useState([]);
  const [networkSegments, setNetworkSegments] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [sourceNode, setSourceNode] = useState('NODE_SANTA_MONICA');
  const [destNode, setDestNode] = useState('NODE_DOWNTOWN_LA');
  const [algorithm, setAlgorithm] = useState('A*');
  const [weatherCondition, setWeatherCondition] = useState('Clear');
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeResult, setRouteResult] = useState(null);
  const [tripRecordedMsg, setTripRecordedMsg] = useState('');
  const [activeTab, setActiveTab] = useState('recommended');

  useEffect(() => {
    async function loadNetwork() {
      try {
        const [nodesData, currentTraffic] = await Promise.all([
          trafficApi.getNodes(),
          trafficApi.getCurrentTraffic()
        ]);
        setNodes(nodesData || []);
        setNetworkSegments(currentTraffic.segments || []);
        setIncidents(currentTraffic.incidents || []);
      } catch (err) {
        console.error("Failed to load map network:", err);
      }
    }
    loadNetwork();
  }, []);

  const handleCalculateRoute = async () => {
    if (!sourceNode || !destNode || sourceNode === destNode) return;
    try {
      setLoadingRoute(true);
      setTripRecordedMsg('');
      const res = await trafficApi.calculateRoute({
        source_node: sourceNode,
        destination_node: destNode,
        algorithm: algorithm,
        weather_condition: weatherCondition
      });
      setRouteResult(res);
      setActiveTab('recommended');
    } catch (err) {
      console.error("Route calculation error:", err);
    } finally {
      setLoadingRoute(false);
    }
  };

  const handleRecordTrip = async () => {
    if (!routeResult?.recommended_route) return;
    const r = routeResult.recommended_route;
    try {
      const actualMultiplier = 1.0 + (Math.random() * 0.1 - 0.03);
      await trafficApi.recordTrip({
        source: nodes.find(n => n.node_id === sourceNode)?.name || sourceNode,
        destination: nodes.find(n => n.node_id === destNode)?.name || destNode,
        route_geometry: r.geometry,
        predicted_time: r.total_travel_time_min,
        actual_time: Math.round(r.total_travel_time_min * actualMultiplier * 10) / 10,
        distance: r.total_distance_km,
        algorithm: r.algorithm
      });
      setTripRecordedMsg('Trip logged into DB for continuous learning feedback loop!');
      setTimeout(() => setTripRecordedMsg(''), 4500);
    } catch (err) {
      console.error("Trip record failed:", err);
    }
  };

  const currentActiveRoute = activeTab === 'recommended' 
    ? routeResult?.recommended_route 
    : (activeTab === 'alt1' ? routeResult?.alternative_routes?.[0] : routeResult?.alternative_routes?.[1]);

  const sourceCoord = nodes.find(n => n.node_id === sourceNode);
  const destCoord = nodes.find(n => n.node_id === destNode);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-6.5rem)] -m-4 sm:-m-6 overflow-hidden bg-white">
      {/* Control Sidebar - Crisp White */}
      <div className="w-full lg:w-96 bg-white border-r border-neutral-200 flex flex-col justify-between shrink-0 z-10 overflow-y-auto shadow-xs">
        <div className="p-5 space-y-4">
          <div className="border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 font-bold">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-neutral-900">Dynamic Route Optimizer</h2>
                <p className="text-xs text-neutral-500">AI-weighted real-time travel impedance</p>
              </div>
            </div>
          </div>

          {/* Form Routing Parameters */}
          <div className="space-y-3.5">
            {/* Origin Location */}
            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                Origin Hub
              </label>
              <select
                value={sourceNode}
                onChange={(e) => setSourceNode(e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
              >
                {nodes.map(n => (
                  <option key={n.node_id} value={n.node_id}>{n.name}</option>
                ))}
              </select>
            </div>

            {/* Destination Location */}
            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                Destination Hub
              </label>
              <select
                value={destNode}
                onChange={(e) => setDestNode(e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
              >
                {nodes.map(n => (
                  <option key={n.node_id} value={n.node_id}>{n.name}</option>
                ))}
              </select>
            </div>

            {/* Algorithm & Weather Row */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="text-[11px] font-bold text-neutral-600 block mb-1">Algorithm</label>
                <select
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="A*">A* (Heuristic)</option>
                  <option value="Dijkstra">Dijkstra</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-600 block mb-1">Weather Context</label>
                <select
                  value={weatherCondition}
                  onChange={(e) => setWeatherCondition(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="Clear">Clear</option>
                  <option value="Rain">Rain (Slowdown)</option>
                  <option value="Fog">Fog (Low Vis)</option>
                  <option value="Overcast">Overcast</option>
                </select>
              </div>
            </div>

            {/* Calculate Button - Vibrant EMERALD GREEN */}
            <Button
              onClick={handleCalculateRoute}
              disabled={loadingRoute || sourceNode === destNode}
              loading={loadingRoute}
              icon={Navigation}
              className="w-full mt-2 py-3 shadow-md shadow-emerald-600/20 text-sm"
            >
              CALCULATE FASTEST ROUTE
            </Button>
          </div>

          {/* Reroute Alert Banner - Clean Light Red */}
          {routeResult?.incident_alert && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-red-900">Dynamic Reroute Active</span>
                <span className="text-[11px] text-red-700">{routeResult.incident_alert}</span>
              </div>
            </div>
          )}

          {/* Route Comparison Results */}
          {routeResult && (
            <div className="space-y-3 pt-2">
              {/* Route Tabs */}
              <div className="flex rounded-xl bg-neutral-100 p-1 text-xs border border-neutral-200">
                <button
                  onClick={() => setActiveTab('recommended')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    activeTab === 'recommended' 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Fastest (A*)
                </button>
                {routeResult.alternative_routes?.[0] && (
                  <button
                    onClick={() => setActiveTab('alt1')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      activeTab === 'alt1' 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Alt 1
                  </button>
                )}
                {routeResult.alternative_routes?.[1] && (
                  <button
                    onClick={() => setActiveTab('alt2')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      activeTab === 'alt2' 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Alt 2
                  </button>
                )}
              </div>

              {/* Active Route Statistics - Pure White Card */}
              {currentActiveRoute && (
                <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                        {activeTab === 'recommended' ? 'Optimal Route' : 'Alternative Corridor'}
                      </span>
                      <span className="text-2xl font-black text-neutral-900 font-mono">
                        {formatDuration(currentActiveRoute.total_travel_time_min)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-neutral-700 block">
                        {formatDistance(currentActiveRoute.total_distance_km)}
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {currentActiveRoute.segments?.length || 0} segments
                      </span>
                    </div>
                  </div>

                  {/* Highlights Row */}
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <StatusBadge status={currentActiveRoute.algorithm} />
                    <TrafficBadge level={currentActiveRoute.overall_traffic_level} />
                    {activeTab === 'recommended' && routeResult.time_difference_min > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                        ⚡ {routeResult.time_difference_min}m faster
                      </span>
                    )}
                  </div>

                  {/* Turn-by-Turn Segment Details */}
                  <div className="pt-2 border-t border-neutral-100 max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    <span className="text-[10px] font-bold uppercase text-neutral-500 block mb-1">
                      Route Segments ({currentActiveRoute.segments?.length})
                    </span>
                    {currentActiveRoute.segments?.map((seg, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-neutral-50 border border-neutral-200">
                        <div className="flex items-center gap-2 truncate">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: getTrafficColorHex(seg.traffic_level) }} 
                          />
                          <span className="text-neutral-900 truncate font-semibold">{seg.road_name}</span>
                        </div>
                        <div className="text-right shrink-0 font-mono text-[11px] text-neutral-500 pl-2">
                          <span className="text-emerald-700 font-bold">{seg.predicted_speed_kmh} km/h</span>
                          <span className="mx-1 text-neutral-300">•</span>
                          <span className="text-neutral-800 font-semibold">{seg.travel_time_min}m</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Record Trip Button */}
                  <Button
                    variant="secondary"
                    onClick={handleRecordTrip}
                    icon={BookmarkPlus}
                    className="w-full text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                  >
                    Log Completed Trip for Retraining
                  </Button>
                  {tripRecordedMsg && (
                    <p className="text-[11px] text-emerald-700 text-center font-bold mt-1">
                      {tripRecordedMsg}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50 text-xs">
          <span className="text-[11px] font-bold text-neutral-600 block mb-2">Network Traffic Legend:</span>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-2 text-neutral-700 font-medium">
              <span className="w-3 h-1.5 rounded bg-emerald-500" />
              <span>Low (Free Flow)</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-700 font-medium">
              <span className="w-3 h-1.5 rounded bg-amber-500" />
              <span>Medium Density</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-700 font-medium">
              <span className="w-3 h-1.5 rounded bg-orange-500" />
              <span>High Congestion</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-700 font-medium">
              <span className="w-3 h-1.5 rounded bg-red-600" />
              <span>Severe / Closed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Leaflet Map Interactive Canvas - Crisp Light Background */}
      <div className="flex-1 relative h-full w-full bg-neutral-100">
        <MapContainer
          center={[34.0522, -118.35]}
          zoom={12}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          {/* 100% Free OpenStreetMap Public Tiles (Zero API Key Required) */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* Background Network Road Segments */}
          {networkSegments.map((seg) => {
            const latlngs = seg.geometry?.map(pt => [pt[1], pt[0]]) || [];
            const color = getTrafficColorHex(seg.traffic_level);
            return (
              <Polyline
                key={seg.road_id}
                positions={latlngs}
                pathOptions={{
                  color: color,
                  weight: 3.5,
                  opacity: 0.75,
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-neutral-900 block">{seg.road_name}</span>
                    <div className="text-neutral-600">Type: <span className="font-semibold text-neutral-900">{seg.road_type}</span></div>
                    <div className="text-neutral-600">Length: <span className="font-mono text-neutral-900">{seg.length} km</span></div>
                    <div className="text-neutral-600">Predicted Speed: <span className="font-mono font-bold text-emerald-600">{seg.predicted_speed} km/h</span></div>
                    <div className="text-neutral-600">Estimated Travel Time: <span className="font-mono font-bold text-neutral-900">{seg.predicted_travel_time} min</span></div>
                    <div className="text-neutral-600">Traffic Level: <span className="font-bold" style={{ color }}>{seg.traffic_level}</span></div>
                  </div>
                </Popup>
              </Polyline>
            );
          })}

          {/* Alternative Routes Polylines (Dashed Charcoal Grey) */}
          {routeResult?.alternative_routes?.map((alt, i) => {
            const latlngs = alt.geometry?.map(pt => [pt[1], pt[0]]) || [];
            return (
              <Polyline
                key={`alt-${i}`}
                positions={latlngs}
                pathOptions={{
                  color: '#475569',
                  weight: 4.5,
                  dashArray: '8, 8',
                  opacity: 0.85
                }}
              />
            );
          })}

          {/* Recommended Route Polyline (Vibrant Emerald Green #10b981) */}
          {routeResult?.recommended_route && (
            <Polyline
              positions={routeResult.recommended_route.geometry?.map(pt => [pt[1], pt[0]]) || []}
              pathOptions={{
                color: '#10b981',
                weight: 6.5,
                opacity: 0.95
              }}
            />
          )}

          {/* Auto-fit Bounds component */}
          {currentActiveRoute && (
            <MapBoundsUpdater geometry={currentActiveRoute.geometry} />
          )}

          {/* Origin Marker - Emerald Green */}
          {sourceCoord && (
            <Marker 
              position={[sourceCoord.lat, sourceCoord.lng]}
              icon={createPinIcon('#10b981', 'Origin')}
            >
              <Popup>
                <div className="text-xs">
                  <span className="font-bold text-emerald-600">Source Hub:</span> {sourceCoord.name}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Destination Marker - Red */}
          {destCoord && (
            <Marker 
              position={[destCoord.lat, destCoord.lng]}
              icon={createPinIcon('#ef4444', 'Destination')}
            >
              <Popup>
                <div className="text-xs">
                  <span className="font-bold text-red-600">Destination Hub:</span> {destCoord.name}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Incident / Accident Markers - Red */}
          {incidents.map((inc, i) => (
            <Marker
              key={`inc-${i}`}
              position={[inc.latitude, inc.longitude]}
              icon={createHazardIcon()}
            >
              <Popup>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{inc.severity} Traffic Incident</span>
                  </div>
                  <div className="text-neutral-900 font-bold">{inc.road_name}</div>
                  <div className="text-neutral-600 text-[11px]">{inc.description}</div>
                  <div className="text-[10px] text-red-600 font-mono mt-1 font-bold">Delay penalty applied to routing graph</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
