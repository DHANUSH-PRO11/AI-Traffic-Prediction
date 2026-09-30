import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  MapContainer, 
  TileLayer, 
  Polyline, 
  Marker, 
  Popup, 
  Circle,
  useMap,
  useMapEvents 
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
  RotateCcw,
  Target,
  Crosshair,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Sliders,
  ChevronRight,
  Sun,
  ShieldAlert,
  Fuel,
  Info
} from 'lucide-react';
import { trafficApi } from '../api/client';
import { Button } from '../components/common/Button';
import { TrafficBadge, StatusBadge } from '../components/common/Badge';
import { formatSpeed, formatDistance, formatDuration } from '../utils/formatters';
import { getTrafficColorHex } from '../utils/trafficColors';
import { useDeviceLocation } from '../hooks/useDeviceLocation';
import { reverseGeocode } from '../utils/reverseGeocode';
import CurrentLocationMarker from '../components/map/CurrentLocationMarker';
import CurrentLocationButton from '../components/map/CurrentLocationButton';

// Safe Leaflet [lat, lon] converter
const toLatLng = (pt) => {
  if (!pt || pt.length < 2) return [11.1271, 78.6569];
  // If first number is > 50, it is longitude (Tamil Nadu lon is ~76-80, lat is ~8-13)
  if (pt[0] > 50) return [pt[1], pt[0]];
  return [pt[0], pt[1]];
};

// Google Maps Style Destination Pin (Red teardrop with white dot)
const createDestinationPinIcon = (label) => L.divIcon({
  className: 'google-dest-pin',
  html: `
    <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
      <div style="background: #ea4335; color: white; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 9999px; box-shadow: 0 4px 12px rgba(234, 67, 53, 0.4); border: 2px solid white; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: white;"></span>
        <span>${label}</span>
      </div>
      <div style="width: 24px; height: 32px; position: relative; margin-top: -2px;">
        <svg viewBox="0 0 24 32" fill="none" style="width: 100%; height: 100%; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
          <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37258 18.6274 0 12 0Z" fill="#EA4335"/>
          <circle cx="12" cy="12" r="5" fill="#FFFFFF"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0]
});

// Google Maps Style Origin Pin (Blue circle pin)
const createOriginPinIcon = (label) => L.divIcon({
  className: 'google-origin-pin',
  html: `
    <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
      <div style="background: #1a73e8; color: white; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 9999px; box-shadow: 0 4px 12px rgba(26, 115, 232, 0.4); border: 2px solid white; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: white;"></span>
        <span>${label}</span>
      </div>
      <div style="width: 24px; height: 32px; position: relative; margin-top: -2px;">
        <svg viewBox="0 0 24 32" fill="none" style="width: 100%; height: 100%; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
          <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37258 18.6274 0 12 0Z" fill="#1A73E8"/>
          <circle cx="12" cy="12" r="5" fill="#FFFFFF"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0]
});

// Hazard Icon with Pulse
const createHazardIcon = () => L.divIcon({
  className: 'custom-hazard-marker',
  html: `
    <div style="transform: translate(-50%, -50%); width: 28px; height: 28px; background: #ef4444; border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(239, 68, 68, 0.8); animation: pulse 1.5s infinite;">
      <svg style="width: 14px; height: 14px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0]
});

// OSMnx Infrastructure Pin
const createInfraIcon = (color, label) => L.divIcon({
  className: 'custom-infra-marker',
  html: `
    <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
      <div style="background: ${color}; color: white; font-weight: 700; font-size: 10px; padding: 2px 7px; border-radius: 9999px; box-shadow: 0 2px 8px rgba(0,0,0,0.25); border: 1.5px solid white; white-space: nowrap;">
        <span>${label}</span>
      </div>
      <div style="width: 2px; height: 8px; background: ${color};"></div>
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
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    }
  }, [geometry, map]);
  return null;
}

function MapPanController({ panTarget }) {
  const map = useMap();
  useEffect(() => {
    if (panTarget) {
      const zoom = panTarget.zoom || 14;
      map.flyTo([panTarget.lat, panTarget.lng], zoom, { duration: 1.2 });
    }
  }, [panTarget, map]);
  return null;
}

function MapInnerControls({ onLocate, locating, isUsingCurrentLocation }) {
  const map = useMap();
  return (
    <div className="leaflet-bottom leaflet-right !m-0 !p-6 flex flex-col items-center gap-3 select-none pointer-events-auto z-[1000]">
      {/* Google Maps "Locate Me / Re-Center" FAB */}
      <button
        type="button"
        onClick={onLocate}
        disabled={locating}
        className={`w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-xl border-2 transition-all cursor-pointer hover:scale-105 active:scale-95 ${
          isUsingCurrentLocation 
            ? 'border-blue-500 text-blue-600 ring-4 ring-blue-400/20' 
            : 'border-neutral-200 text-neutral-700 hover:text-blue-600 hover:border-blue-300'
        }`}
        title="Show Your Current Location"
      >
        {locating ? (
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        ) : (
          <Crosshair className="w-5 h-5 text-blue-600" />
        )}
      </button>

      {/* Map Zoom Controls (+ / -) */}
      <div className="flex flex-col rounded-xl overflow-hidden shadow-xl border border-neutral-200 bg-white select-none">
        <button
          type="button"
          onClick={() => map.zoomIn()}
          className="w-10 h-10 flex items-center justify-center text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 font-bold text-lg transition-colors border-b border-neutral-100 cursor-pointer"
          title="Zoom In"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => map.zoomOut()}
          className="w-10 h-10 flex items-center justify-center text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 font-bold text-lg transition-colors cursor-pointer"
          title="Zoom Out"
        >
          −
        </button>
      </div>
    </div>
  );
}

function MapClickLocationSetter({ isPickingLocation, onLocationPicked }) {
  useMapEvents({
    click(e) {
      if (isPickingLocation) {
        onLocationPicked(e.latlng.lat, e.latlng.lng);
      }
    }
  });
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
  const [satRouteData, setSatRouteData] = useState(null);
  const [vehicleTimes, setVehicleTimes] = useState(null);
  const [hourlyForecast, setHourlyForecast] = useState([]);
  const [tripRecordedMsg, setTripRecordedMsg] = useState('');
  const [activeTab, setActiveTab] = useState('recommended');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Search filter query state for autocomplete
  const [originSearch, setOriginSearch] = useState('');
  const [destSearch, setDestSearch] = useState('');
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const originInputRef = useRef(null);
  const destInputRef = useRef(null);

  // Google Maps Map Style (Default / Satellite / Dark)
  const [mapStyle, setMapStyle] = useState('streets'); // 'streets' | 'satellite'
  const [showLiveTrafficLayer, setShowLiveTrafficLayer] = useState(true);
  const [showTrafficLegend, setShowTrafficLegend] = useState(false);

  // Real-time device-based current location hook
  const {
    latitude: deviceLat,
    longitude: deviceLng,
    accuracy: deviceAccuracy,
    loading: locatingDevice,
    error: deviceLocationError,
    isTracking: isDeviceTracking,
    getCurrentLocation,
    startTracking,
    stopTracking
  } = useDeviceLocation(false);

  const [userLocation, setUserLocation] = useState(null);
  const [deviceAddress, setDeviceAddress] = useState('');
  const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const [isPickingOnMap, setIsPickingOnMap] = useState(false);
  const [panTarget, setPanTarget] = useState(null);

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

  const connectDeviceLocationToGraph = (lat, lng, accuracy = null, customLabel = null, shouldRecalculate = true) => {
    if (!nodes || nodes.length === 0) return;

    let closestNode = nodes[0];
    let minDistance = Infinity;

    nodes.forEach((node) => {
      const nLat = parseFloat(node.lat);
      const nLng = parseFloat(node.lng || node.lon);
      const dist = calculateHaversineKm(lat, lng, nLat, nLng);
      if (dist < minDistance) {
        minDistance = dist;
        closestNode = node;
      }
    });

    setSourceNode(closestNode.node_id);
    setIsUsingCurrentLocation(true);

    const distStr = minDistance < 1 ? `${Math.round(minDistance * 1000)} m` : `${minDistance.toFixed(1)} km`;
    const accStr = accuracy ? ` (±${Math.round(accuracy)}m)` : '';
    const label = customLabel || 'Your Location';

    setLocationStatus(`📍 Connected to ${closestNode.name} (${distStr} from GPS)${accStr}`);

    let targetDest = destNode;
    if (destNode === closestNode.node_id) {
      const altNode = nodes.find(n => n.node_id !== closestNode.node_id);
      if (altNode) {
        targetDest = altNode.node_id;
        setDestNode(altNode.node_id);
      }
    }

    if (shouldRecalculate && targetDest && targetDest !== closestNode.node_id) {
      handleCalculateRoute(closestNode.node_id, targetDest);
    }
  };

  useEffect(() => {
    if (deviceLat != null && deviceLng != null && isDeviceTracking) {
      setUserLocation(prev => ({
        lat: deviceLat,
        lng: deviceLng,
        accuracy: deviceAccuracy,
        name: prev?.name || ''
      }));
      connectDeviceLocationToGraph(deviceLat, deviceLng, deviceAccuracy, null, false);
    }
  }, [deviceLat, deviceLng, deviceAccuracy, isDeviceTracking]);

  useEffect(() => {
    if (deviceLocationError) {
      setLocationStatus(`⚠️ ${deviceLocationError}`);
    }
  }, [deviceLocationError]);

  const handleLocateMe = async () => {
    try {
      setLocationStatus('Acquiring device GPS...');
      const coords = await getCurrentLocation();
      const lat = coords.latitude;
      const lng = coords.longitude;
      const acc = coords.accuracy || 0;

      setPanTarget({ lat, lng, zoom: 14, _t: Date.now() });

      let resolvedAddress = '';
      try {
        const geoInfo = await reverseGeocode(lat, lng);
        resolvedAddress = geoInfo.displayName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setDeviceAddress(resolvedAddress);
      } catch {
        resolvedAddress = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setDeviceAddress(resolvedAddress);
      }

      setUserLocation({ lat, lng, accuracy: acc, name: resolvedAddress });
      setIsUsingCurrentLocation(true);
      connectDeviceLocationToGraph(lat, lng, acc, resolvedAddress, true);
    } catch (err) {
      console.warn('[LOCATION] Failed to acquire device coordinates:', err);
    }
  };

  const updateLocationPosition = async (lat, lng, customLabel = null, shouldRecalculate = true) => {
    let resolvedName = customLabel;
    if (!resolvedName) {
      try {
        const geoInfo = await reverseGeocode(lat, lng);
        resolvedName = geoInfo.displayName;
      } catch {
        resolvedName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
    }

    setDeviceAddress(resolvedName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    setUserLocation({ lat, lng, accuracy: 25, name: resolvedName });
    setIsUsingCurrentLocation(true);
    setPanTarget({ lat, lng, zoom: 14, _t: Date.now() });
    connectDeviceLocationToGraph(lat, lng, 25, resolvedName, shouldRecalculate);
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
      setSatRouteData(satRes);
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
        source: isUsingCurrentLocation ? 'Your Location' : (nodes.find(n => n.node_id === sourceNode)?.name || sourceNode),
        destination: nodes.find(n => n.node_id === destNode)?.name || destNode,
        route_geometry: r.geometry,
        predicted_time: r.total_travel_time_min,
        actual_time: Math.round(r.total_travel_time_min * actualMultiplier * 10) / 10,
        distance: r.total_distance_km,
        algorithm: r.algorithm
      });
      setTripRecordedMsg('Trip logged for continuous ML learning!');
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

  // Filtered nodes for dropdown autocomplete
  const filteredOriginNodes = nodes.filter(n => 
    !originSearch || n.name.toLowerCase().includes(originSearch.toLowerCase())
  );
  const filteredDestNodes = nodes.filter(n => 
    !destSearch || n.name.toLowerCase().includes(destSearch.toLowerCase())
  );

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden font-sans bg-neutral-100 flex flex-col lg:flex-row">
      
      {/* ── GOOGLE MAPS FLOATING DIRECTIONS PANEL (Left Side) ──────────────── */}
      <div 
        className={`absolute top-3 left-3 z-[1000] w-[calc(100%-1.5rem)] sm:w-[410px] max-h-[calc(100%-1.5rem)] bg-white rounded-2xl shadow-2xl border border-neutral-200/90 flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'translate-y-[-120%] pointer-events-none opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        {/* Google Maps Transport Mode Bar */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2.5 border-b border-neutral-100 bg-neutral-50/70 rounded-t-2xl">
          <div className="flex items-center gap-1.5 bg-neutral-200/60 p-1 rounded-xl">
            {[
              { id: 'car', icon: Car, label: 'Driving' },
              { id: 'bike', icon: Bike, label: 'Transit' },
              { id: 'bus', icon: Bus, label: 'Bus' },
            ].map((m) => {
              const Icon = m.icon;
              const isActive = vehicleType === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setVehicleType(m.id);
                    if (routeResult) handleCalculateRoute(sourceNode, destNode);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-white text-blue-600 shadow-sm border border-neutral-200/70' 
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/40'
                  }`}
                  title={`Switch travel mode to ${m.label}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[11px]">{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Collapse Button */}
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(true)}
            className="w-8 h-8 rounded-full hover:bg-neutral-200/60 flex items-center justify-center text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
            title="Collapse Directions"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Google Maps Origin / Destination Input Box */}
        <div className="p-4 bg-white border-b border-neutral-100 space-y-2.5 relative">
          <div className="flex items-center gap-3">
            {/* Left Track Graphic: Blue Circle (A) -> Vertical Dots -> Red Pin (B) */}
            <div className="flex flex-col items-center justify-between h-[84px] py-2 shrink-0">
              {/* Origin Blue Ring */}
              <div className="w-3.5 h-3.5 rounded-full border-[3px] border-blue-600 bg-white shadow-xs" />
              {/* Connecting Dotted Track */}
              <div className="w-0.5 h-7 border-l-2 border-dashed border-neutral-300 my-0.5" />
              {/* Destination Red Teardrop Pin */}
              <div className="w-3.5 h-3.5 rounded-full bg-red-600 border-[2.5px] border-white ring-2 ring-red-500 shadow-xs" />
            </div>

            {/* Input Fields Column */}
            <div className="flex-1 space-y-2 relative">
              
              {/* 1. STARTING POINT INPUT (Origin) */}
              <div className="relative">
                {isUsingCurrentLocation ? (
                  <div className="flex items-center justify-between w-full bg-blue-50/80 border border-blue-300 rounded-xl px-3 py-2 text-xs font-bold text-blue-900 shadow-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600" />
                      </span>
                      <span className="truncate">Your Location</span>
                      {deviceAddress && (
                        <span className="text-[10px] text-blue-600 font-normal truncate max-w-[120px]">
                          ({deviceAddress})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUsingCurrentLocation(false);
                        setUserLocation(null);
                        setLocationStatus('');
                      }}
                      className="p-1 rounded-full hover:bg-blue-100 text-blue-600 hover:text-blue-900 cursor-pointer"
                      title="Clear current location"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative flex items-center">
                    <input
                      ref={originInputRef}
                      type="text"
                      placeholder="Choose starting point..."
                      value={originSearch || (nodes.find(n => n.node_id === sourceNode)?.name || '')}
                      onChange={(e) => {
                        setOriginSearch(e.target.value);
                        setShowOriginDropdown(true);
                      }}
                      onFocus={() => setShowOriginDropdown(true)}
                      className="w-full bg-neutral-50/70 hover:bg-neutral-50 focus:bg-white border border-neutral-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-neutral-900 transition-all outline-none"
                    />
                    {sourceNode && (
                      <button
                        type="button"
                        onClick={() => { setSourceNode(''); setOriginSearch(''); }}
                        className="absolute right-2 text-neutral-400 hover:text-neutral-700 cursor-pointer p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Origin Autocomplete Dropdown */}
                {showOriginDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-neutral-100">
                    {/* Top Choice: Use Current Location */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowOriginDropdown(false);
                        handleLocateMe();
                      }}
                      disabled={locatingDevice}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left font-bold text-blue-600 hover:bg-blue-50/70 transition-colors cursor-pointer"
                    >
                      {locatingDevice ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                      ) : (
                        <LocateFixed className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                      <div>
                        <span className="block leading-tight">Your Location</span>
                        <span className="text-[10px] text-blue-500 font-normal">Detect device GPS coordinates</span>
                      </div>
                    </button>

                    {/* Pick on Map Choice */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowOriginDropdown(false);
                        setIsPickingOnMap(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                      <Crosshair className="w-4 h-4 text-neutral-500 shrink-0" />
                      <span>Choose on Map</span>
                    </button>

                    {/* Filtered Cities */}
                    <div className="py-1">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        Tamil Nadu Major Hubs
                      </div>
                      {filteredOriginNodes.map((n) => (
                        <button
                          key={n.node_id}
                          type="button"
                          onClick={() => {
                            setSourceNode(n.node_id);
                            setIsUsingCurrentLocation(false);
                            setUserLocation(null);
                            setOriginSearch('');
                            setShowOriginDropdown(false);
                            if (destNode && destNode !== n.node_id) {
                              handleCalculateRoute(n.node_id, destNode);
                            }
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                            sourceNode === n.node_id ? 'bg-blue-50 text-blue-800 font-bold' : 'text-neutral-800 hover:bg-neutral-50'
                          }`}
                        >
                          <span className="truncate">{n.name}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">Hub</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. DESTINATION INPUT */}
              <div className="relative">
                <div className="relative flex items-center">
                  <input
                    ref={destInputRef}
                    type="text"
                    placeholder="Choose destination..."
                    value={destSearch || (nodes.find(n => n.node_id === destNode)?.name || '')}
                    onChange={(e) => {
                      setDestSearch(e.target.value);
                      setShowDestDropdown(true);
                    }}
                    onFocus={() => setShowDestDropdown(true)}
                    className="w-full bg-neutral-50/70 hover:bg-neutral-50 focus:bg-white border border-neutral-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-neutral-900 transition-all outline-none"
                  />
                  {destNode && (
                    <button
                      type="button"
                      onClick={() => { setDestNode(''); setDestSearch(''); }}
                      className="absolute right-2 text-neutral-400 hover:text-neutral-700 cursor-pointer p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Destination Dropdown */}
                {showDestDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-neutral-100">
                    <div className="py-1">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        Select Destination City
                      </div>
                      {filteredDestNodes.map((n) => (
                        <button
                          key={n.node_id}
                          type="button"
                          onClick={() => {
                            setDestNode(n.node_id);
                            setDestSearch('');
                            setShowDestDropdown(false);
                            if (sourceNode && sourceNode !== n.node_id) {
                              handleCalculateRoute(sourceNode, n.node_id);
                            }
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                            destNode === n.node_id ? 'bg-red-50 text-red-800 font-bold' : 'text-neutral-800 hover:bg-neutral-50'
                          }`}
                        >
                          <span className="truncate">{n.name}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">Hub</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Swap Button (Right Edge) */}
            <button
              type="button"
              onClick={() => {
                const prevSrc = sourceNode;
                const prevDst = destNode;
                setSourceNode(prevDst);
                setDestNode(prevSrc);
                setIsUsingCurrentLocation(false);
                if (prevDst && prevSrc && prevDst !== prevSrc) {
                  handleCalculateRoute(prevDst, prevSrc);
                }
              }}
              className="w-8 h-8 rounded-full border border-neutral-200 hover:border-blue-400 bg-white hover:bg-blue-50 text-neutral-600 hover:text-blue-600 flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
              title="Reverse starting point and destination"
            >
              <ArrowUpDown className="w-4 h-4 text-blue-600" />
            </button>
          </div>

          {/* Quick Action Chips Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 text-[11px] no-scrollbar">
            {/* Quick "Your Location" Chip */}
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={locatingDevice}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                isUsingCurrentLocation 
                  ? 'bg-blue-600 text-white border border-blue-700' 
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
              }`}
            >
              <LocateFixed className="w-3 h-3" />
              <span>{locatingDevice ? 'Detecting...' : 'Your Location'}</span>
            </button>

            {/* Popular Tamil Nadu Highway Corridors */}
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
                    setIsUsingCurrentLocation(false);
                    setSourceNode(sNode.node_id);
                    setDestNode(dNode.node_id);
                    handleCalculateRoute(sNode.node_id, dNode.node_id);
                  }
                }}
                className="px-2.5 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200/70 border border-neutral-200 text-neutral-700 font-semibold whitespace-nowrap transition-colors cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Location Connection Status Pill */}
          {locationStatus && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">{locationStatus}</span>
            </div>
          )}
        </div>

        {/* Scrollable Results & Controls Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          
          {/* Main Action Button */}
          <Button
            onClick={() => handleCalculateRoute()}
            disabled={loadingRoute || !sourceNode || !destNode || sourceNode === destNode}
            loading={loadingRoute}
            icon={Navigation}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 text-xs tracking-wide"
          >
            {loadingRoute ? 'CALCULATING OPTIMAL ROUTE...' : 'DIRECTIONS & LIVE TRAFFIC'}
          </Button>

          {/* Google Maps Style Route Cards */}
          {routeResult && currentActiveRoute && (
            <div className="space-y-3 pt-1">
              
              {/* Route Alternative Tabs */}
              <div className="flex rounded-xl bg-neutral-100 p-1 text-xs border border-neutral-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('recommended')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    activeTab === 'recommended' 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  ⚡ Fastest ({formatDuration(routeResult.recommended_route?.total_travel_time_min)})
                </button>
                {routeResult.alternative_routes?.[0] && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('alt1')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      activeTab === 'alt1' 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    🛣️ Alt 1
                  </button>
                )}
                {routeResult.alternative_routes?.[1] && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('alt2')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      activeTab === 'alt2' 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    🛣️ Alt 2
                  </button>
                )}
              </div>

              {/* Primary Active Route Card */}
              <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    {/* Big Bold Travel Time (Google Maps Style) */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-neutral-950 font-mono tracking-tight">
                        {formatDuration(currentActiveRoute.total_travel_time_min)}
                      </span>
                      <span className="text-xs font-bold text-neutral-500">
                        ({formatDistance(currentActiveRoute.total_distance_km)})
                      </span>
                    </div>

                    {/* ETA Arrival Time */}
                    <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 w-fit">
                      <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Arrive by ~{getEstimatedETA(currentActiveRoute.total_travel_time_min)}</span>
                    </div>
                  </div>

                  <TrafficBadge level={currentActiveRoute.overall_traffic_level} />
                </div>

                {/* Corridor & Congestion Description */}
                <div className="text-xs space-y-1">
                  <div className="font-bold text-neutral-800 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      {satRouteData?.via_summary || (
                        currentActiveRoute.segments?.length > 1
                          ? `via ${currentActiveRoute.segments[0].road_name}`
                          : 'Direct Highway Corridor'
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Fastest route now. Real-time traffic predictions adjusted with Random Forest classifier and weather penalties.
                  </p>
                </div>

                {/* Multi-Vehicle Speeds Comparison */}
                {vehicleTimes && (
                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-neutral-100 text-center">
                    <div className={`p-2 rounded-xl border ${vehicleType === 'car' ? 'bg-blue-50 border-blue-300 font-bold text-blue-900' : 'bg-neutral-50 border-neutral-200 text-neutral-700'}`}>
                      <span className="text-xs block">🚗 Car</span>
                      <span className="text-xs font-mono font-bold">{vehicleTimes.car}m</span>
                    </div>
                    <div className={`p-2 rounded-xl border ${vehicleType === 'bike' ? 'bg-blue-50 border-blue-300 font-bold text-blue-900' : 'bg-neutral-50 border-neutral-200 text-neutral-700'}`}>
                      <span className="text-xs block">🏍️ Bike</span>
                      <span className="text-xs font-mono font-bold">{vehicleTimes.bike}m</span>
                    </div>
                    <div className={`p-2 rounded-xl border ${vehicleType === 'bus' ? 'bg-blue-50 border-blue-300 font-bold text-blue-900' : 'bg-neutral-50 border-neutral-200 text-neutral-700'}`}>
                      <span className="text-xs block">🚌 Bus</span>
                      <span className="text-xs font-mono font-bold">{vehicleTimes.bus}m</span>
                    </div>
                  </div>
                )}

                {/* Turn-by-Turn Corridor Breakdown */}
                {currentActiveRoute.segments?.length > 0 && (
                  <div className="pt-2 border-t border-neutral-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                      Corridor Breakdown ({currentActiveRoute.segments.length} segments)
                    </span>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {currentActiveRoute.segments.map((seg, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-neutral-50 border border-neutral-200">
                          <div className="flex items-center gap-2 truncate">
                            <span 
                              className="w-2.5 h-2.5 rounded-full shrink-0" 
                              style={{ backgroundColor: getTrafficColorHex(seg.traffic_level) }} 
                            />
                            <span className="text-neutral-800 truncate font-semibold">{seg.road_name}</span>
                          </div>
                          <div className="text-right shrink-0 font-mono text-[11px] text-neutral-500 pl-2">
                            <span className="text-emerald-700 font-bold">{seg.predicted_speed_kmh} km/h</span>
                            <span className="mx-1 text-neutral-300">•</span>
                            <span className="text-neutral-700">{seg.travel_time_min}m</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hourly Departure Forecast */}
                {hourlyForecast && hourlyForecast.length > 0 && (
                  <div className="pt-2 border-t border-neutral-100 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                      Live Traffic Departure Forecast
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
                            <span className="font-mono font-bold text-blue-600 text-[11px]">{slot.travel_time_min}m</span>
                            <TrafficBadge level={slot.traffic} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Log Trip Feedback Button */}
                <Button
                  variant="secondary"
                  onClick={handleRecordTrip}
                  icon={BookmarkPlus}
                  className="w-full text-xs border-neutral-300 text-neutral-700 hover:bg-neutral-50 mt-1"
                >
                  Save Completed Trip to Model
                </Button>
                {tripRecordedMsg && (
                  <p className="text-[11px] text-emerald-700 text-center font-bold">
                    {tripRecordedMsg}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Routing Strategy & Weather Options */}
          <div className="pt-2 border-t border-neutral-100 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-700">Optimization Strategy</span>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                className="bg-neutral-50 border border-neutral-300 rounded-lg px-2 py-1 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-blue-500"
              >
                <option value="A*">⚡ Fastest Time (A* Heuristic)</option>
                <option value="Dijkstra">📍 Shortest Distance (Dijkstra)</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-700">Weather Simulation</span>
              <select
                value={weatherCondition}
                onChange={(e) => setWeatherCondition(e.target.value)}
                className="bg-neutral-50 border border-neutral-300 rounded-lg px-2 py-1 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-blue-500"
              >
                <option value="Clear">☀️ Clear (Normal Flow)</option>
                <option value="Rain">🌧️ Heavy Rain (-20% Speed)</option>
                <option value="Fog">🌫️ Fog / Mist (-15% Speed)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── EXPAND BUTTON (when sidebar is collapsed) ────────────────────────── */}
      {isSidebarCollapsed && (
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed(false)}
          className="absolute top-4 left-4 z-[1000] bg-white text-neutral-800 rounded-full px-4 py-2.5 shadow-xl border border-neutral-200 font-bold text-xs flex items-center gap-2 hover:bg-neutral-50 transition-all cursor-pointer"
        >
          <Search className="w-4 h-4 text-blue-600" />
          <span>Search Directions</span>
          <ChevronRight className="w-4 h-4 text-neutral-400" />
        </button>
      )}

      {/* ── LEAFLET MAP CANVAS ─────────────────────────────────────────────── */}
      <div className={`flex-1 relative h-full w-full bg-neutral-100 ${isPickingOnMap ? 'cursor-crosshair' : ''}`}>
        
        {/* Floating Top-Center Banner when picking location on map */}
        {isPickingOnMap && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-neutral-900/90 text-white backdrop-blur-md px-4 py-2 rounded-full shadow-xl border border-neutral-700 text-xs font-bold flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-blue-400 animate-spin" />
            <span>Click anywhere on the map to set your starting location</span>
            <button
              type="button"
              onClick={() => setIsPickingOnMap(false)}
              className="ml-2 px-2.5 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-[10px] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── GOOGLE MAPS FLOATING TOP-RIGHT CONTROLS ───────────────────────── */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2.5 select-none pointer-events-auto">
          
          {/* Live Traffic Toggle & Layer Mode */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl shadow-xl border border-neutral-200">
            {/* Live Traffic Toggle */}
            <button
              type="button"
              onClick={() => setShowLiveTrafficLayer(!showLiveTrafficLayer)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                showLiveTrafficLayer 
                  ? 'bg-emerald-500 text-white shadow-xs' 
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70'
              }`}
              title="Toggle Live Traffic Colored Polylines"
            >
              <span className={`w-2 h-2 rounded-full ${showLiveTrafficLayer ? 'bg-white' : 'bg-neutral-400'}`} />
              <span>Traffic</span>
            </button>

            {/* Map Style (Streets / Satellite) */}
            <button
              type="button"
              onClick={() => setMapStyle(mapStyle === 'streets' ? 'satellite' : 'streets')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                mapStyle === 'satellite' 
                  ? 'bg-neutral-900 text-white shadow-xs' 
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70'
              }`}
              title="Toggle Satellite / Streets Layer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{mapStyle === 'satellite' ? 'Satellite' : 'Default'}</span>
            </button>

            {/* Traffic Legend Toggle */}
            <button
              type="button"
              onClick={() => setShowTrafficLegend(!showTrafficLegend)}
              className="w-7 h-7 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
              title="Toggle Traffic Speed Legend"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          {/* Expandable Google Traffic Legend */}
          {showTrafficLegend && (
            <div className="bg-white p-3 rounded-2xl shadow-xl border border-neutral-200 text-xs w-52 space-y-2 animate-in fade-in zoom-in-95">
              <span className="text-[11px] font-bold text-neutral-700 block">Live Traffic Speed</span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2 text-neutral-700 font-medium">
                  <span className="w-3.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Fast (&gt;60 km/h)</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-700 font-medium">
                  <span className="w-3.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Moderate (35-60 km/h)</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-700 font-medium">
                  <span className="w-3.5 h-1.5 rounded-full bg-orange-500" />
                  <span>Slow (15-35 km/h)</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-700 font-medium">
                  <span className="w-3.5 h-1.5 rounded-full bg-red-600" />
                  <span>Heavy Gridlock (&lt;15 km/h)</span>
                </div>
              </div>
            </div>
          )}

          {/* OSMnx Feature Chips (Signals, Tolls, Radars, Fuel) */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-lg border border-neutral-200 text-[10px]">
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
                className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  activeInfraLayer === layer.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <span>{layer.icon}</span>
                <span>{layer.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── GOOGLE MAPS FLOATING BOTTOM-RIGHT CONTROLS ────────────────────── */}
        <div className="absolute bottom-6 right-6 z-[1000] flex flex-col items-center gap-3 select-none pointer-events-auto">
          
          {/* Google Maps "Locate Me / Re-Center" FAB */}
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={locatingDevice}
            className={`w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-xl border-2 transition-all cursor-pointer hover:scale-105 active:scale-95 ${
              isUsingCurrentLocation 
                ? 'border-blue-500 text-blue-600 ring-4 ring-blue-400/20' 
                : 'border-neutral-200 text-neutral-700 hover:text-blue-600 hover:border-blue-300'
            }`}
            title="Show Your Current Location"
          >
            {locatingDevice ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              <Crosshair className="w-5 h-5 text-blue-600" />
            )}
          </button>

          {/* Map Zoom Controls (+ / -) */}
          <MapZoomControls />
        </div>

        {/* Leaflet MapContainer */}
        <MapContainer
          center={[11.1271, 78.6569]}
          zoom={8}
          zoomControl={false}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          {/* Tile Layer: Carto Voyager (Streets) or Esri World Imagery (Satellite) */}
          {mapStyle === 'satellite' ? (
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              maxZoom={19}
            />
          )}

          {/* Live Traffic Network Segments (when toggled on) */}
          {showLiveTrafficLayer && networkSegments.map((seg) => {
            const latlngs = seg.geometry?.map(toLatLng) || [];
            const color = getTrafficColorHex(seg.traffic_level);
            return (
              <Polyline
                key={seg.road_id}
                positions={latlngs}
                pathOptions={{
                  color: color,
                  weight: 3.5,
                  opacity: 0.65,
                  lineCap: 'round'
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-neutral-900 block">{seg.road_name}</span>
                    <div className="text-neutral-600">Type: <span className="font-semibold text-neutral-900">{seg.road_type}</span></div>
                    <div className="text-neutral-600">Speed: <span className="font-mono font-bold text-emerald-600">{seg.predicted_speed} km/h</span></div>
                    <div className="text-neutral-600">Travel Time: <span className="font-mono font-bold text-neutral-900">{seg.predicted_travel_time} min</span></div>
                    <div className="text-neutral-600">Traffic: <span className="font-bold" style={{ color }}>{seg.traffic_level}</span></div>
                  </div>
                </Popup>
              </Polyline>
            );
          })}

          {/* Inactive Alternative Routes (Google Maps style Slate gray lines) */}
          {routeResult && (
            [routeResult.recommended_route, ...(routeResult.alternative_routes || [])]
              .filter(r => r && r !== currentActiveRoute)
              .map((alt, i) => (
                <Polyline
                  key={`inactive-alt-${i}`}
                  positions={alt.geometry?.map(toLatLng) || []}
                  pathOptions={{
                    color: '#64748b',
                    weight: 5,
                    dashArray: '8, 8',
                    opacity: 0.75,
                    lineCap: 'round'
                  }}
                />
              ))
          )}

          {/* Active Navigation Route (Google Maps Vibrant Blue with Deep Blue Casing) */}
          {currentActiveRoute && (
            <>
              {/* Outer Casing */}
              <Polyline
                positions={currentActiveRoute.geometry?.map(toLatLng) || []}
                pathOptions={{
                  color: '#1d4ed8',
                  weight: 8,
                  opacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
              {/* Core Route Line */}
              <Polyline
                positions={currentActiveRoute.geometry?.map(toLatLng) || []}
                pathOptions={{
                  color: '#3b82f6',
                  weight: 5.5,
                  opacity: 1.0,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
            </>
          )}

          {/* Auto-fit Bounds */}
          {currentActiveRoute && (
            <MapBoundsUpdater geometry={currentActiveRoute.geometry} />
          )}

          {/* OSMnx Infrastructure Markers */}
          {infraFeatures.map((feat, i) => (
            <Marker
              key={`infra-${i}`}
              position={[feat.lat, feat.lon]}
              icon={createInfraIcon('#2563eb', activeInfraLayer === 'traffic_signals' ? '🚦' : (activeInfraLayer === 'toll_booths' ? '🛑' : (activeInfraLayer === 'speed_cameras' ? '📹' : '⛽')))}
            >
              <Popup>
                <div className="text-xs space-y-1">
                  <span className="font-bold text-neutral-900 block">{feat.name}</span>
                  <div className="text-neutral-500 text-[11px]">{feat.city}</div>
                  <div className="text-[10px] text-blue-600 font-mono font-semibold">OSMnx OpenStreetMap Infrastructure</div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Map Pan Controller */}
          <MapPanController panTarget={panTarget} />

          {/* Map Click Setter for Pick-on-Map */}
          <MapClickLocationSetter 
            isPickingLocation={isPickingOnMap} 
            onLocationPicked={(lat, lng) => {
              updateLocationPosition(lat, lng, 'Pinned on Map', true);
              setIsPickingOnMap(false);
            }} 
          />

          {/* Current Location Marker & Radar Halos */}
          {userLocation && (
            <>
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={userLocation.accuracy ? Math.min(userLocation.accuracy, 2500) : 1500}
                pathOptions={{
                  color: '#2563eb',
                  fillColor: '#60a5fa',
                  fillOpacity: 0.15,
                  weight: 1.5,
                  dashArray: '4, 4'
                }}
              />
              <Marker
                draggable={true}
                eventHandlers={{
                  dragend: (e) => {
                    const marker = e.target;
                    const pos = marker.getLatLng();
                    updateLocationPosition(pos.lat, pos.lng, 'Fine-Tuned Pin', true);
                  }
                }}
                position={[userLocation.lat, userLocation.lng]}
                icon={createOriginPinIcon('Your Location')}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-blue-600 flex items-center gap-1">
                      <LocateFixed className="w-3.5 h-3.5" />
                      <span>Your Location (Draggable)</span>
                    </div>
                    <div className="text-[11px] text-neutral-600">
                      Coordinates: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                    </div>
                    <p className="text-[10px] text-blue-600 font-semibold pt-0.5">
                      💡 Drag this pin anywhere on the road to adjust your starting position!
                    </p>
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {/* Origin Marker (when NOT using user device location) */}
          {!isUsingCurrentLocation && sourceCoord && (
            <Marker 
              position={[sourceCoord.lat, sourceCoord.lng]}
              icon={createOriginPinIcon(sourceCoord.name || 'Origin')}
            >
              <Popup>
                <div className="text-xs">
                  <span className="font-bold text-blue-600">Origin Hub:</span> {sourceCoord.name}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Destination Marker (Red Pin B) */}
          {destCoord && (
            <Marker 
              position={[destCoord.lat, destCoord.lng]}
              icon={createDestinationPinIcon(destCoord.name || 'Destination')}
            >
              <Popup>
                <div className="text-xs">
                  <span className="font-bold text-red-600">Destination Hub:</span> {destCoord.name}
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
                  <div className="font-bold text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{inc.severity} Traffic Incident</span>
                  </div>
                  <div className="text-neutral-900 font-bold">{inc.road_name}</div>
                  <div className="text-neutral-600 text-[11px]">{inc.description}</div>
                  <div className="text-[10px] text-red-600 font-mono mt-1 font-bold">Delay penalty active</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
