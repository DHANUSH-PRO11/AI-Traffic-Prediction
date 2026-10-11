import datetime
from fastapi import APIRouter
from app.services.traffic_service import traffic_service
from app.schemas.schemas import WeatherUpdateRequest

router = APIRouter(prefix="/weather", tags=["Weather"])


@router.get("/")
def get_current_weather():
    return traffic_service.current_weather


@router.post("/update")
def update_weather(req: WeatherUpdateRequest):
    humidity_val: float = float(req.humidity) if req.humidity is not None else 65.0
    wind_speed_val: float = float(req.wind_speed) if req.wind_speed is not None else 12.0

    traffic_service.current_weather = {
        "condition": req.condition,
        "temperature": float(req.temperature),
        "rainfall": float(req.rainfall),
        "humidity": humidity_val,
        "wind_speed": wind_speed_val,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    traffic_service.update_all_predictions()
    return {"status": "success", "weather": traffic_service.current_weather}
