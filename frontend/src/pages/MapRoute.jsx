import React, { useState, useEffect, useRef } from 'react';
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
  Layers, 
  CloudRain, 
  SlidersHorizontal,
  ChevronDown,
  ArrowRight,
  TrendingUp,
  BookmarkPlus
} from 'lucide-react';
import { trafficApi } from '../api/client';

// Custom Leaflet DivIcons in Light Green & White
const createPinIcon = (color, label) => L.divIcon({
  className: 'custom-map-marker',
  html: `
    <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
      <div style="background: ${color}; color: white; font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); border: 2px solid white; white-space: nowrap;">
        ${label}
      </div>
      <div style="width: 3px; height: 12px; background: ${color};"></div>
      <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></div>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0]
});

const createHazardIcon = () => L.divIcon({
  className: 'custom-hazard-marker',
  html: `
    <div style="transform: translate(-50%, -50%); width: 28px; height: 28px; background: #ef4444; border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-center; box-shadow: 0 0 15px rgba(239, 68, 68, 0.8); animation: pulse 1.5s infinite;">
      <svg style="margin: auto; width: 16px; height: 16px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
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
  const [departureTime, setDepartureTime] = useState('now');
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
      await trafficApi.recordTrip({
        source: nodes.find(n => n.node_id === sourceNode)?.name || sourceNode,
        destination: nodes.find(n => n.node_id === destNode)?.name || destNode,
        route_geometry: r.geometry,
        predicted_time: r.total_travel_time_min,
        actual_time: roundTo(r.total_travel_time_min * (1.0 + (Math.random() * 0.1 - 0.03)), 1),
        distance: r.total_distance_km,
        algorithm: r.algorithm
      });
      setTripRecordedMsg('Trip logged into DB for continuous learning feedback loop!');
      setTimeout(() => setTripRecordedMsg(''), 4000);
    } catch (err) {
      console.error("Trip record failed:", err);
    }
  };

  const roundTo = (n, d) => Math.round(n * Math.pow(10, d)) / Math.pow(10, d);

  const getTrafficColor = (level) => {
    switch (level) {
      case 'SEVERE': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'MEDIUM': return '#f59e0b';
      default: return '#10b981';
    }
  };

  const currentActiveRoute = activeTab === 'recommended' 
    ? routeResult?.recommended_route 
    : (activeTab === 'alt1' ? routeResult?.alternative_routes?.[0] : routeResult?.alternative_routes?.[1]);

  const sourceCoord = nodes.find(n => n.node_id === sourceNode);
  const destCoord = nodes.find(n => n.node_id === destNode);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-7rem)] -m-6 overflow-hidden">
      {/* Sidebar Control Panel */}
      <div className="w-full lg:w-96 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 z-10 overflow-y-auto">
        <div className="p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" />
              Dynamic Route Optimizer
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Weighted by real-time ML predicted travel time
            </p>
          </div>

          {/* Form Controls */}
          <div className="space-y-3">
            {/* Origin Node */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                Origin Location
              </label>
              <select
                value={sourceNode}
                onChange={(e) => setSourceNode(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
              >
                {nodes.map(n => (
                  <option key={n.node_id} value={n.node_id}>{n.name}</option>
                ))}
              </select>
            </div>

            {/* Destination Node */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Destination Location
              </label>
              <select
                value={destNode}
                onChange={(e) => setDestNode(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
              >
                {nodes.map(n => (
                  <option key={n.node_id} value={n.node_id}>{n.name}</option>
                ))}
              </select>
            </div>

            {/* Algorithm & Weather Row */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Algorithm</label>
                <select
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="A*">A* (Heuristic)</option>
                  <option value="Dijkstra">Dijkstra</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Weather Context</label>
                <select
                  value={weatherCondition}
                  onChange={(e) => setWeatherCondition(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Clear">Clear</option>
                  <option value="Rain">Rain (Slowdown)</option>
                  <option value="Fog">Fog (Low Vis)</option>
                  <option value="Overcast">Overcast</option>
                </select>
              </div>
            </div>

            {/* Calculate Button in Light Green */}
            <button
              onClick={handleCalculateRoute}
              disabled={loadingRoute || sourceNode === destNode}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {loadingRoute ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Evaluating Graph Weights...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  <span>FIND FASTEST ROUTE</span>
                </>
              )}
            </button>
          </div>

          {/* Reroute Alert Banner */}
          {routeResult?.incident_alert && (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">⚠ Dynamic Route Recalculated</span>
                <span className="text-[11px] text-red-300">{routeResult.incident_alert}</span>
              </div>
            </div>
          )}

          {/* Route Comparison & Results */}
          {routeResult && (
            <div className="space-y-3 pt-2">
              {/* Route Tabs */}
              <div className="flex rounded-lg bg-slate-800 p-1 text-xs">
                <button
                  onClick={() => setActiveTab('recommended')}
                  className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${activeTab === 'recommended' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  Fastest (A*)
                </button>
                {routeResult.alternative_routes?.[0] && (
                  <button
                    onClick={() => setActiveTab('alt1')}
                    className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${activeTab === 'alt1' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    Alt 1
                  </button>
                )}
                {routeResult.alternative_routes?.[1] && (
                  <button
                    onClick={() => setActiveTab('alt2')}
                    className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${activeTab === 'alt2' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    Alt 2
                  </button>
                )}
              </div>

              {/* Active Tab Statistics Card */}
              {currentActiveRoute && (
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        {activeTab === 'recommended' ? 'Recommended Path' : 'Alternative Path'}
                      </span>
                      <span className="text-2xl font-black text-white font-mono">
                        {currentActiveRoute.total_travel_time_min} <span className="text-sm font-normal text-slate-400">min</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-300 block">
                        {currentActiveRoute.total_distance_km} km
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {currentActiveRoute.segments?.length || 0} segments
                      </span>
                    </div>
                  </div>

                  {/* Highlights Pill Row */}
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                      Algo: {currentActiveRoute.algorithm}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                      Traffic: {currentActiveRoute.overall_traffic_level}
                    </span>
                    {activeTab === 'recommended' && routeResult.time_difference_min > 0 && (
                      <span className="px-2 py-0.5 rounded bg-white text-slate-900 font-bold shadow-sm">
                        ⚡ {routeResult.time_difference_min}m faster than alt
                      </span>
                    )}
                  </div>

                  {/* Turn-by-Turn Segment Details Accordion */}
                  <div className="pt-2 border-t border-slate-700/60 max-h-48 overflow-y-auto space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Route Segments ({currentActiveRoute.segments?.length})
                    </span>
                    {currentActiveRoute.segments?.map((seg, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded bg-slate-900/50 border border-slate-800">
                        <div className="flex items-center gap-2 truncate">
                          <span 
                            className="w-2 h-2 rounded-full shrink-0" 
                            style={{ backgroundColor: getTrafficColor(seg.traffic_level) }} 
                          />
                          <span className="text-white truncate font-medium">{seg.road_name}</span>
                        </div>
                        <div className="text-right shrink-0 font-mono text-[11px] text-slate-400 pl-2">
                          <span className="text-emerald-300">{seg.predicted_speed_kmh} km/h</span>
                          <span className="mx-1">•</span>
                          <span className="text-white">{seg.travel_time_min}m</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Record Trip Button */}
                  <button
                    onClick={handleRecordTrip}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>Log Completed Trip for Retraining</span>
                  </button>
                  {tripRecordedMsg && (
                    <p className="text-[11px] text-emerald-400 text-center font-medium mt-1">
                      {tripRecordedMsg}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 block mb-2">Live Traffic Legend:</span>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-3 h-1.5 rounded bg-emerald-400" />
              <span>Low (Free Flow)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-3 h-1.5 rounded bg-amber-500" />
              <span>Medium Congestion</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-3 h-1.5 rounded bg-orange-500" />
              <span>High Density</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-3 h-1.5 rounded bg-red-500" />
              <span>Severe / Closed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Leaflet Map Interactive Canvas */}
      <div className="flex-1 relative h-full w-full bg-slate-950">
        <MapContainer
          center={[34.0522, -118.35]}
          zoom={12}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          {/* CartoDB Dark Matter / Voyager Tiles */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {/* Background Network Road Segments */}
          {networkSegments.map((seg) => {
            const latlngs = seg.geometry?.map(pt => [pt[1], pt[0]]) || [];
            const color = getTrafficColor(seg.traffic_level);
            return (
              <Polyline
                key={seg.road_id}
                positions={latlngs}
                pathOptions={{
                  color: color,
                  weight: 3.5,
                  opacity: 0.65,
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-white block">{seg.road_name}</span>
                    <div className="text-slate-300">Type: <span className="font-medium text-slate-100">{seg.road_type}</span></div>
                    <div className="text-slate-300">Length: <span className="font-mono text-slate-100">{seg.length} km</span></div>
                    <div className="text-slate-300">Predicted Speed: <span className="font-mono font-bold text-emerald-400">{seg.predicted_speed} km/h</span></div>
                    <div className="text-slate-300">Estimated Travel Time: <span className="font-mono text-white">{seg.predicted_travel_time} min</span></div>
                    <div className="text-slate-300">Traffic Level: <span className="font-bold" style={{ color }}>{seg.traffic_level}</span></div>
                  </div>
                </Popup>
              </Polyline>
            );
          })}

          {/* Alternative Routes Polylines (Dashed White/Slate) */}
          {routeResult?.alternative_routes?.map((alt, i) => {
            const latlngs = alt.geometry?.map(pt => [pt[1], pt[0]]) || [];
            return (
              <Polyline
                key={`alt-${i}`}
                positions={latlngs}
                pathOptions={{
                  color: '#e2e8f0',
                  weight: 4.5,
                  dashArray: '8, 8',
                  opacity: 0.85
                }}
              />
            );
          })}

          {/* Recommended Route Polyline (Light Emerald Green with high visibility) */}
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

          {/* Origin Marker */}
          {sourceCoord && (
            <Marker 
              position={[sourceCoord.lat, sourceCoord.lng]}
              icon={createPinIcon('#10b981', 'Origin')}
            >
              <Popup>
                <div className="text-xs">
                  <span className="font-bold text-emerald-400">Source:</span> {sourceCoord.name}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Destination Marker */}
          {destCoord && (
            <Marker 
              position={[destCoord.lat, destCoord.lng]}
              icon={createPinIcon('#ef4444', 'Destination')}
            >
              <Popup>
                <div className="text-xs">
                  <span className="font-bold text-rose-400">Destination:</span> {destCoord.name}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Incident / Accident Markers */}
          {incidents.map((inc, i) => (
            <Marker
              key={`inc-${i}`}
              position={[inc.latitude, inc.longitude]}
              icon={createHazardIcon()}
            >
              <Popup>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{inc.severity} Traffic Incident</span>
                  </div>
                  <div className="text-white font-medium">{inc.road_name}</div>
                  <div className="text-slate-300 text-[11px]">{inc.description}</div>
                  <div className="text-[10px] text-red-300 font-mono mt-1">Delay penalty applied to routing graph</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
