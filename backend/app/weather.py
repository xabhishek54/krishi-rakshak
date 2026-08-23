import httpx
from typing import Dict, List, Optional
from datetime import datetime, date

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
            "current": "temperature_2m,relative_humidity_2m,rain",
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
                "humidity": float(current.get("relative_humidity_2m", 0.0))
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
