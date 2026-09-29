import os
import sys
import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body, Request
from app.schemas.schemas import RouteRequest, PredictRequest, OsmndDownloadRequest

# Add sat_engine directory to sys.path so modules can be imported directly
SAT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../sat_engine"))
if SAT_DIR not in sys.path:
    sys.path.insert(0, SAT_DIR)

from app.sat_engine.dijkstra import find_best_route
from app.sat_engine.predict import predict_traffic, predict_traffic_details
from app.sat_engine.weather import get_weather
from app.sat_engine.graph_loader import geocode_location, get_graph
from app.sat_engine.database import save_history, save_prediction, get_history, clear_history
from app.sat_engine.osmnx_manager import (
    get_osmnx_features,
    get_osmnx_datasets_summary,
    get_osmnx_graph,
)

router = APIRouter(tags=["Smart Traffic Finder (sat)"])


# ── Route endpoints ───────────────────────────────────────────────────────────

@router.post("/route")
def route_endpoint(req: RouteRequest):
    """
    Find best route between two locations/cities using OSRM + traffic Dijkstra.
    Returns: distance_km, travel_time_min, traffic, weather, coordinates, road_type, vehicle_times, hourly_forecast, routes
    """
    source = (req.source or "").strip()
    destination = (req.destination or "").strip()
    vehicle_type = (req.vehicle_type or "car").strip()

    if not source or not destination:
        raise HTTPException(status_code=400, detail="source and destination are required")

    try:
        result_data = find_best_route(source, destination, vehicle_type)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Routing failed: {exc}")

    # Persist to history
    save_history(
        source=result_data["source"],
        destination=result_data["destination"],
        prediction=result_data["traffic"],
        distance_km=result_data["distance_km"],
        travel_time_min=result_data["travel_time_min"],
    )

    return result_data


# ── Predict endpoints ─────────────────────────────────────────────────────────

@router.post("/predict")
def predict_endpoint(req: PredictRequest):
    """Predict traffic level for raw features."""
    now = datetime.datetime.now()
    features = {
        "hour": req.hour if req.hour is not None else now.hour,
        "day": req.day if req.day is not None else now.weekday(),
        "festival": req.festival if req.festival is not None else 0,
        "rainfall": req.rainfall if req.rainfall is not None else 0.0,
        "temperature": req.temperature if req.temperature is not None else 30.0,
        "road_type": req.road_type or "highway",
        "vehicle_count": req.vehicle_count if req.vehicle_count is not None else 180,
    }

    traffic = predict_traffic(features)
    save_prediction(features, traffic)

    return {"traffic": traffic, "features": features}


@router.post("/predict-live")
def predict_live_endpoint(req: PredictRequest):
    """
    Interactive ML prediction tool returning full class probability breakdown,
    confidence score, and traffic multiplier.
    """
    now = datetime.datetime.now()
    features = {
        "hour": req.hour if req.hour is not None else now.hour,
        "day": req.day if req.day is not None else now.weekday(),
        "festival": req.festival if req.festival is not None else 0,
        "rainfall": req.rainfall if req.rainfall is not None else 0.0,
        "temperature": req.temperature if req.temperature is not None else 30.0,
        "road_type": req.road_type or "highway",
        "vehicle_count": req.vehicle_count if req.vehicle_count is not None else 180,
    }

    details = predict_traffic_details(features)
    save_prediction(features, details["traffic"])

    return {
        "status": "success",
        "features": features,
        "prediction": details["traffic"],
        "confidence": details["confidence"],
        "multiplier": details["multiplier"],
        "probabilities": details["probabilities"]
    }


# ── Search History ────────────────────────────────────────────────────────────

@router.get("/history")
def get_history_endpoint(limit: int = 100):
    limit = min(limit, 200)
    records = get_history(limit)
    return {"history": records, "count": len(records)}


@router.delete("/history")
def delete_history_endpoint():
    deleted_count = clear_history()
    return {"status": "success", "message": "Search history cleared", "deleted": deleted_count}


# ── Analytics ─────────────────────────────────────────────────────────────────

@router.get("/analytics")
def analytics_endpoint():
    """Return model evaluation metrics, dataset statistics, and feature importances."""
    import json
    meta_path = os.path.join(SAT_DIR, "models", "model_metadata.json")
    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
            return meta
        except Exception:
            pass

    return {
        "accuracy": 0.9733,
        "total_samples": 3000,
        "feature_importances": {
            "vehicle_count": 0.5736,
            "hour": 0.1714,
            "road_type": 0.0701,
            "festival": 0.0659,
            "day": 0.0508,
            "rainfall": 0.0373,
            "temperature": 0.0309
        },
        "class_distribution": {"Medium": 1149, "Heavy": 1120, "Low": 547, "Very Heavy": 184}
    }


# ── Weather ───────────────────────────────────────────────────────────────────

@router.get("/weather")
def weather_endpoint(place: Optional[str] = None, lat: Optional[float] = None, lon: Optional[float] = None):
    try:
        if lat is not None and lon is not None:
            data = get_weather(lat, lon)
        elif place:
            lat_f, lon_f = geocode_location(place)
            data = get_weather(lat_f, lon_f)
        else:
            # Default to Tamil Nadu central coordinates
            data = get_weather(11.1271, 78.6569)
        return data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ── OSMnx Datasets & Features ─────────────────────────────────────────────────

@router.get("/api/osmnx/datasets")
def osmnx_datasets_summary_endpoint():
    try:
        summary = get_osmnx_datasets_summary()
        return summary
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to get OSMnx datasets summary: {exc}")


@router.get("/api/osmnx/features")
def osmnx_features_endpoint(type: str = "traffic_signals", place: str = "Tamil Nadu, India"):
    try:
        features = get_osmnx_features(place=place, feature_type=type)
        return {
            "status": "success",
            "type": type,
            "place": place,
            "count": len(features),
            "features": features
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch OSMnx features: {exc}")


@router.post("/api/osmnx/download")
def osmnx_download_endpoint(body: OsmndDownloadRequest):
    try:
        place = body.place or "Tamil Nadu, India"
        feature_type = body.feature_type or "traffic_signals"
        network_type = body.network_type or "drive"
        features = get_osmnx_features(place=place, feature_type=feature_type, fetch_live=True)
        graph = get_osmnx_graph(place=place, network_type=network_type)
        return {
            "status": "success",
            "message": f"Successfully fetched OSMnx dataset for '{place}'",
            "place": place,
            "feature_type": feature_type,
            "network_type": network_type,
            "features_count": len(features),
            "graph_nodes": len(graph.nodes),
            "graph_edges": len(graph.edges)
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OSMnx fetch failed: {exc}")
