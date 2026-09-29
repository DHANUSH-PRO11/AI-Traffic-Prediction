from fastapi import APIRouter
from pydantic import BaseModel
from app.services.traffic_service import traffic_service
import datetime

router = APIRouter(prefix="/weather", tags=["Weather"])

class WeatherUpdateRequest(BaseModel):
    condition: str
    temperature: float
    rainfall: float
    humidity: float
    wind_speed: float

@router.get("/")
def get_current_weather():
    return traffic_service.current_weather

@router.post("/update")
def update_weather(req: WeatherUpdateRequest):
    traffic_service.current_weather = {
        "condition": req.condition,
        "temperature": req.temperature,
        "rainfall": req.rainfall,
        "humidity": req.humidity,
        "wind_speed": req.wind_speed,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
    traffic_service.update_all_predictions()
    return {"status": "success", "weather": traffic_service.current_weather}
