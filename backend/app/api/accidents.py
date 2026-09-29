from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.traffic_service import traffic_service

router = APIRouter(prefix="/accidents", tags=["Accidents & Incidents"])

class AccidentCreateRequest(BaseModel):
    road_id: str
    severity: Optional[str] = "HIGH"
    description: Optional[str] = "Vehicle collision causing lane closure"

@router.get("/")
def get_active_accidents():
    return list(traffic_service.active_incidents.values())

@router.post("/")
def report_or_simulate_accident(req: AccidentCreateRequest):
    res = traffic_service.simulate_incident(
        road_id=req.road_id,
        severity=req.severity or "HIGH",
        description=req.description or "Accident reported"
    )
    if not res.get("success"):
        raise HTTPException(status_code=404, detail=res.get("message"))
    return res

@router.delete("/{road_id}")
def resolve_accident(road_id: str):
    success = traffic_service.clear_incident(road_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"No active accident found on road {road_id}")
    return {"status": "success", "message": f"Incident on {road_id} resolved."}

@router.delete("/clear/all")
def clear_all_accidents():
    traffic_service.clear_all_incidents()
    return {"status": "success", "message": "All active incidents cleared."}
