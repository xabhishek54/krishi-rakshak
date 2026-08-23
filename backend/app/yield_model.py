import os
import pickle
import numpy as np

# Load trained RandomForestRegressor model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "yield_model.pkl")

model = None
if os.path.exists(MODEL_PATH):
    try:
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
    except Exception as e:
        print("Failed to load yield_model.pkl:", e)

def predict_yield_deviation(
    crop_type: str,
    soil_type: str,
    irrigation_type: str,
    rainfall_deviation: float, # e.g. -30.0 for 30% deficit
    temp_deviation: float       # temperature deviation from normal in Celsius
) -> float:
    """
    Predict yield deviation percentage from baseline (e.g. returns -18.5 for 18.5% yield drop).
    """
    if model is None:
        # Simple rule-based fallback if model load failed
        dev = 0.0
        if rainfall_deviation < -20:
            dev += rainfall_deviation * (0.4 if irrigation_type == "rainfed" else 0.15)
        return round(dev, 2)
        
    # 1. Encode categorical inputs to indices
    crop_map = {"tomato": 0, "wheat": 1, "onion": 2}
    soil_map = {"loam": 0, "clay": 1, "sandy": 2, "black": 3}
    irr_map = {"drip": 0, "sprinkler": 1, "flood": 2, "rainfed": 3}
    
    c_idx = crop_map.get(crop_type.lower(), 0)
    s_idx = soil_map.get(soil_type.lower(), 0)
    i_idx = irr_map.get(irrigation_type.lower(), 0)
    
    # 2. Reshape features
    features = np.array([[c_idx, s_idx, i_idx, rainfall_deviation, temp_deviation]], dtype=float)
    
    # 3. Predict yield deviation
    pred = model.predict(features)[0]
    return round(float(pred), 2)
