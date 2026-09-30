import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Layers,
  Car,
  Bike,
  Bus,
  LocateFixed,
  MapPin,
  Loader2,
  ArrowUpDown,
  RotateCcw
} from 'lucide-react';
import { trafficApi } from '../api/client';
import { Button } from '../components/common/Button';
import { TrafficBadge, StatusBadge } from '../components/common/Badge';
import { formatSpeed, formatDistance, formatDuration } from '../utils/formatters';
import { getTrafficColorHex } from '../utils/trafficColors';

// Safe Leaflet [lat, lon] converter
const toLatLng = (pt) => {
  if (!pt || pt.length < 2) return [11.1271, 78.6569];
  // If first number is > 50, it is longitude (Tamil Nadu lon is ~76-80, lat is ~8-13)
  if (pt[0] > 50) return [pt[1], pt[0]];
  return [pt[0], pt[1]];
};

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

const createLocationIcon = () => L.divIcon({
  className: 'custom-location-marker',
  html: `
    <div style="position: relative; transform: translate(-50%, -50%);">
      <div style="width: 22px; height: 22px; background: #0284c7; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 0 6px rgba(2, 132, 199, 0.35); display: flex; align-items: center; justify-content: center;">
        <div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
      </div>
      <div style="position: absolute; top: 100%; left: 50%; transform: translate(-50%, 4px); background: #0284c7; color: white; font-weight: 800; font-size: 10px; padding: 2px 7px; border-radius: 9999px; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 1.5px solid white;">
        📍 Current Location
      </div>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0]
});

function MapBoundsUpdater({ geometry }) {
  const map = useMap();
  useEffect(() => {
    if (geometry && geometry.length > 0) {
      const latlngs = geometry.map(toLatLng);
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [geometry, map]);
  return null;
}

export default function MapRoute() {
  const [searchParams] = useSearchParams();
  const [nodes, setNodes] = useState([]);
  const [networkSegments, setNetworkSegments] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [sourceNode, setSourceNode] = useState('');
  const [destNode, setDestNode] = useState('');
  const [algorithm, setAlgorithm] = useState('A*');
  const [vehicleType, setVehicleType] = useState('car');
  const [weatherCondition, setWeatherCondition] = useState('Clear');
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeResult, setRouteResult] = useState(null);
  const [vehicleTimes, setVehicleTimes] = useState(null);
  const [hourlyForecast, setHourlyForecast] = useState([]);
  const [tripRecordedMsg, setTripRecordedMsg] = useState('');
  const [activeTab, setActiveTab] = useState('recommended');

  // GPS Current Location state
  const [locatingUser, setLocatingUser] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('');

  // OSMnx layer overlays
  const [activeInfraLayer, setActiveInfraLayer] = useState(null);
  const [infraFeatures, setInfraFeatures] = useState([]);

  const getEstimatedETA = (travelTimeMinutes) => {
    if (!travelTimeMinutes) return '';
    const now = new Date();
    const arrival = new Date(now.getTime() + travelTimeMinutes * 60000);
    return arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    async function loadNetwork() {
      try {
        const [nodesData, currentTraffic] = await Promise.all([
          trafficApi.getNodes(),
          trafficApi.getCurrentTraffic()
        ]);

        const nList = nodesData || [];
        // Deduplicate nodes by city name
        const uniqueNodes = [];
        const seen = new Set();
        for (const n of nList) {
          if (!seen.has(n.name)) {
            seen.add(n.name);
            uniqueNodes.push(n);
          }
        }
        setNodes(uniqueNodes);

        const qSrc = searchParams.get('src');
        const qDst = searchParams.get('dst');
        let initialSrcId = '';
        let initialDstId = '';

        if (qSrc) {
          const match = uniqueNodes.find(n => n.name.toLowerCase() === qSrc.toLowerCase() || n.node_id === qSrc);
          if (match) initialSrcId = match.node_id;
        }
        if (!initialSrcId && uniqueNodes.length >= 1) {
          const chennai = uniqueNodes.find(n => n.name.toLowerCase() === 'chennai') || uniqueNodes[0];
          initialSrcId = chennai.node_id;
        }

        if (qDst) {
          const match = uniqueNodes.find(n => n.name.toLowerCase() === qDst.toLowerCase() || n.node_id === qDst);
          if (match) initialDstId = match.node_id;
        }
        if (!initialDstId && uniqueNodes.length >= 2) {
          const coimbatore = uniqueNodes.find(n => n.name.toLowerCase() === 'coimbatore') || uniqueNodes[1];
          initialDstId = coimbatore.node_id;
        }

        setSourceNode(initialSrcId);
        setDestNode(initialDstId);

        setNetworkSegments(currentTraffic.segments || []);
        setIncidents(currentTraffic.incidents || []);

        // If query parameters provided, calculate route automatically
        if (qSrc && qDst && initialSrcId && initialDstId && initialSrcId !== initialDstId) {
          setTimeout(() => {
            handleCalculateRoute(initialSrcId, initialDstId, uniqueNodes);
          }, 200);
        }
      } catch (err) {
        console.error("Failed to load map network:", err);
      }
    }
    loadNetwork();
  }, [searchParams]);

  const calculateHaversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      setTimeout(() => setLocationStatus(''), 4500);
      return;
    }

    setLocatingUser(true);
    setLocationStatus('Acquiring GPS location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setUserLocation({ lat: userLat, lng: userLng });

        if (nodes && nodes.length > 0) {
          let closestNode = nodes[0];
          let minDistance = Infinity;

          nodes.forEach((node) => {
            const nLat = parseFloat(node.lat);
            const nLng = parseFloat(node.lng || node.lon);
            const dist = calculateHaversineKm(userLat, userLng, nLat, nLng);
            if (dist < minDistance) {
              minDistance = dist;
              closestNode = node;
            }
          });

          setSourceNode(closestNode.node_id);
          const distStr =
            minDistance < 1
              ? `${Math.round(minDistance * 1000)} m`
              : `${minDistance.toFixed(1)} km`;
          setLocationStatus(`Nearest hub selected: ${closestNode.name} (${distStr} away)`);
        } else {
          setLocationStatus('GPS coordinates detected.');
        }

        setLocatingUser(false);
        setTimeout(() => setLocationStatus(''), 6000);
      },
      (error) => {
        setLocatingUser(false);
        let msg = 'Could not acquire location.';
        if (error.code === 1) msg = 'Location access denied by browser.';
        else if (error.code === 2) msg = 'GPS position unavailable.';
        else if (error.code === 3) msg = 'Location request timed out.';
        setLocationStatus(msg);
        setTimeout(() => setLocationStatus(''), 5000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleCalculateRoute = async (srcOverride, dstOverride, nodesList) => {
    const sId = typeof srcOverride === 'string' ? srcOverride : sourceNode;
    const dId = typeof dstOverride === 'string' ? dstOverride : destNode;
    if (!sId || !dId || sId === dId) return;
    try {
      setLoadingRoute(true);
      setTripRecordedMsg('');

      const list = (nodesList && nodesList.length > 0) ? nodesList : nodes;
      const srcObj = list.find(n => n.node_id === sId);
      const dstObj = list.find(n => n.node_id === dId);
      const srcName = srcObj?.name || sId;
      const dstName = dstObj?.name || dId;

      // Parallel fetch from calculateRoute and direct Sat API
      const [res, satRes] = await Promise.all([
        trafficApi.calculateRoute({
          source_node: sId,
          destination_node: dId,
          algorithm: algorithm,
          weather_condition: weatherCondition
        }),
        trafficApi.calculateSatRoute({
          source: srcName,
          destination: dstName,
          vehicle_type: vehicleType
        }).catch(() => null)
      ]);

      setRouteResult(res);
      if (satRes) {
        if (satRes.hourly_forecast) setHourlyForecast(satRes.hourly_forecast);
        if (satRes.vehicle_times) setVehicleTimes(satRes.vehicle_times);
      }
      setActiveTab('recommended');
    } catch (err) {
      console.error("Route calculation error:", err);
    } finally {
      setLoadingRoute(false);
    }
  };

  const toggleInfraLayer = async (type) => {
    if (activeInfraLayer === type) {
      setActiveInfraLayer(null);
      setInfraFeatures([]);
      return;
    }
    setActiveInfraLayer(type);
    try {
      const data = await trafficApi.getOsmnxFeatures(type);
      setInfraFeatures(data.features || []);
    } catch (e) {
      console.error("Failed to load OSMnx infrastructure features:", e);
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
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden bg-white">
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
                <p className="text-xs text-neutral-500">Tamil Nadu Highway & OSMnx Network</p>
              </div>
            </div>
          </div>

          {/* Form Routing Parameters */}
          <div className="space-y-3.5">
            {/* Origin Location */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  Origin City / Hub
                </label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locatingUser}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg px-2.5 py-1 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                  title="Detect GPS location and select nearest hub"
                >
                  {locatingUser ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                      <span>Locating...</span>
                    </>
                  ) : (
                    <>
                      <LocateFixed className="w-3 h-3 text-emerald-600" />
                      <span>Use Current Location</span>
                    </>
                  )}
                </button>
              </div>
              <select
                value={sourceNode}
                onChange={(e) => setSourceNode(e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
              >
                {nodes.map(n => (
                  <option key={n.node_id} value={n.node_id}>{n.name}</option>
                ))}
              </select>

              {locationStatus && (
                <div className={`mt-2 text-[11px] font-medium flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
                  locationStatus.includes('Nearest hub') || locationStatus.includes('detected')
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                  <span>{locationStatus}</span>
                </div>
              )}
            </div>

            {/* Direction Swap Button */}
            <div className="flex justify-center -my-1">
              <button
                type="button"
                onClick={() => {
                  const prevSrc = sourceNode;
                  setSourceNode(destNode);
                  setDestNode(prevSrc);
                }}
                className="px-3 py-1 rounded-full border border-neutral-200 hover:border-emerald-400 bg-neutral-50 hover:bg-emerald-50 text-neutral-600 hover:text-emerald-700 transition-all text-[11px] font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Swap Origin and Destination"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-emerald-600" />
                <span>Reverse Direction</span>
              </button>
            </div>

            {/* Destination Location */}
            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                Destination City / Hub
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

            {/* Quick Pick Corridors */}
            <div className="pt-0.5">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px]">
                <span className="text-neutral-400 font-bold shrink-0">Popular:</span>
                {[
                  { label: 'Chennai ⇄ CBE', src: 'Chennai', dst: 'Coimbatore' },
                  { label: 'Chennai ⇄ Salem', src: 'Chennai', dst: 'Salem' },
                  { label: 'Madurai ⇄ Trichy', src: 'Madurai', dst: 'Tiruchirappalli' },
                  { label: 'CBE ⇄ Madurai', src: 'Coimbatore', dst: 'Madurai' },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => {
                      const sNode = nodes.find(n => n.name.toLowerCase().includes(chip.src.toLowerCase()));
                      const dNode = nodes.find(n => n.name.toLowerCase().includes(chip.dst.toLowerCase()));
                      if (sNode && dNode) {
                        setSourceNode(sNode.node_id);
                        setDestNode(dNode.node_id);
                        handleCalculateRoute(sNode.node_id, dNode.node_id);
                      }
                    }}
                    className="px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-neutral-200 text-neutral-700 font-semibold whitespace-nowrap transition-colors cursor-pointer"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle Mode Selector */}
            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1.5 flex items-center justify-between">
                <span>Vehicle Profile</span>
                {vehicleTimes && (
                  <span className="text-[10px] text-emerald-700 font-bold font-mono">
                    Car: {vehicleTimes.car}m • Bike: {vehicleTimes.bike}m • Bus: {vehicleTimes.bus}m
                  </span>
                )}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'car', label: 'Car / Taxi', icon: '🚗' },
                  { id: 'bike', label: 'Bike / Moto', icon: '🏍️' },
                  { id: 'bus', label: 'Bus / Public', icon: '🚌' }
                ].map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVehicleType(v.id)}
                    className={`py-1.5 px-2 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      vehicleType === v.id
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    <span className="text-base">{v.icon}</span>
                    <span className="text-[10px]">{v.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Routing Strategy / Optimization Goal */}
            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1.5 flex items-center justify-between">
                <span>Routing Strategy</span>
                <span className="text-[10px] text-neutral-400 font-normal">Optimization Goal</span>
              </label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
              >
                <option value="A*">⚡ Fastest Route — Shortest Travel Time (A* Heuristic)</option>
                <option value="Dijkstra">📍 Shortest Path — Minimum Physical Distance (Dijkstra)</option>
              </select>
              <p className="text-[10px] text-neutral-500 mt-1 pl-0.5">
                {algorithm === 'A*' 
                  ? 'Avoids traffic congestion to reach your destination in the least travel time.' 
                  : 'Calculates the shortest geographical mileage along the road network.'}
              </p>
            </div>

            {/* Weather Simulation Context */}
            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1.5">
                Weather Simulation Context
              </label>
              <select
                value={weatherCondition}
                onChange={(e) => setWeatherCondition(e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
              >
                <option value="Clear">☀️ Clear Weather (Normal Free-Flow Speeds)</option>
                <option value="Rain">🌧️ Heavy Rain (15–25% Road Slowdown)</option>
                <option value="Fog">🌫️ Dense Fog (Low Visibility Hazard)</option>
                <option value="Overcast">☁️ Overcast (Steady Traffic Flow)</option>
              </select>
            </div>

            {/* OSMnx Infrastructure Features Toggle */}
            <div className="pt-2 border-t border-neutral-100">
              <label className="text-[11px] font-bold text-neutral-700 block mb-1.5 flex items-center justify-between">
                <span>OSM Infrastructure Overlays</span>
                {infraFeatures.length > 0 && (
                  <span className="text-[10px] font-mono font-bold text-emerald-600">
                    {infraFeatures.length} visible
                  </span>
                )}
              </label>
              <div className="grid grid-cols-4 gap-1 text-[10px]">
                {[
                  { id: 'traffic_signals', label: 'Signals', icon: '🚦' },
                  { id: 'toll_booths', label: 'Tolls', icon: '🛑' },
                  { id: 'speed_cameras', label: 'Radars', icon: '📹' },
                  { id: 'fuel_stations', label: 'Fuel', icon: '⛽' },
                ].map(layer => (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => toggleInfraLayer(layer.id)}
                    className={`py-1 px-1 rounded-lg border font-semibold flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                      activeInfraLayer === layer.id
                        ? 'bg-neutral-900 border-neutral-900 text-white shadow-xs'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    <span>{layer.icon}</span>
                    <span className="truncate max-w-full text-[9px]">{layer.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Calculate Button - Vibrant EMERALD GREEN */}
            <Button
              onClick={() => handleCalculateRoute()}
              disabled={loadingRoute || sourceNode === destNode}
              loading={loadingRoute}
              icon={Navigation}
              className="w-full mt-2 py-3 shadow-md shadow-emerald-600/20 text-sm"
            >
              CALCULATE OPTIMAL ROUTE
            </Button>

            {routeResult && (
              <button
                type="button"
                onClick={() => {
                  setRouteResult(null);
                  setVehicleTimes(null);
                  setHourlyForecast([]);
                }}
                className="w-full py-1 text-xs font-semibold text-neutral-500 hover:text-neutral-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
                <span>Clear / Reset Route</span>
              </button>
            )}
          </div>

          {/* Reroute Alert Banner */}
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
                  ⚡ Fastest
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
                    🛣️ Alt 1
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
                    🛣️ Alt 2
                  </button>
                )}
              </div>

              {/* Active Route Statistics */}
              {currentActiveRoute && (
                <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                        {activeTab === 'recommended' ? 'Optimal Route' : 'Alternative Corridor'}
                      </span>
                      <span className="text-2xl font-black text-neutral-900 font-mono block">
                        {formatDuration(currentActiveRoute.total_travel_time_min)}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 w-fit">
                        <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>ETA: ~{getEstimatedETA(currentActiveRoute.total_travel_time_min)}</span>
                      </div>
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
                  <div className="pt-2 border-t border-neutral-100 max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    <span className="text-[10px] font-bold uppercase text-neutral-500 block mb-1">
                      Route Corridor Breakdown
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

                  {/* Hourly Departure Forecast Card */}
                  {hourlyForecast && hourlyForecast.length > 0 && (
                    <div className="pt-2 border-t border-neutral-100 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase text-neutral-500 block">
                        Hourly Departure Forecast
                      </span>
                      <div className="grid grid-cols-1 gap-1 max-h-36 overflow-y-auto pr-1">
                        {hourlyForecast.map((slot, idx) => (
                          <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-neutral-50 border border-neutral-200 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-neutral-400" />
                              <span className="font-bold text-neutral-800 text-[11px]">{slot.time}</span>
                              <span className="text-[9px] text-neutral-500">({slot.desc})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-emerald-700 text-[11px]">{slot.travel_time_min}m</span>
                              <TrafficBadge level={slot.traffic} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Record Trip Button */}
                  <Button
                    variant="secondary"
                    onClick={handleRecordTrip}
                    icon={BookmarkPlus}
                    className="w-full text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50 mt-1"
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
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-neutral-600 block">Network Traffic Legend:</span>
            <span className="text-[10px] font-bold text-blue-700 flex items-center gap-1">
              <span className="w-3.5 h-1.5 rounded-full bg-blue-600 inline-block shadow-xs" /> Active Route
            </span>
          </div>
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

      {/* Leaflet Map Canvas */}
      <div className="flex-1 relative h-full w-full bg-neutral-100">
        <MapContainer
          center={[11.1271, 78.6569]}
          zoom={8}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          {/* OpenStreetMap Public Tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* Background Network Road Segments */}
          {networkSegments.map((seg) => {
            const latlngs = seg.geometry?.map(toLatLng) || [];
            const color = getTrafficColorHex(seg.traffic_level);
            return (
              <Polyline
                key={seg.road_id}
                positions={latlngs}
                pathOptions={{
                  color: color,
                  weight: 3.5,
                  opacity: 0.6
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

          {/* Inactive Alternative Routes (Subtle Slate with dashes) */}
          {routeResult && (
            [routeResult.recommended_route, ...(routeResult.alternative_routes || [])]
              .filter(r => r && r !== currentActiveRoute)
              .map((alt, i) => (
                <Polyline
                  key={`inactive-alt-${i}`}
                  positions={alt.geometry?.map(toLatLng) || []}
                  pathOptions={{
                    color: '#64748b',
                    weight: 4.5,
                    dashArray: '8, 8',
                    opacity: 0.75,
                    lineCap: 'round'
                  }}
                />
              ))
          )}

          {/* Active Navigation Route in Vibrant Blue (#2563eb / #1e40af casing) */}
          {currentActiveRoute && (
            <>
              {/* Outer Border / Glow Casing */}
              <Polyline
                positions={currentActiveRoute.geometry?.map(toLatLng) || []}
                pathOptions={{
                  color: '#1e40af',
                  weight: 8.5,
                  opacity: 0.85,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
              {/* Core Navigation Blue Line */}
              <Polyline
                positions={currentActiveRoute.geometry?.map(toLatLng) || []}
                pathOptions={{
                  color: '#2563eb',
                  weight: 6,
                  opacity: 1.0,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
            </>
          )}

          {/* Auto-fit Bounds component */}
          {currentActiveRoute && (
            <MapBoundsUpdater geometry={currentActiveRoute.geometry} />
          )}

          {/* Infrastructure Feature Markers */}
          {infraFeatures.map((feat, i) => (
            <Marker
              key={`infra-${i}`}
              position={[feat.lat, feat.lon]}
              icon={createPinIcon('#2563eb', activeInfraLayer === 'traffic_signals' ? '🚦 Signal' : (activeInfraLayer === 'toll_booths' ? '🛑 Toll' : (activeInfraLayer === 'speed_cameras' ? '📹 Radar' : '⛽ Fuel')))}
            >
              <Popup>
                <div className="text-xs space-y-1">
                  <span className="font-bold text-neutral-900 block">{feat.name}</span>
                  <div className="text-neutral-500 text-[11px]">{feat.city}</div>
                  <div className="text-[10px] text-blue-600 font-mono font-semibold">OpenStreetMap Infrastructure</div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Current GPS Location Marker */}
          {userLocation && (
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={createLocationIcon()}
            >
              <Popup>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-sky-700 flex items-center gap-1">
                    <LocateFixed className="w-3.5 h-3.5" />
                    <span>Your Current Location</span>
                  </div>
                  <div className="text-[11px] text-neutral-600">
                    GPS Coordinates: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Origin Marker - Emerald Green */}
          {sourceCoord && (
            <Marker 
              position={[sourceCoord.lat, sourceCoord.lng]}
              icon={createPinIcon('#10b981', sourceCoord.name || 'Origin')}
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
              icon={createPinIcon('#ef4444', destCoord.name || 'Destination')}
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
