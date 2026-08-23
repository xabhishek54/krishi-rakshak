"""
Training script for Intervention Recommendation ML Model
Creates a simple RandomForestClassifier for action ranking
"""
import numpy as np
import pickle
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import os

def create_synthetic_training_data():
    """
    Create synthetic training data for intervention ranking
    Features: [crop_type_encoded, rainfall_deviation, temp_deviation, 
               price_drop, income_ratio, crop_loss, loan_due_days]
    Labels: action_type_encoded
    """
    np.random.seed(42)
    
    # Define action types
    action_types = [
        "irrigation_advisory",
        "crop_insurance_check", 
        "alternate_mandi",
        "contact_support",
        "scheme_eligibility",
        "drainage_check",
        "pest_prevention",
        "loan_rescheduling"
    ]
    
    # Define crop types
    crop_types = ["tomato", "wheat", "onion", "potato", "maize"]
    
    # Generate synthetic data
    n_samples = 1000
    
    X = []
    y = []
    
    for _ in range(n_samples):
        # Random feature values
        crop_type = np.random.choice(crop_types)
        rainfall_deviation = np.random.uniform(-80, 80)  # %
        temp_deviation = np.random.uniform(-10, 10)      # °C
        price_drop = np.random.uniform(0, 50)            # % price drop
        income_ratio = np.random.uniform(0.2, 2.0)       # income/obligation ratio
        crop_loss = np.random.uniform(0, 60)             # % expected loss
        loan_due_days = np.random.randint(1, 90)         # days until loan due
        
        # Encode crop type
        crop_map = {"tomato": 0, "wheat": 1, "onion": 2, "potato": 3, "maize": 4}
        crop_encoded = crop_map[crop_type]
        
        features = [crop_encoded, rainfall_deviation, temp_deviation, 
                   price_drop, income_ratio, crop_loss, loan_due_days]
        
        # Determine appropriate action based on heuristics (for training labels)
        action_scores = {}
        
        # Weather stress -> irrigation/drainage
        if rainfall_deviation < -30 or temp_deviation > 5:
            action_scores["irrigation_advisory"] = action_scores.get("irrigation_advisory", 0) + 2
            action_scores["drainage_check"] = action_scores.get("drainage_check", 0) + 1
        
        # Yield loss -> insurance/pest prevention
        if crop_loss > 20:
            action_scores["crop_insurance_check"] = action_scores.get("crop_insurance_check", 0) + 2
            action_scores["pest_prevention"] = action_scores.get("pest_prevention", 0) + 1
            
        # Market stress -> alternate mandi/schemes
        if price_drop > 20:
            action_scores["alternate_mandi"] = action_scores.get("alternate_mandi", 0) + 2
            action_scores["scheme_eligibility"] = action_scores.get("scheme_eligibility", 0) + 1
            
        # Financial stress -> loan/scheme support
        if income_ratio < 0.8:
            action_scores["loan_rescheduling"] = action_scores.get("loan_rescheduling", 0) + 2
            action_scores["scheme_eligibility"] = action_scores.get("scheme_eligibility", 0) + 1
            
        # Urgency -> contact support
        if loan_due_days < 15:
            action_scores["contact_support"] = action_scores.get("contact_support", 0) + 2
            
        # Default actions if nothing strong
        if not action_scores:
            action_scores["scheme_eligibility"] = 1
            action_scores["crop_insurance_check"] = 1
        
        # Select action with highest score
        selected_action = max(action_scores, key=action_scores.get)
        
        # Encode action
        action_encoded = action_types.index(selected_action)
        
        X.append(features)
        y.append(action_encoded)
    
    return np.array(X), np.array(y), action_types

def train_and_save_model():
    """Train the intervention ranking model and save it"""
    print("Creating synthetic training data...")
    X, y, action_types = create_synthetic_training_data()
    
    print(f"Training data shape: {X.shape}")
    print(f"Action types: {action_types}")
    
    # Train Random Forest Classifier
    print("Training RandomForestClassifier...")
    model = RandomForestClassifier(
        n_estimators=50,
        max_depth=10,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X, y)
    
    # Evaluate on training data (in practice we'd use train/test split)
    train_score = model.score(X, y)
    print(f"Training accuracy: {train_score:.3f}")
    
    # Feature importances
    if hasattr(model, 'feature_importances_'):
        feature_names = [
            'crop_type', 'rainfall_deviation', 'temp_deviation',
            'price_drop', 'income_ratio', 'crop_loss', 'loan_due_days'
        ]
        print("Feature importances:")
        for name, importance in zip(feature_names, model.feature_importances_):
            print(f"  {name}: {importance:.3f}")
    
    # Save model
    model_path = os.path.join(os.path.dirname(__file__), "intervention_model.pkl")
    print(f"Saving model to {model_path}")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    
    print("Model training complete!")
    return model

if __name__ == "__main__":
    train_and_save_model()