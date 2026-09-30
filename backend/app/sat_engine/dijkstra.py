"""
dijkstra.py
-----------
Traffic-aware Dijkstra algorithm on Tamil Nadu road MultiDiGraph.
Adjusts edge travel times based on traffic predictions, rainfall penalties,
highway speed limits, and vehicle type (bike, car, bus).
"""

import heapq
import datetime
import math
from typing import Any
import networkx as nx
import os
import sys

_ENGINE_DIR = os.path.dirname(os.path.abspath(__file__))
if _ENGINE_DIR not in sys.path:
    sys.path.insert(0, _ENGINE_DIR)

try:
    from app.sat_engine.predict import predict_traffic, get_multiplier
    from app.sat_engine.weather import get_weather
    from app.sat_engine.graph_loader import get_graph, path_to_coords, path_length_km, get_nearest_node, geocode_location
    from app.sat_engine.osrm_router import fetch_osrm_driving_routes, generate_curved_fallback_polyline
except ImportError:
    from predict import predict_traffic, get_multiplier  # type: ignore
    from weather import get_weather  # type: ignore
    from graph_loader import get_graph, path_to_coords, path_length_km, get_nearest_node, geocode_location  # type: ignore
    from osrm_router import fetch_osrm_driving_routes, generate_curved_fallback_polyline  # type: ignore

# ── Vehicle Speed Profiles ─────────────────────────────────────────────────────
# Speed (km/h) per road type for each vehicle type
VEHICLE_SPEEDS = {
    "bike": {"highway": 70,  "main": 50,  "secondary": 38},
    "car":  {"highway": 90,  "main": 65,  "secondary": 45},
    "bus":  {"highway": 65,  "main": 45,  "secondary": 30},
}

# Rainfall speed reduction factor per vehicle
VEHICLE_RAIN_FACTOR = {
    "bike": 0.55,  # bikes slow down the most in rain
    "car":  0.80,
    "bus":  0.85,
}

VEHICLE_LABELS = {
    "bike": {"icon": "fa-motorcycle", "label": "Bike / Motorcycle"},
    "car":  {"icon": "fa-car",        "label": "Car / Taxi"},
    "bus":  {"icon": "fa-bus",        "label": "Bus / Public Transport"},
}

_RAIN_PENALTY = {
    (0,  5):   0.0,
    (5,  15): 25.0,
    (15, 30): 50.0,
    (30, 9e9): 90.0,
}


def _rain_penalty(rainfall_mm: float) -> float:
    for (lo, hi), penalty in _RAIN_PENALTY.items():
        if lo <= rainfall_mm < hi:
            return penalty
    return 90.0


def apply_traffic_weights(
    G: nx.MultiDiGraph,
    traffic_label: str,
    rainfall_mm: float,
    vehicle_type: str = "car",
) -> nx.MultiDiGraph:
    """
    Return a copy of G with edge 'travel_time' adjusted by:
      - vehicle-specific speed profile
      - traffic multiplier
      - rainfall slowdown per vehicle type
    """
    multiplier   = get_multiplier(traffic_label)
    rain_penalty = _rain_penalty(rainfall_mm)
    v_speeds     = VEHICLE_SPEEDS.get(vehicle_type, VEHICLE_SPEEDS["car"])
    rain_factor  = VEHICLE_RAIN_FACTOR.get(vehicle_type, 0.80)
    effective_rain = rain_penalty * (1.0 - rain_factor)  # extra seconds per km in rain

    H = G.copy()
    if getattr(H, "is_multigraph", lambda: False)():
        for u, v, key, data in H.edges(keys=True, data=True):
            length_m   = float(data.get("length", 1000.0))
            length_km  = length_m / 1000.0
            road_type  = str(data.get("highway", "highway")).lower()
            speed_kmh  = v_speeds.get(road_type, v_speeds["highway"])

            # Base travel time from vehicle speed
            base_tt = (length_km / speed_kmh) * 3600.0  # seconds

            adjusted_tt = (base_tt * multiplier) + (effective_rain * length_km)
            H[u][v][key]["travel_time"] = adjusted_tt
    else:
        for u, v, data in H.edges(data=True):
            length_m   = float(data.get("length", 1000.0))
            length_km  = length_m / 1000.0
            road_type  = str(data.get("highway", "highway")).lower()
            speed_kmh  = v_speeds.get(road_type, v_speeds["highway"])

            # Base travel time from vehicle speed
            base_tt = (length_km / speed_kmh) * 3600.0  # seconds

            adjusted_tt = (base_tt * multiplier) + (effective_rain * length_km)
            H[u][v]["travel_time"] = adjusted_tt

    return H


def _straight_line_distance_m(G: nx.MultiDiGraph, source: Any, target: Any) -> float:
    """Return the great-circle distance between two graph nodes in metres."""
    source_data = G.nodes.get(source) or G.nodes.get(str(source)) or G.nodes.get(int(source) if str(source).isdigit() else source, {})
    target_data = G.nodes.get(target) or G.nodes.get(str(target)) or G.nodes.get(int(target) if str(target).isdigit() else target, {})
    source_lat = float(source_data.get("y", 0.0))
    source_lon = float(source_data.get("x", 0.0))
    target_lat = float(target_data.get("y", 0.0))
    target_lon = float(target_data.get("x", 0.0))

    earth_radius_m = 6_371_000.0
    lat1 = math.radians(source_lat)
    lat2 = math.radians(target_lat)
    delta_lat = math.radians(target_lat - source_lat)
    delta_lon = math.radians(target_lon - source_lon)
    haversine = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
    )
    return earth_radius_m * 2 * math.asin(math.sqrt(haversine))


def dijkstra(G: nx.MultiDiGraph, source: Any, target: Any, weight_key: str = "travel_time") -> tuple[list, float]:
    """
    Find the shortest path using A* with the same exact costs as Dijkstra.

    The geographic heuristic points the search toward the destination. For
    travel time, the fastest speed present in the weighted graph keeps the
    heuristic admissible, so route results remain optimal.
    """
    if source not in G.nodes:
        if str(source) in G.nodes:
            source = str(source)  # type: ignore
        elif str(source).isdigit() and int(source) in G.nodes:
            source = int(source)
    if target not in G.nodes:
        if str(target) in G.nodes:
            target = str(target)  # type: ignore
        elif str(target).isdigit() and int(target) in G.nodes:
            target = int(target)

    if source == target:
        return [source], 0.0

    max_speed_mps = 0.0
    if weight_key != "length":
        for _, _, data in G.edges(data=True):
            length_m = float(data.get("length", 1000.0))
            travel_time = float(data.get("travel_time", length_m / 20.0))
            if length_m > 0 and travel_time > 0:
                max_speed_mps = max(max_speed_mps, length_m / travel_time)

    def heuristic(node: int) -> float:
        distance_m = _straight_line_distance_m(G, node, target)
        if weight_key == "length":
            return distance_m
        if max_speed_mps == 0.0:
            return 0.0
        return distance_m / max_speed_mps

    dist = {source: 0.0}
    prev: dict[int, int] = {}
    heap = [(heuristic(source), 0.0, source)]

    while heap:
        _, cost, u = heapq.heappop(heap)
        if u == target:
            break
        if cost > dist.get(u, float("inf")):
            continue

        for _, v, data in G.edges(u, data=True):
            if weight_key == "length":
                w = float(data.get("length", 1000.0))
            else:
                tt = data.get("travel_time")
                if tt is not None:
                    w = float(tt)
                else:
                    w = float(data.get("length", 1000.0)) / 20.0
            nc = cost + w
            if nc < dist.get(v, float("inf")):
                dist[v] = nc
                prev[v] = u
                heapq.heappush(heap, (nc + heuristic(v), nc, v))

    if target not in dist:
        return [], float("inf")

    path, node = [], target
    while node != source:
        path.append(node)
        node = prev.get(node)
        if node is None:
            return [], float("inf")
    path.append(source)
    path.reverse()
    return path, dist[target]


def _extract_via_summary(G: nx.MultiDiGraph, path: list[int]) -> str:
    """Extract human-readable intermediate city corridor summary (e.g. 'via Erode & Salem')."""
    if len(path) <= 2:
        return "Direct Corridor"
    
    cities = []
    for node in path[1:-1]:
        name = G.nodes[node].get("name")
        if name and name not in cities:
            cities.append(name)
            
    if not cities:
        return "Direct Highway"
    if len(cities) == 1:
        return f"via {cities[0]}"
    if len(cities) == 2:
        return f"via {cities[0]} & {cities[1]}"
    return f"via {', '.join(cities[:-1])} & {cities[-1]}"


def get_real_road_polyline_for_path(path: list[int], G: nx.MultiDiGraph) -> list[list[float]]:
    """Convert graph node path [u, v, ...] to high-resolution real road coordinates using OSRM segment calls."""
    if len(path) < 2:
        return path_to_coords(path)
    
    full_coords = []
    for u, v in zip(path[:-1], path[1:]):
        u_data, v_data = G.nodes[u], G.nodes[v]
        u_lat, u_lon = float(u_data["y"]), float(u_data["x"])
        v_lat, v_lon = float(v_data["y"]), float(v_data["x"])

        seg_routes = fetch_osrm_driving_routes(u_lat, u_lon, v_lat, v_lon)
        if seg_routes and seg_routes[0].get("coordinates"):
            seg_pts = seg_routes[0]["coordinates"]
            if full_coords:
                full_coords.extend(seg_pts[1:])
            else:
                full_coords.extend(seg_pts)
        else:
            seg_pts = generate_curved_fallback_polyline([[u_lat, u_lon], [v_lat, v_lon]], num_subpoints=6)
            if full_coords:
                full_coords.extend(seg_pts[1:])
            else:
                full_coords.extend(seg_pts)

    return full_coords if full_coords else path_to_coords(path)


def _format_route_item(
    G: nx.MultiDiGraph,
    H: nx.MultiDiGraph,
    path: list[int],
    route_id: str,
    name: str,
    badge: str,
    tag: str,
    color: str,
    traffic_label: str,
    is_fastest: bool = False,
    is_shortest_distance: bool = False,
    curve_offset: float = 0.015,
) -> dict:
    """Helper to convert node path into route dictionary."""
    dist_km = path_length_km(path)

    # Compute actual travel seconds on weighted graph H
    travel_seconds = 0.0
    for u, v in zip(path[:-1], path[1:]):
        edges = H.get_edge_data(u, v)
        if edges:
            data = min(edges.values(), key=lambda d: float(d.get("travel_time", 9e9)))
            travel_seconds += float(data.get("travel_time", 60.0))
        else:
            travel_seconds += 300.0

    travel_time_min = max(1.0, round(travel_seconds / 60.0, 1))
    coords = get_real_road_polyline_for_path(path, G)

    # Dominant road type
    road_types = []
    for u, v in zip(path[:-1], path[1:]):
        edges = G.get_edge_data(u, v)
        if edges:
            data = list(edges.values())[0]
            ht = data.get("highway", "highway")
            road_types.append(ht if isinstance(ht, str) else ht[0])
    road_type = max(set(road_types), key=road_types.count) if road_types else "highway"

    via_summary = _extract_via_summary(G, path)

    return {
        "id":                     route_id,
        "name":                   name,
        "badge":                  badge,
        "tag":                    tag,
        "distance_km":            dist_km,
        "travel_time_min":        travel_time_min,
        "traffic":                traffic_label,
        "coordinates":            coords,
        "path_nodes":             path,
        "road_type":              road_type.capitalize(),
        "via_summary":            via_summary,
        "color":                  color,
        "is_fastest":             is_fastest,
        "is_shortest_distance":   is_shortest_distance,
    }


def _compute_hourly_forecast(
    G: nx.MultiDiGraph, src_node: int, dst_node: int,
    rainfall: float, day: int, vehicle_type: str = "car"
) -> tuple[list, str, str]:
    """
    Compute estimated travel times for key departure windows factoring in
    vehicle type speed profiles and congestion levels.
    """
    slots = [
        {"time": "06:00 AM", "hour": 6,  "desc": "Early Morning"},
        {"time": "09:00 AM", "hour": 9,  "desc": "Morning Rush"},
        {"time": "01:00 PM", "hour": 13, "desc": "Mid-Day"},
        {"time": "06:30 PM", "hour": 18, "desc": "Evening Rush"},
        {"time": "10:00 PM", "hour": 22, "desc": "Late Night"},
    ]

    forecast = []
    for slot in slots:
        hr = int(slot["hour"])
        if 8 <= hr <= 10 or 17 <= hr <= 20:
            veh_cnt = 340 if day < 5 else 220
        elif 11 <= hr <= 16:
            veh_cnt = 210
        elif 21 <= hr <= 23:
            veh_cnt = 140
        else:
            veh_cnt = 60

        features = {
            "hour":          hr,
            "day":           day,
            "festival":      0,
            "rainfall":      rainfall,
            "temperature":   30.0,
            "road_type":     "highway",
            "vehicle_count": veh_cnt,
        }

        traffic = predict_traffic(features)
        H = apply_traffic_weights(G, traffic, rainfall, vehicle_type)
        _, t_sec = dijkstra(H, src_node, dst_node, weight_key="travel_time")
        t_min = max(1.0, round(t_sec / 60.0, 1))

        forecast.append({
            "time": slot["time"],
            "desc": slot["desc"],
            "traffic": traffic,
            "travel_time_min": t_min,
        })

    low_window    = "06:00 AM – 08:00 AM & 09:30 PM – 11:30 PM"
    heavy_window  = "08:30 AM – 10:30 AM & 05:30 PM – 08:30 PM"
    return forecast, low_window, heavy_window


def _is_gps_input(place: str) -> bool:
    """Return True if the place string contains explicit GPS coordinates."""
    import re
    return bool(re.search(r"-?\d+\.\d+\s*,\s*-?\d+\.\d+", (place or "").strip()))


def find_best_route(source_name: str, dest_name: str, vehicle_type: str = "car") -> dict:
    """
    Full routing pipeline:
    Geocode -> Graph Nodes -> Weather -> Traffic ML Prediction
    -> Multi-Route Dijkstra (Fastest Route, Shortest Distance Route, Alternative Route)
    -> Hourly Departure Forecast.
    """
    vehicle_type = vehicle_type.lower().strip()
    if vehicle_type not in VEHICLE_SPEEDS:
        vehicle_type = "car"

    # 1. Geocode — remember whether the user supplied raw GPS coords
    src_lat, src_lon = geocode_location(source_name)
    dst_lat, dst_lon = geocode_location(dest_name)
    src_is_gps = _is_gps_input(source_name)
    dst_is_gps = _is_gps_input(dest_name)

    # ── Start OSRM fetch in background thread immediately (parallel with graph/ML) ──
    import threading as _threading
    _osrm_result: list = []
    def _osrm_fetch():
        try:
            _osrm_result.extend(fetch_osrm_driving_routes(src_lat, src_lon, dst_lat, dst_lon))
        except Exception:
            pass
    _osrm_thread = _threading.Thread(target=_osrm_fetch, daemon=True)
    _osrm_thread.start()

    # 2. Graph & Nearest Nodes
    G = get_graph()
    src_node = get_nearest_node(src_lat, src_lon)
    dst_node = get_nearest_node(dst_lat, dst_lon)

    # 3. Weather
    weather     = get_weather(src_lat, src_lon)
    rainfall    = weather.get("rainfall", 0.0)
    temperature = weather.get("temperature", 30.0)

    # 4. Predict Traffic Level
    now = datetime.datetime.now()
    features = {
        "hour":          now.hour,
        "day":           now.weekday(),
        "festival":      0,
        "rainfall":      rainfall,
        "temperature":   temperature,
        "road_type":     "highway",
        "vehicle_count": 220 if (8 <= now.hour <= 10 or 17 <= now.hour <= 20) else 120,
    }
    traffic_label = predict_traffic(features)

    # 5. Apply vehicle+traffic weights & wait for OSRM fetch to complete
    H = apply_traffic_weights(G, traffic_label, rainfall, vehicle_type)
    multiplier = get_multiplier(traffic_label)
    rain_factor = VEHICLE_RAIN_FACTOR.get(vehicle_type, 0.80)

    # ── Wait for OSRM result (already ran in background) ────────────────────
    _osrm_thread.join(timeout=10)
    osrm_routes_raw = _osrm_result

    if osrm_routes_raw:
        routes = []
        route_configs = [
            {
                "id": "fastest",
                "name": "Fastest Road Route (Traffic-Optimized)",
                "badge": "⚡ Fastest Route",
                "tag": "Traffic-Optimized",
                "color": "#0ea5e9",
                "is_fastest": True,
                "is_shortest_distance": False,
            },
            {
                "id": "shortest_distance",
                "name": "Shortest Distance Highway",
                "badge": "📏 Shortest Distance",
                "tag": "Least Kilometers",
                "color": "#10b981",
                "is_fastest": False,
                "is_shortest_distance": True,
            },
            {
                "id": "alternative",
                "name": "Alternative Scenic Highway",
                "badge": "🛣️ Alternative Route",
                "tag": "Bypass Corridor",
                "color": "#8b5cf6",
                "is_fastest": False,
                "is_shortest_distance": False,
            },
        ]

        for i, raw in enumerate(osrm_routes_raw[:3]):
            config = route_configs[i] if i < len(route_configs) else route_configs[2]
            dist_km = raw["distance_km"]
            base_dur = raw["base_duration_min"]
            travel_time_min = max(1.0, round(base_dur * multiplier / rain_factor, 1))
            coords = raw["coordinates"]

            routes.append({
                "id": config["id"],
                "name": config["name"],
                "badge": config["badge"],
                "tag": config["tag"],
                "distance_km": dist_km,
                "travel_time_min": travel_time_min,
                "traffic": traffic_label,
                "coordinates": coords,
                "road_type": "Expressway / Highway",
                "via_summary": raw["summary"],
                "color": config["color"],
                "is_fastest": config["is_fastest"],
                "is_shortest_distance": config["is_shortest_distance"],
            })

        # If OSRM returned only 1 route, check if Dijkstra path provides a valid distinct non-zero route
        if len(routes) == 1:
            if src_node != dst_node:
                path_dist, _ = dijkstra(H, src_node, dst_node, weight_key="length")
                if path_dist:
                    route_dist = _format_route_item(
                        G, H, path_dist,
                        route_id="shortest_distance",
                        name="Shortest Distance Route",
                        badge="📏 Shortest Distance",
                        tag="Least Kilometers",
                        color="#10b981",
                        traffic_label=traffic_label,
                        is_fastest=False,
                        is_shortest_distance=True,
                    )
                    if route_dist["distance_km"] > 0 and route_dist["distance_km"] != routes[0]["distance_km"]:
                        routes.append(route_dist)

        # If only 1 valid route exists (or intra-city GPS route), set it as both Fastest & Shortest
        if len(routes) == 1:
            routes[0]["is_shortest_distance"] = True
            routes[0]["name"] = "Fastest & Shortest Road Route"
            routes[0]["badge"] = "⚡ Fastest & 📏 Shortest"

        route_fastest = routes[0]

    else:
        # ── Fallback to Graph Dijkstra with Curved Geometry ─────────────────
        path_fastest, _ = dijkstra(H, src_node, dst_node, weight_key="travel_time")
        if not path_fastest:
            path_fastest = [src_node, dst_node] if src_node != dst_node else [src_node]

        route_fastest = _format_route_item(
            G, H, path_fastest,
            route_id="fastest",
            name="Fastest Route (Shortest Time)",
            badge="⚡ Fastest Route",
            tag="Traffic-Optimized",
            color="#0ea5e9",
            traffic_label=traffic_label,
            is_fastest=True,
            is_shortest_distance=False,
        )

        path_dist, _ = dijkstra(H, src_node, dst_node, weight_key="length")
        if not path_dist:
            path_dist = path_fastest

        is_same_path = (path_dist == path_fastest)

        route_dist = _format_route_item(
            G, H, path_dist,
            route_id="shortest_distance",
            name="Shortest Distance Route",
            badge="📏 Shortest Distance",
            tag="Least Kilometers",
            color="#10b981",
            traffic_label=traffic_label,
            is_fastest=is_same_path,
            is_shortest_distance=True,
        )

        if is_same_path:
            route_fastest["is_shortest_distance"] = True
            route_fastest["name"] = "Fastest & Shortest Distance Route"
            route_fastest["badge"] = "⚡ Fastest & 📏 Shortest"

        routes = [route_fastest]
        if not is_same_path:
            routes.append(route_dist)

        H_alt = H.copy()
        for u, v in zip(path_fastest[:-1], path_fastest[1:]):
            if H_alt.has_edge(u, v):
                for k in H_alt[u][v]:
                    H_alt[u][v][k]["travel_time"] *= 2.2
                    H_alt[u][v][k]["length"] *= 2.2

        path_alt, _ = dijkstra(H_alt, src_node, dst_node, weight_key="travel_time")
        if path_alt and path_alt != path_fastest and path_alt != path_dist:
            route_alt = _format_route_item(
                G, H, path_alt,
                route_id="alternative",
                name="Alternative Highway Route",
                badge="🛣️ Alternative Route",
                tag="Bypass Corridor",
                color="#8b5cf6",
                traffic_label="Low" if traffic_label != "Low" else "Medium",
                is_fastest=False,
                is_shortest_distance=False,
            )
            routes.append(route_alt)

    # ── PIN exact GPS coords into each route's polyline ─────────────────────────
    for r in routes:
        coords = r.get("coordinates", [])
        if not coords:
            continue
        if src_is_gps:
            if coords[0] != [src_lat, src_lon]:
                coords.insert(0, [src_lat, src_lon])
        if dst_is_gps:
            if coords[-1] != [dst_lat, dst_lon]:
                coords.append([dst_lat, dst_lon])
        r["coordinates"] = coords

    # Primary default route selected is fastest
    primary_route = route_fastest

    # 6. Compute travel times for other vehicles for comparison
    vehicle_times = {}
    for vt in ["bike", "car", "bus"]:
        Hv = apply_traffic_weights(G, traffic_label, rainfall, vt)
        _, t_sec_v = dijkstra(Hv, src_node, dst_node, weight_key="travel_time")
        vehicle_times[vt] = max(1.0, round(t_sec_v / 60.0, 1))

    # 7. Hourly departure forecast for selected vehicle
    hourly_forecast, low_traffic_time, heavy_traffic_time = _compute_hourly_forecast(
        G, src_node, dst_node, rainfall, now.weekday(), vehicle_type
    )

    v_info = VEHICLE_LABELS.get(vehicle_type, VEHICLE_LABELS["car"])

    return {
        "source":               source_name.title(),
        "destination":          dest_name.title(),
        "distance_km":          primary_route["distance_km"],
        "travel_time_min":      primary_route["travel_time_min"],
        "traffic":              primary_route["traffic"],
        "weather":              weather,
        "coordinates":          primary_route["coordinates"],
        "road_type":            primary_route["road_type"],
        "via_summary":          primary_route["via_summary"],
        "vehicle_type":         vehicle_type,
        "vehicle_label":        v_info["label"],
        "vehicle_icon":         v_info["icon"],
        "vehicle_times":        vehicle_times,
        "low_traffic_time":     low_traffic_time,
        "heavy_traffic_time":   heavy_traffic_time,
        "hourly_forecast":      hourly_forecast,
        "routes":               routes,
    }

