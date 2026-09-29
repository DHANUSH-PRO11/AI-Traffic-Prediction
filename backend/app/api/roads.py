from typing import List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.models import RoadSegment
from app.services.traffic_service import traffic_service

router = APIRouter(prefix="/roads", tags=["Road Network"])

@router.get("/")
def get_all_roads():
    """
    Returns all road segments with current dynamic travel time and speed attributes.
    """
    segments = []
    for road_id, edge in traffic_service.graph.edges_by_id.items():
        segments.append({
            "road_id": road_id,
            "road_name": edge["road_name"],
            "road_type": edge["road_type"],
            "length_km": edge["length"],
            "max_speed_kmh": edge["max_speed"],
            "predicted_speed_kmh": round(edge.get("predicted_speed", 0.0), 1),
            "predicted_travel_time_min": round(edge.get("predicted_travel_time", 0.0), 2),
            "traffic_level": edge.get("traffic_level", "LOW"),
            "has_incident": edge.get("has_incident", False),
            "start_node": edge["start_node"],
            "end_node": edge["end_node"],
            "geometry": edge.get("geometry", [])
        })
    return segments

@router.get("/nodes")
def get_network_nodes():
    """
    Returns all navigable road network nodes with coordinates.
    """
    return list(traffic_service.nodes_dict.values())

@router.get("/{road_id}")
def get_road_by_id(road_id: str):
    seg = traffic_service.segments_dict.get(road_id)
    if not seg:
        raise HTTPException(status_code=404, detail=f"Road segment '{road_id}' not found.")
    edge = traffic_service.graph.edges_by_id.get(road_id, {})
    return {
        **seg,
        "predicted_speed": round(edge.get("predicted_speed", 0.0), 1),
        "predicted_travel_time": round(edge.get("predicted_travel_time", 0.0), 2),
        "traffic_level": edge.get("traffic_level", "LOW"),
        "has_incident": edge.get("has_incident", False)
    }
