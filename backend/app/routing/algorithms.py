import heapq
from typing import Dict, List, Any, Optional, Tuple, Set
from app.routing.graph import RoadNetworkGraph, haversine_distance

def heuristic_travel_time(node_id: str, dest_node_id: str, graph: RoadNetworkGraph) -> float:
    """
    Admissible A* heuristic:
    Haversine distance (km) / maximum network permissible speed (km/h) * 60 minutes.
    Since speed <= max_system_speed on all roads, this never overestimates the actual remaining travel time.
    """
    curr = graph.get_node(node_id)
    dest = graph.get_node(dest_node_id)
    if not curr or not dest:
        return 0.0
    dist_km = haversine_distance(curr["lat"], curr["lng"], dest["lat"], dest["lng"])
    # in minutes:
    return (dist_km / graph.max_system_speed) * 60.0

def dijkstra_shortest_path(
    graph: RoadNetworkGraph,
    start_node: str,
    dest_node: str,
    edge_penalties: Optional[Dict[str, float]] = None
) -> Optional[Dict[str, Any]]:
    """
    Dijkstra pathfinding where edge weight is predicted travel time.
    """
    return run_pathfinding(graph, start_node, dest_node, algorithm="Dijkstra", edge_penalties=edge_penalties)

def astar_shortest_path(
    graph: RoadNetworkGraph,
    start_node: str,
    dest_node: str,
    edge_penalties: Optional[Dict[str, float]] = None
) -> Optional[Dict[str, Any]]:
    """
    A* pathfinding where edge weight is predicted travel time with admissible Euclidean/Haversine heuristic.
    """
    return run_pathfinding(graph, start_node, dest_node, algorithm="A*", edge_penalties=edge_penalties)

def run_pathfinding(
    graph: RoadNetworkGraph,
    start_node: str,
    dest_node: str,
    algorithm: str = "A*",
    edge_penalties: Optional[Dict[str, float]] = None
) -> Optional[Dict[str, Any]]:
    if start_node not in graph.nodes or dest_node not in graph.nodes:
        return None

    penalties = edge_penalties or {}

    # Priority queue stores: (f_score, g_score, current_node, path_segments)
    # where f_score = g_score for Dijkstra, or g_score + h for A*
    h_start = heuristic_travel_time(start_node, dest_node, graph) if algorithm == "A*" else 0.0
    queue: List[Tuple[float, float, str, List[Dict[str, Any]]]] = [
        (h_start, 0.0, start_node, [])
    ]
    
    # Best g_score (accumulated travel time) to each node
    best_g: Dict[str, float] = {start_node: 0.0}
    visited: Set[str] = set()

    while queue:
        f_score, g_score, curr_node, path = heapq.heappop(queue)

        if curr_node == dest_node:
            return assemble_route_result(graph, algorithm, path, start_node, dest_node)

        if curr_node in visited:
            continue
        visited.add(curr_node)

        for edge in graph.get_neighbors(curr_node):
            next_node = edge["end_node"]
            road_id = edge["road_id"]

            # Edge weight = predicted travel time (in minutes)
            # Include dynamic penalties (for alternative route calculation or severe incidents)
            base_travel_time = edge.get("predicted_travel_time", (edge["length"] / edge["max_speed"]) * 60.0)
            penalty_multiplier = penalties.get(road_id, 1.0)
            
            # If edge has active incident, add delay penalty
            if edge.get("has_incident", False):
                incident_sev = edge.get("incident_severity", "MEDIUM")
                severity_mult = {"LOW": 1.4, "MEDIUM": 2.2, "HIGH": 3.8, "SEVERE": 5.5}.get(incident_sev, 2.0)
                base_travel_time *= severity_mult

            edge_cost = base_travel_time * penalty_multiplier
            new_g = g_score + edge_cost

            if next_node not in best_g or new_g < best_g[next_node]:
                best_g[next_node] = new_g
                h_next = heuristic_travel_time(next_node, dest_node, graph) if algorithm == "A*" else 0.0
                new_f = new_g + h_next
                heapq.heappush(queue, (new_f, new_g, next_node, path + [edge]))

    return None

def assemble_route_result(
    graph: RoadNetworkGraph,
    algorithm: str,
    path_edges: List[Dict[str, Any]],
    start_node: str,
    dest_node: str
) -> Dict[str, Any]:
    total_dist = 0.0
    total_time = 0.0
    free_flow_time = 0.0
    full_geometry: List[List[float]] = []
    path_nodes = [start_node]
    segment_details = []
    traffic_level_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "SEVERE": 0}

    for edge in path_edges:
        length_km = edge["length"]
        speed_kmh = edge.get("predicted_speed", edge["max_speed"] * 0.8)
        travel_time_min = (length_km / speed_kmh) * 60.0
        
        if edge.get("has_incident"):
            incident_sev = edge.get("incident_severity", "MEDIUM")
            mult = {"LOW": 1.4, "MEDIUM": 2.2, "HIGH": 3.8, "SEVERE": 5.5}.get(incident_sev, 2.0)
            travel_time_min *= mult

        ff_time = (length_km / edge["max_speed"]) * 60.0
        t_level = edge.get("traffic_level", "LOW")
        traffic_level_counts[t_level] = traffic_level_counts.get(t_level, 0) + 1

        total_dist += length_km
        total_time += travel_time_min
        free_flow_time += ff_time

        path_nodes.append(edge["end_node"])
        
        geom = edge.get("geometry", [])
        if full_geometry and geom and full_geometry[-1] == geom[0]:
            full_geometry.extend(geom[1:])
        else:
            full_geometry.extend(geom)

        segment_details.append({
            "road_id": edge["road_id"],
            "road_name": edge["road_name"],
            "road_type": edge["road_type"],
            "length_km": round(length_km, 2),
            "predicted_speed_kmh": round(speed_kmh, 1),
            "travel_time_min": round(travel_time_min, 2),
            "traffic_level": t_level,
            "geometry": geom,
            "has_incident": edge.get("has_incident", False),
            "incident_description": edge.get("incident_description")
        })

    # Overall route congestion level
    if traffic_level_counts.get("SEVERE", 0) > 0:
        overall_level = "SEVERE"
    elif traffic_level_counts.get("HIGH", 0) > 0:
        overall_level = "HIGH"
    elif traffic_level_counts.get("MEDIUM", 0) >= max(1, len(path_edges) // 2):
        overall_level = "MEDIUM"
    else:
        overall_level = "LOW"

    # Coordinates of nodes along path
    node_coords = []
    for nid in path_nodes:
        n = graph.get_node(nid)
        if n:
            node_coords.append({"node_id": nid, "name": n["name"], "lat": n["lat"], "lng": n["lng"]})

    return {
        "algorithm": algorithm,
        "total_distance_km": round(total_dist, 2),
        "total_travel_time_min": round(total_time, 1),
        "free_flow_travel_time_min": round(free_flow_time, 1),
        "time_saved_min": 0.0, # Populated by route comparison
        "overall_traffic_level": overall_level,
        "segments": segment_details,
        "path_nodes": path_nodes,
        "geometry": full_geometry,
        "node_coordinates": node_coords
    }

def find_primary_and_alternative_routes(
    graph: RoadNetworkGraph,
    start_node: str,
    dest_node: str,
    preferred_algo: str = "A*"
) -> Dict[str, Any]:
    """
    Calculates the fastest primary route and up to two distinct alternative routes.
    """
    primary = run_pathfinding(graph, start_node, dest_node, algorithm=preferred_algo)
    if not primary:
        return {"primary": None, "alternatives": []}

    used_edges = {seg["road_id"] for seg in primary["segments"]}
    
    # Alternative 1: Penalize primary edges by 1.7x to find a viable distinct route
    penalties_alt1 = {rid: 1.75 for rid in used_edges}
    alt1 = run_pathfinding(graph, start_node, dest_node, algorithm="A*", edge_penalties=penalties_alt1)

    alternatives = []
    if alt1 and alt1["path_nodes"] != primary["path_nodes"]:
        alternatives.append(alt1)

    # Alternative 2: Penalize both primary and alt1 edges
    all_used = set(used_edges)
    if alt1:
        all_used.update({seg["road_id"] for seg in alt1["segments"]})
    penalties_alt2 = {rid: 2.5 for rid in all_used}
    alt2 = run_pathfinding(graph, start_node, dest_node, algorithm="Dijkstra", edge_penalties=penalties_alt2)

    if alt2 and alt2["path_nodes"] != primary["path_nodes"]:
        # Only add if distinct from alt1 as well
        if not alternatives or alt2["path_nodes"] != alternatives[0]["path_nodes"]:
            alternatives.append(alt2)

    # Calculate time saved against the slowest alternative
    if alternatives:
        slowest_time = max(a["total_travel_time_min"] for a in alternatives)
        time_saved = max(0.0, round(slowest_time - primary["total_travel_time_min"], 1))
        primary["time_saved_min"] = time_saved

    return {
        "primary": primary,
        "alternatives": alternatives
    }
