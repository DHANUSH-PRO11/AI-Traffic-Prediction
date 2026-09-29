"""
graph_loader.py
---------------
Road-network loader and geocoder for Smart Traffic Finder.
- Loads cached MultiDiGraph from models/road_graph.graphml.
- Fast local geocoding dictionary with coordinate-string support.
- Waypoint polyline generator for Leaflet map display.
"""

import os
import sys
_ENGINE_DIR = os.path.dirname(os.path.abspath(__file__))
if _ENGINE_DIR not in sys.path:
    sys.path.insert(0, _ENGINE_DIR)

import math
try:
    import osmnx as ox
except ImportError:
    ox = None
import networkx as nx

try:
    from app.sat_engine.config import GRAPH_CACHE
    from app.sat_engine.osrm_router import generate_curved_fallback_polyline
except ImportError:
    from config import GRAPH_CACHE  # type: ignore
    from osrm_router import generate_curved_fallback_polyline  # type: ignore

_graph: nx.MultiDiGraph | None = None

# Known Tamil Nadu location coordinates dictionary for instant lookup
KNOWN_LOCATIONS = {
    "chennai":        (13.0827, 80.2707),
    "kanchipuram":    (12.8342, 79.7036),
    "chengalpattu":   (12.6820, 79.9800),
    "vellore":        (12.9165, 79.1325),
    "tiruvannamalai": (12.2253, 79.0747),
    "villupuram":     (11.9401, 79.4861),
    "pondicherry":    (11.9416, 79.8083),
    "puducherry":     (11.9416, 79.8083),
    "cuddalore":      (11.7480, 79.7714),
    "hosur":          (12.7409, 77.8253),
    "krishnagiri":    (12.5186, 78.2137),
    "dharmapuri":     (12.1211, 78.1582),
    "salem":          (11.6643, 78.1460),
    "namakkal":       (11.2189, 78.1674),
    "erode":          (11.3410, 77.7172),
    "tiruppur":       (11.1085, 77.3411),
    "tirupur":        (11.1085, 77.3411),
    "coimbatore":     (11.0168, 76.9558),
    "ooty":           (11.4102, 76.6950),
    "udagamandalam":  (11.4102, 76.6950),
    "karur":          (10.9601, 78.0766),
    "trichy":         (10.7905, 78.7047),
    "tiruchirappalli":(10.7905, 78.7047),
    "thanjavur":      (10.7870, 79.1378),
    "kumbakonam":     (10.9602, 79.3782),
    "dindigul":       (10.3673, 77.9803),
    "madurai":        (9.9252,  78.1198),
    "theni":          (10.0104, 77.4768),
    "virudhunagar":   (9.5680,  77.9624),
    "rajapalayam":    (9.4533,  77.5539),
    "tirunelveli":    (8.7139,  77.7567),
    "tuticorin":      (8.7642,  78.1348),
    "thoothukudi":    (8.7642,  78.1348),
    "kanyakumari":    (8.0883,  77.5385),
    "nagercoil":      (8.1833,  77.4119),
}

# ── Graph Loader ──────────────────────────────────────────────────────────────

def get_graph() -> nx.MultiDiGraph:
    """Return cached MultiDiGraph; build if missing."""
    global _graph
    if _graph is not None:
        return _graph

    if os.path.exists(GRAPH_CACHE):
        print("[Graph] Loading from cache...")
        try:
            _graph = nx.read_graphml(GRAPH_CACHE, node_type=int)
        except Exception:
            try:
                _graph = nx.read_graphml(GRAPH_CACHE)
            except Exception:
                _graph = None

    if _graph is None:
        print("[Graph] Graph cache missing or unreadable. Generating network...")
        try:
            from app.sat_engine.build_road_graph import create_road_graph
        except ImportError:
            from build_road_graph import create_road_graph  # type: ignore
        _graph = create_road_graph()

    assert _graph is not None
    return _graph


# ── Geocoding ─────────────────────────────────────────────────────────────────

def geocode_location(place: str) -> tuple[float, float]:
    """Convert place name or coordinate string to (lat, lon)."""
    import re
    cleaned = (place or "").strip().lower()

    # 1. Check if string contains explicit coordinates e.g. "11.0168, 76.9558" or "Coimbatore (11.0168, 76.9558)"
    match = re.search(r"(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)", cleaned)
    if match:
        try:
            return float(match.group(1)), float(match.group(2))
        except ValueError:
            pass

    # 2. Fast local dictionary lookup with word boundary or exact match
    for key, coords in KNOWN_LOCATIONS.items():
        if re.search(r'\b' + re.escape(key) + r'\b', cleaned) or key == cleaned:
            return coords

    raise ValueError(
        f"Location '{place}' is not in the local dataset. "
        "Use a supported Tamil Nadu city or enter coordinates as 'lat, lon'."
    )


def get_nearest_node(lat: float, lon: float) -> int:
    """Return node id nearest to (lat, lon)."""
    G = get_graph()
    
    # Fast Haversine minimum distance search across nodes
    best_node = None
    min_dist = float("inf")

    for node_id, data in G.nodes(data=True):
        ny = float(data.get("y", 0.0))
        nx_val = float(data.get("x", 0.0))
        dist = (ny - lat)**2 + (nx_val - lon)**2
        if dist < min_dist:
            min_dist = dist
            best_node = node_id

    # Fallback to osmnx if available
    if best_node is None:
        best_node = list(G.nodes)[0]
    return int(best_node)


# ── Path & Polyline Helpers ───────────────────────────────────────────────────

def path_to_coords(path: list[int]) -> list[list[float]]:
    """Convert node path to [[lat, lon], ...] with high-density curved waypoints for Leaflet."""
    G = get_graph()
    raw_nodes = []
    for node_u in path:
        u_data = G.nodes[node_u]
        raw_nodes.append([float(u_data["y"]), float(u_data["x"])])

    return generate_curved_fallback_polyline(raw_nodes, num_subpoints=6)


def path_length_km(path: list[int]) -> float:
    """Return total path distance in kilometers."""
    G = get_graph()
    total_meters = 0.0
    for u, v in zip(path[:-1], path[1:]):
        edges = G.get_edge_data(u, v)
        if edges:
            data = min(edges.values(), key=lambda d: float(d.get("length", 9e9)))
            total_meters += float(data.get("length", 0.0))
        else:
            # Fallback estimation if direct edge attribute missing
            u_data, v_data = G.nodes[u], G.nodes[v]
            dy = (float(v_data["y"]) - float(u_data["y"])) * 111.0
            dx = (float(v_data["x"]) - float(u_data["x"])) * 111.0 * math.cos(math.radians(float(u_data["y"])))
            total_meters += math.sqrt(dy*dy + dx*dx) * 1000.0

    return round(total_meters / 1000.0, 1)
