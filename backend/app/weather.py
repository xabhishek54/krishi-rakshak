import httpx
from typing import Dict, List, Optional
from datetime import datetime, date

DISTRICT_COORDS: Dict[str, tuple] = {
    "nashik": (20.0059, 73.7898),
    "niphad": (20.08, 74.11),
    "pimpalgaon": (20.1234, 74.0987),
    "jalgaon": (21.0077, 75.5626),
    "nagpur": (21.1458, 79.0882),
    "pune": (18.5204, 73.8567),
    "mumbai": (19.0760, 72.8777),
    "delhi": (28.6139, 77.2090),
    "bengaluru": (12.9716, 77.5946),
    "hyderabad": (17.3850, 78.4867),
    "kolkata": (22.5726, 88.3639),
    "ahmedabad": (23.0225, 72.5714),
    "jaipur": (26.9124, 75.7873),
    "lucknow": (26.8467, 80.9462),
    "patna": (25.5941, 85.1376),
    "bhubaneswar": (20.2961, 85.8245),
}

def resolve_coords(location_id: str, farm_lat: Optional[float] = None, farm_lon: Optional[float] = None) -> tuple:
    if farm_lat is not None and farm_lon is not None:
        return farm_lat, farm_lon
    
    if "," in location_id:
        try:
            parts = location_id.split(",")
            return float(parts[0]), float(parts[1])
        except ValueError:
            pass
            
    loc_lower = location_id.lower()
    for name, coords in DISTRICT_COORDS.items():
        if name in loc_lower:
            return coords
            
    return (20.0059, 73.7898)

class WeatherProvider:
    async def fetch_weather(self, lat: float, lon: float) -> Optional[Dict]:
        """
        Fetch current and forecast weather data for given coordinates.
        Returns:
            Dict containing:
              - 'observation': { 'rainfall': float, 'temperature': float, 'humidity': float }
              - 'forecast': List of { 'date': date, 'rainfall_forecast': float, 'temperature': float, 'rain_probability': float }
        """
        raise NotImplementedError

class OpenMeteoProvider(WeatherProvider):
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=15.0)

    async def fetch_weather(self, lat: float, lon: float) -> Optional[Dict]:
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,rain,wind_speed_10m",
            "daily": "temperature_2m_max,temperature_2m_min,rain_sum,precipitation_probability_max",
            "timezone": "auto"
        }
        try:
            response = await self.client.get(url, params=params)
            if response.status_code != 200:
                return None
            
            data = response.json()
            current = data.get("current", {})
            daily = data.get("daily", {})
            
            # Map current observation
            observation = {
                "rainfall": float(current.get("rain", 0.0)),
                "temperature": float(current.get("temperature_2m", 0.0)),
                "humidity": float(current.get("relative_humidity_2m", 0.0)),
                "wind_speed": float(current.get("wind_speed_10m", 12.0))
            }
            
            # Map daily forecasts (up to 7 days)
            forecast = []
            dates = daily.get("time", [])
            rain_sums = daily.get("rain_sum", [])
            temp_maxes = daily.get("temperature_2m_max", [])
            temp_mines = daily.get("temperature_2m_min", [])
            probs = daily.get("precipitation_probability_max", [])
            
            for i in range(len(dates)):
                d_str = dates[i]
                d = datetime.strptime(d_str, "%Y-%m-%d").date()
                
                # average temperature
                t_max = temp_maxes[i] if temp_maxes[i] is not None else 0.0
                t_min = temp_mines[i] if temp_mines[i] is not None else 0.0
                avg_temp = (t_max + t_min) / 2.0
                
                forecast.append({
                    "date": d,
                    "rainfall_forecast": float(rain_sums[i]) if rain_sums[i] is not None else 0.0,
                    "temperature": avg_temp,
                    "rain_probability": float(probs[i]) if probs[i] is not None else 0.0
                })
                
            return {
                "observation": observation,
                "forecast": forecast
            }
        except Exception as e:
            # Degrade gracefully by returning None on API errors, allowing caller to fallback to mock or cache
            print(f"Error fetching weather from Open-Meteo: {e}")
            return None
