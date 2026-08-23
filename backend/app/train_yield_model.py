import os
import pickle
import numpy as np
from sklearn.ensemble import RandomForestRegressor

def train_and_save_model():
    print("Generating synthetic crop yield dataset...")
    np.random.seed(42)
    n_samples = 2000
    
    # Features:
    # 0: crop_type (0=tomato, 1=wheat, 2=onion)
    # 1: soil_type (0=loam, 1=clay, 2=sandy, 3=black)
    # 2: irrigation_type (0=drip, 1=sprinkler, 2=flood, 3=rainfed)
    # 3: rainfall_deviation (-100% to +100%)
    # 4: temp_deviation (-10C to +10C)
    
    crops = np.random.randint(0, 3, n_samples)
    soils = np.random.randint(0, 4, n_samples)
    irrigations = np.random.randint(0, 4, n_samples)
    rain_dev = np.random.uniform(-80.0, 80.0, n_samples)
    temp_dev = np.random.uniform(-6.0, 6.0, n_samples)
    
    # Target: yield_deviation (percentage from -60% to +10%)
    # Base yield deviation starts at 0%
    yield_dev = np.zeros(n_samples)
    
    for i in range(n_samples):
        dev = 0.0
        # Heavy rain deficit always drops yield, especially for rainfed
        if rain_dev[i] < -20:
            deficit_multiplier = 0.5 if irrigations[i] == 3 else 0.2
            dev += rain_dev[i] * deficit_multiplier
        # Too much rainfall waterlogs tomato/onion
        elif rain_dev[i] > 30:
            if crops[i] in [0, 2]: # Tomato/Onion
                dev -= (rain_dev[i] - 30) * 0.4
                
        # Heat wave drops yield
        if temp_dev[i] > 3.0:
            dev -= (temp_dev[i] - 3.0) * 4.0
            
        # Sandy soil reduces yield under deficit
        if soils[i] == 2 and rain_dev[i] < 0:
            dev -= 5.0
            
        # Drip irrigation cushions against dry deficit
        if irrigations[i] == 0 and rain_dev[i] < 0:
            dev += abs(rain_dev[i]) * 0.1
            
        # Add random noise
        dev += np.random.normal(0, 3.0)
        # Cap yield deviation between -70% and +15%
        yield_dev[i] = np.clip(dev, -70.0, 15.0)
        
    X = np.column_stack((crops, soils, irrigations, rain_dev, temp_dev))
    y = yield_dev
    
    print("Training RandomForestRegressor model...")
    model = RandomForestRegressor(n_estimators=50, random_state=42)
    model.fit(X, y)
    
    model_path = os.path.join(os.path.dirname(__file__), "yield_model.pkl")
    print(f"Saving trained model to {model_path}...")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
        
    print("Model trained and serialized successfully!")

if __name__ == "__main__":
    train_and_save_model()
