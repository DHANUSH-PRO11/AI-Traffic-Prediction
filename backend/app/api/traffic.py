import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.services.traffic_service import traffic_service
from app.ml.predictor import predictor
from app.schemas.schemas import PredictionInteractiveRequest, SegmentPredictionOutput

router = APIRouter(prefix="/traffic", tags=["Traffic & Predictions"])

@router.get("/current")
def get_current_traffic():
    """
    Returns live system-wide traffic conditions, average speed, congestion distribution,
    road segments with geo-coordinates, and active incidents.
    """
    return traffic_service.get_network_overview()

@router.get("/history")
def get_traffic_history():
    """
    Returns 24-hour historical traffic volume and speed trends for charts.
    """
    now = datetime.datetime.now()
    hourly_data = []
    
    # Generate 24-hour cyclical traffic pattern
    for h in range(24):
        # Rush hours
        is_rush = (7 <= h <= 9) or (16 <= h <= 19)
        base_vol = 3200 if is_rush else (1100 if h < 6 else 2200)
        base_spd = 32.5 if is_rush else (68.0 if h < 6 else 48.0)
        hourly_data.append({
            "hour": f"{h:02d}:00",
            "hour_int": h,
            "actual_volume": base_vol,
            "predicted_volume": int(base_vol * 1.03),
            "average_speed": base_spd,
            "congestion_index": round(1.0 - (base_spd / 85.0), 2)
        })

    return {
        "status": "success",
        "current_hour": now.hour,
        "trends": hourly_data
    }

@router.post("/predict", response_model=SegmentPredictionOutput)
def predict_segment_traffic(req: PredictionInteractiveRequest):
    """
    Runs ML model inference on a specific road segment with custom weather, date, time, and incident state.
    """
    seg = traffic_service.segments_dict.get(req.road_id)
    if not seg:
        raise HTTPException(status_code=404, detail=f"Road segment '{req.road_id}' not found.")

    dep_time = datetime.datetime.now()
    if req.time_str:
        try:
            parts = req.time_str.split(":")
            dep_time = dep_time.replace(hour=int(parts[0]), minute=int(parts[1]))
        except Exception:
            pass

    pred = predictor.predict_segment(
        road_id=req.road_id,
        road_type=seg["road_type"],
        road_length=seg["length"],
        max_speed=seg["max_speed"],
        departure_time=dep_time,
        weather=req.weather or "Clear",
        temperature=req.temperature or 22.0,
        rainfall=req.rainfall or 0.0,
        has_accident=bool(req.accident_reported)
    )

    return SegmentPredictionOutput(
        road_id=req.road_id,
        road_name=seg["road_name"],
        road_type=seg["road_type"],
        length_km=seg["length"],
        speed_limit_kmh=seg["max_speed"],
        predicted_speed_kmh=pred["predicted_speed_kmh"],
        predicted_travel_time_min=pred["predicted_travel_time_min"],
        predicted_volume_vph=pred["predicted_volume_vph"],
        traffic_level=pred["traffic_level"],
        confidence_score=pred["confidence_score"],
        model_version=pred["model_version"],
        timestamp=dep_time
    )
