"""
osrm_router.py
--------------
Fetches real, drivable road network geometry and turn-by-turn routes using OSRM
(Open Source Routing Machine) with automatic fallback mirrors.
Returns high-resolution polyline coordinates [[lat, lon], ...] following actual roads,
real driving distances in km, base travel times, and road summaries.
"""

import requests
import math
import threading

OSRM_SERVERS = [
    "http://router.project-osrm.org",
    "https://routing.openstreetmap.de/routed-car",
]

HEADERS = {
    "User-Agent": "SmartTrafficFinder/1.0 (TamilNadu Routing System)"
}


def fetch_osrm_driving_routes(src_lat: float, src_lon: float, dst_lat: float, dst_lon: float) -> list[dict]:
    """
    Fetch real driving road routes between (src_lat, src_lon) and (dst_lat, dst_lon).
    Returns list of route dicts containing:
      - coordinates: list of [lat, lon] points tracing actual roads
      - distance_km: real road driving distance in kilometers
      - base_duration_min: estimated base driving time in minutes (unweighted)
      - summary: main highways/roads used (e.g. 'NH 544', 'SH 79')
    """
    for server in OSRM_SERVERS:
        url = f"{server}/route/v1/driving/{src_lon},{src_lat};{dst_lon},{dst_lat}?overview=full&geometries=geojson&alternatives=true"
        try:
            res = requests.get(url, headers=HEADERS, timeout=8)
            if res.status_code == 200:
                data = res.json()
                routes = data.get("routes", [])
                parsed_routes = []
                
                for idx, r in enumerate(routes):
                    raw_coords = r.get("geometry", {}).get("coordinates", [])
                    if not raw_coords:
                        continue
                    
                    # Convert GeoJSON [lon, lat] -> Leaflet [lat, lon]
                    leaflet_coords = [[round(lat, 5), round(lon, 5)] for lon, lat in raw_coords]
                    dist_km = round(float(r.get("distance", 0.0)) / 1000.0, 1)
                    dur_min = round(float(r.get("duration", 0.0)) / 60.0, 1)
                    summary = str(r.get("summary") or "").strip()
                    
                    if not summary:
                        summary = f"Corridor Route {idx + 1}"
                    elif not summary.lower().startswith("via"):
                        summary = f"via {summary}"

                    parsed_routes.append({
                        "coordinates": leaflet_coords,
                        "distance_km": dist_km,
                        "base_duration_min": dur_min,
                        "summary": summary,
                        "points_count": len(leaflet_coords)
                    })
                
                if parsed_routes:
                    return parsed_routes
        except Exception as exc:
            print(f"[OSRM] Mirror {server} fetch failed/timed out: {exc}")
            continue

    return []


def generate_curved_fallback_polyline(points: list[list[float]], num_subpoints: int = 4) -> list[list[float]]:
    """
    Generate smooth curved road-like polyline points between sparse waypoints
    for offline fallback when network OSRM is unreachable.
    """
    if len(points) < 2:
        return points

    curved_coords = []
    for i in range(len(points) - 1):
        p1 = points[i]
        p2 = points[i + 1]
        curved_coords.append([p1[0], p1[1]])

        # Create intermediate curved points along perpendicular offset
        dx = p2[1] - p1[1]
        dy = p2[0] - p1[0]
        dist = math.sqrt(dx * dx + dy * dy)

        if dist > 0:
            # Perpendicular vector
            perp_x = -dy / dist
            perp_y = dx / dist
            amplitude = min(0.02, dist * 0.12) * (1 if i % 2 == 0 else -1)

            for step in range(1, num_subpoints):
                t = step / float(num_subpoints)
                # Sine wave offset to create natural road curvature
                offset = amplitude * math.sin(t * math.pi)
                lat = p1[0] + t * dy + offset * perp_y
                lon = p1[1] + t * dx + offset * perp_x
                curved_coords.append([round(lat, 5), round(lon, 5)])

    curved_coords.append([points[-1][0], points[-1][1]])
    return curved_coords
