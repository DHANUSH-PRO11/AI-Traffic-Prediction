import datetime
from fastapi import APIRouter, HTTPException
from app.services.traffic_service import traffic_service
from app.schemas.schemas import RouteCalculationRequest, DynamicRerouteResponse, RoutePathResult

router = APIRouter(prefix="/routes", tags=["Routing Engine"])

@router.post("/calculate", response_model=DynamicRerouteResponse)
def calculate_optimal_route(req: RouteCalculationRequest):
    """
    Computes the fastest route using A* or Dijkstra where edge weights equal predicted travel time.
    Also returns up to two viable alternative routes and estimated time saved.
    """
    if req.source_node not in traffic_service.nodes_dict:
        raise HTTPException(status_code=400, detail=f"Source node '{req.source_node}' not recognized.")
    if req.destination_node not in traffic_service.nodes_dict:
        raise HTTPException(status_code=400, detail=f"Destination node '{req.destination_node}' not recognized.")
    if req.source_node == req.destination_node:
        raise HTTPException(status_code=400, detail="Source and destination cannot be identical.")

    # Update weather if provided
    if req.weather_condition:
        traffic_service.current_weather["condition"] = req.weather_condition
    if req.temperature:
        traffic_service.current_weather["temperature"] = req.temperature
    if req.rainfall:
        traffic_service.current_weather["rainfall"] = req.rainfall

    algo = req.algorithm if req.algorithm in ["A*", "Dijkstra"] else "A*"
    route_data = traffic_service.calculate_route(
        source_node=req.source_node,
        dest_node=req.destination_node,
        algorithm=algo,
        departure_time=req.departure_time or datetime.datetime.now()
    )

    primary = route_data["primary"]
    if not primary:
        raise HTTPException(status_code=404, detail="No viable path found between source and destination.")

    alternatives = route_data["alternatives"]

    # Check if primary or alternatives intersect any incident
    incident_alert = None
    has_incident_on_primary = any(seg.get("has_incident") for seg in primary["segments"])
    if has_incident_on_primary:
        incident_names = [seg["road_name"] for seg in primary["segments"] if seg.get("has_incident")]
        incident_alert = f"Incident reported along {', '.join(incident_names)}. Route dynamically adjusted."

    return DynamicRerouteResponse(
        status="success",
        message="Route calculated successfully.",
        rerouted=has_incident_on_primary,
        recommended_route=primary,
        alternative_routes=alternatives,
        incident_alert=incident_alert,
        time_difference_min=primary.get("time_saved_min", 0.0)
    )

@router.post("/alternative")
def calculate_alternative_routes(req: RouteCalculationRequest):
    return calculate_optimal_route(req)
