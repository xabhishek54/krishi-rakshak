"""
AI Intervention Recommendation Engine
Implements the three-stage hybrid system:
1. Rule Engine → candidate actions
2. ML Ranking Model → ranks by relevance  
3. LLM → phrases top actions in plain language
"""
import json
import os
import pickle
from typing import List, Dict, Any, Tuple
from datetime import date
import numpy as np

from sqlalchemy.orm import Session
from . import models
from .yield_model import predict_yield_deviation

# Load trained RandomForestClassifier model for intervention ranking
MODEL_PATH = os.path.join(os.path.dirname(__file__), "intervention_model.pkl")

model = None
if os.path.exists(MODEL_PATH):
    try:
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
    except Exception as e:
        print(f"Failed to load intervention_model.pkl: {e}")

# Define action types and their descriptions
ACTION_TYPES = {
    "irrigation_advisory": {
        "name": "Irrigation Advisory",
        "description": "Adjust irrigation based on weather conditions",
        "icon": "💧"
    },
    "crop_insurance_check": {
        "name": "Crop Insurance Check",
        "description": "Check eligibility for crop insurance schemes",
        "icon": "📋"
    },
    "alternate_mandi": {
        "name": "Alternate Mandi Suggestion",
        "description": "Consider selling at different markets for better prices",
        "icon": "🚚"
    },
    "contact_support": {
        "name": "Contact Support Helpline",
        "description": "Reach out to agricultural support services",
        "icon": "📞"
    },
    "scheme_eligibility": {
        "name": "Government Scheme Check",
        "description": "Check eligibility for government support programs",
        "icon": "🏛️"
    },
    "drainage_check": {
        "name": "Field Drainage Check",
        "description": "Inspect and improve field drainage systems",
        "icon": "🌊"
    },
    "pest_prevention": {
        "name": "Pest Prevention Measures",
        "description": "Apply preventive pest control measures",
        "icon": "🐛"
    },
    "loan_rescheduling": {
        "name": "Loan Rescheduling",
        "description": "Discuss loan rescheduling options with lender",
        "icon": "💰"
    }
}

def load_rules() -> Dict[str, Any]:
    """Load intervention rules from rules.json"""
    RULES_PATH = os.path.join(os.path.dirname(__file__), "rules.json")
    try:
        with open(RULES_PATH, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading rules config: {e}")
        return {"intervention_rules": []}

def map_distress_to_actions(distress_score: models.DistressScore) -> List[Dict[str, Any]]:
    """
    Stage 1: Rule Engine - Map distress components to candidate actions
    Returns list of candidate actions with rule-based reasoning
    """
    rules_config = load_rules()
    candidate_actions = []
    
    # Extract distress components
    weather_comp = distress_score.weather_component
    yield_comp = distress_score.yield_component
    market_comp = distress_score.market_component
    financial_comp = distress_score.financial_component
    urgency_comp = distress_score.urgency_component
    
    # Process intervention rules from JSON
    intervention_rules = rules_config.get("intervention_rules", [])
    
    for rule in intervention_rules:
        actions = rule.get("actions", [])
        
        for action_def in actions:
            # Check if this action should be triggered based on component thresholds
            should_trigger = True
            
            # Check weather component condition
            weather_min = action_def.get("weather_component_min")
            if weather_min is not None and weather_comp < weather_min:
                should_trigger = False
                
            # Check yield component condition
            yield_min = action_def.get("yield_component_min")
            if yield_min is not None and yield_comp < yield_min:
                should_trigger = False
                
            # Check market component condition
            market_min = action_def.get("market_component_min")
            if market_min is not None and market_comp < market_min:
                should_trigger = False
                
            # Check financial component condition
            financial_min = action_def.get("financial_component_min")
            if financial_min is not None and financial_comp < financial_min:
                should_trigger = False
                
            # Check urgency component condition
            urgency_min = action_def.get("urgency_component_min")
            if urgency_min is not None and urgency_comp < urgency_min:
                should_trigger = False
            
            if should_trigger:
                # Calculate base confidence based on how much the component exceeds the threshold
                base_confidence = 0.5  # Base confidence
                
                # Boost confidence based on which component is most relevant
                relevant_component = 0
                component_name = ""
                
                if "weather_component_min" in action_def and weather_comp >= action_def["weather_component_min"]:
                    relevant_component = max(relevant_component, weather_comp - action_def["weather_component_min"])
                    component_name = "weather"
                if "yield_component_min" in action_def and yield_comp >= action_def["yield_component_min"]:
                    relevant_component = max(relevant_component, yield_comp - action_def["yield_component_min"])
                    component_name = "yield"
                if "market_component_min" in action_def and market_comp >= action_def["market_component_min"]:
                    relevant_component = max(relevant_component, market_comp - action_def["market_component_min"])
                    component_name = "market"
                if "financial_component_min" in action_def and financial_comp >= action_def["financial_component_min"]:
                    relevant_component = max(relevant_component, financial_comp - action_def["financial_component_min"])
                    component_name = "financial"
                if "urgency_component_min" in action_def and urgency_comp >= action_def["urgency_component_min"]:
                    relevant_component = max(relevant_component, urgency_comp - action_def["urgency_component_min"])
                    component_name = "urgency"
                
                # Apply confidence weight from rule
                confidence_weight = action_def.get("confidence_weight", 1.0)
                
                # Calculate final confidence (capped at 0.95)
                if component_name == "weather":
                    base_confidence = min(0.95, 0.3 + (relevant_component / 100.0) * 0.4 * confidence_weight)
                elif component_name == "yield":
                    base_confidence = min(0.95, 0.3 + (relevant_component / 100.0) * 0.4 * confidence_weight)
                elif component_name == "market":
                    base_confidence = min(0.95, 0.3 + (relevant_component / 100.0) * 0.4 * confidence_weight)
                elif component_name == "financial":
                    base_confidence = min(0.95, 0.3 + (relevant_component / 100.0) * 0.4 * confidence_weight)
                elif component_name == "urgency":
                    base_confidence = min(0.95, 0.3 + (relevant_component / 100.0) * 0.4 * confidence_weight)
                else:
                    # Default calculation
                    base_confidence = min(0.9, 0.5 + (relevant_component / 100.0) * 0.4)
                
                candidate_actions.append({
                    "action_type": action_def["action_type"],
                    "reason": action_def["reason_template"],
                    "base_confidence": base_confidence
                })
    
    # Deduplicate actions by type, keeping highest confidence
    action_dict = {}
    for action in candidate_actions:
        action_type = action["action_type"]
        if action_type not in action_dict or action["base_confidence"] > action_dict[action_type]["base_confidence"]:
            action_dict[action_type] = action
    
    return list(action_dict.values())

def rank_actions_with_ml(candidate_actions: List[Dict[str, Any]], 
                        farmer: models.Farmer,
                        distress_score: models.DistressScore) -> List[Dict[str, Any]]:
    """
    Stage 2: ML Ranking - Rank candidate actions by relevance using Random Forest
    Returns actions sorted by ML confidence score
    """
    if not candidate_actions:
        return []
    
    if model is None:
        # Fallback to rule-based ranking if model not available
        for action in candidate_actions:
            action["ml_confidence"] = action["base_confidence"]
        return sorted(candidate_actions, key=lambda x: x["ml_confidence"], reverse=True)
    
    try:
        # Prepare features for the ML model
        # Features: rainfall_deviation, price_drop, income_ratio, crop_loss, loan_due_days, crop_type
        
        # Get farmer's location and farms for weather data
        weather_features = [0.0, 0.0]  # rainfall_deviation, temp_deviation
        if farmer.location_id:
            from .distress import calculate_distress_risk
            # We'll approximate these from the distress score components
            weather_features = [distress_score.weather_component / 2.5, 1.0]  # approximate
        
        # Price drop approximation from market component
        price_drop = min(distress_score.market_component / 3.0, 100.0)  # approximate percentage
        
        # Income ratio approximation from financial component
        income_ratio = max(0.1, 1.0 - (distress_score.financial_component / 150.0))  # inverse of financial stress
        
        # Crop loss approximation from yield component
        crop_loss = min(distress_score.yield_component / 2.0, 100.0)  # approximate percentage
        
        # Loan due days approximation from urgency component
        loan_due_days = max(1, int(60 - (distress_score.urgency_component * 0.4)))  # inverse mapping
        
        # Get primary crop type
        crop_type = "tomato"  # default
        farms = farmer.farms if hasattr(farmer, 'farms') else []
        if farms:
            crops = []
            for farm in farms:
                if hasattr(farm, 'crops'):
                    crops.extend(farm.crops)
            if crops:
                crop_type = crops[0].crop_type.lower()
        
        # Encode categorical inputs
        crop_map = {"tomato": 0, "wheat": 1, "onion": 2, "potato": 3, "maize": 4}
        c_idx = crop_map.get(crop_type, 0)
        
        # Prepare feature vector
        features = np.array([[
            c_idx,
            weather_features[0],  # rainfall_deviation
            weather_features[1],  # temp_deviation
            price_drop,
            income_ratio,
            crop_loss,
            loan_due_days
        ]], dtype=float)
        
        # Get prediction probabilities for each action type
        # Since we don't have a direct mapping, we'll use feature importance to weight our base confidences
        if hasattr(model, 'feature_importances_'):
            # Use feature importance to adjust confidences
            importances = model.feature_importances_
            # Normalize and apply as weights to different aspects of our decision
            # This is a simplified approach - in practice we'd want a proper multi-label classifier
            
            # For now, adjust base confidence based on which features are most important
            # This is a placeholder for proper ML ranking
            for action in candidate_actions:
                action["ml_confidence"] = action["base_confidence"] * (0.7 + 0.3 * np.mean(importances))
        else:
            for action in candidate_actions:
                action["ml_confidence"] = action["base_confidence"]
                
        # Sort by ML confidence
        return sorted(candidate_actions, key=lambda x: x["ml_confidence"], reverse=True)
        
    except Exception as e:
        print(f"Error in ML ranking: {e}")
        # Fallback to rule-based ranking
        for action in candidate_actions:
            action["ml_confidence"] = action["base_confidence"]
        return sorted(candidate_actions, key=lambda x: x["ml_confidence"], reverse=True)

def format_actions_with_llm(ranked_actions: List[Dict[str, Any]], 
                           language: str = "english") -> List[Dict[str, Any]]:
    """
    Stage 3: LLM Phrasing - Convert ranked actions to plain language
    In this implementation, we'll use template-based phrasing since 
    LLM integration would require external API calls
    """
    formatted_actions = []
    
    # Language-specific templates (simplified)
    templates = {
        "english": {
            "irrigation_advisory": "Water levels are {condition}. Consider adjusting your irrigation schedule.",
            "crop_insurance_check": "Your crop faces {condition} risk. Check insurance eligibility to protect your investment.",
            "alternate_mandi": "Market prices show {condition}. Explore alternative markets for better returns.",
            "contact_support": "You have {condition} obligations due. Contact support services for assistance.",
            "scheme_eligibility": "Your situation indicates {condition}. Check government schemes for potential support.",
            "drainage_check": "Field conditions show {condition}. Inspect drainage systems to prevent water damage.",
            "pest_prevention": "Crop health indicates {condition} risk. Apply preventive measures to protect yield.",
            "loan_rescheduling": "Financial pressure shows {condition}. Discuss loan options with your lender."
        },
        "hindi": {
            "irrigation_advisory": "पानी के स्तर {condition} हैं। अपनी सिंचाई समायोजन पर विचार करें।",
            "crop_insurance_check": "आपकी फसल को {condition} जोखिम है। अपने निवेश की सुरक्षा के लिए बीमा पात्रता जांचें।",
            "alternate_mandi": "बाजार की कीमतें {condition} दिखा रही हैं। बेहतर लाभ के लिए वैकल्पिक बाजारों की खोज करें।",
            "contact_support": "आपके पास {condition} बकाया भुगतान हैं। सहायता के लिए समर्थन सेवाओं से संपर्क करें।",
            "scheme_eligibility": "आपकी स्थिति {condition} दिखा रही है। संभावित समर्थन के लिए सरकारी योजनाएं जांचें।",
            "drainage_check": "खेत की स्थितियां {condition} दिखा रही हैं। जल नुकसान से बचने के लिए जल निकासी प्रणालियों की जांच करें।",
            "pest_prevention": "फसल स्वास्थ्य {condition} जोखिम दिखा रहा है। उत्पादन की रक्षा के लिए रोकथाम उपाय लागू करें।",
            "loan_rescheduling": "वित्तीय दबाव {condition} दिखा रहा है। अपने ऋणदाता के साथ ऋण विकल्पों पर चर्चा करें।"
        }
    }
    
    # Select language templates
    lang_templates = templates.get(language, templates["english"])
    
    for action in ranked_actions:
        action_type = action["action_type"]
        condition = action["reason"].lower()
        
        # Generate plain language recommendation
        if action_type in lang_templates:
            # Simplify condition for template
            simple_condition = condition
            if "detected" in condition:
                simple_condition = condition.replace("detected", "")
            if "risk" in condition:
                simple_condition = condition.replace("risk", "")
            
            recommendation = lang_templates[action_type].format(condition=simple_condition.strip())
        else:
            # Fallback to basic description
            recommendation = f"Consider {ACTION_TYPES.get(action_type, {}).get('name', action_type).lower()}"
        
        formatted_action = {
            "action_type": action_type,
            "rank": 0,  # Will be set after sorting
            "confidence": action.get("ml_confidence", action.get("base_confidence", 0.5)),
            "reason": action["reason"],
            "recommendation": recommendation,
            "status": "Suggested"
        }
        formatted_actions.append(formatted_action)
    
    # Sort by confidence and assign ranks
    formatted_actions.sort(key=lambda x: x["confidence"], reverse=True)
    for i, action in enumerate(formatted_actions):
        action["rank"] = i + 1
    
    return formatted_actions

def generate_intervention_recommendations(db: Session, farmer: models.Farmer) -> List[models.Recommendation]:
    """
    Main function to generate intervention recommendations for a farmer
    Called when distress score is (re)computed
    """
    # Get the latest distress score
    distress_score = db.query(models.DistressScore).filter(
        models.DistressScore.farmer_id == farmer.id
    ).order_by(models.DistressScore.created_at.desc()).first()
    
    if not distress_score:
        return []
    
    # Stage 1: Rule Engine -> candidate actions
    candidate_actions = map_distress_to_actions(distress_score)
    
    if not candidate_actions:
        return []
    
    # Stage 2: ML Ranking -> ranked actions
    ranked_actions = rank_actions_with_ml(candidate_actions, farmer, distress_score)
    
    # Stage 3: LLM -> plain language phrasing
    formatted_actions = format_actions_with_llm(ranked_actions, farmer.language)
    
    # Save recommendations to database
    recommendations = []
    for action_data in formatted_actions:
        # Check if similar recommendation already exists recently
        existing = db.query(models.Recommendation).filter(
            models.Recommendation.farmer_id == farmer.id,
            models.Recommendation.action_type == action_data["action_type"],
            models.Recommendation.status.in_(["Suggested", "In progress"])
        ).first()
        
        if not existing:
            new_rec = models.Recommendation(
                farmer_id=farmer.id,
                distress_score_id=distress_score.id,
                action_type=action_data["action_type"],
                rank=action_data["rank"],
                confidence=action_data["confidence"],
                reason=action_data["reason"],
                status=action_data["status"]
            )
            db.add(new_rec)
            recommendations.append(new_rec)
    
    if recommendations:
        db.commit()
        for rec in recommendations:
            db.refresh(rec)
    
    return recommendations

def get_farmer_recommendations(db: Session, farmer: models.Farmer) -> List[models.Recommendation]:
    """Get current recommendations for a farmer"""
    return db.query(models.Recommendation).filter(
        models.Recommendation.farmer_id == farmer.id,
        models.Recommendation.status.in_(["Suggested", "In progress", "Done"])
    ).order_by(models.Recommendation.rank.asc()).all()

def update_recommendation_status(db: Session, recommendation_id: int, 
                                farmer_id: int, status: str) -> bool:
    """Update the status of a recommendation"""
    if status not in ["Suggested", "In progress", "Done", "Dismissed"]:
        return False
    
    recommendation = db.query(models.Recommendation).filter(
        models.Recommendation.id == recommendation_id,
        models.Recommendation.farmer_id == farmer_id
    ).first()
    
    if not recommendation:
        return False
    
    recommendation.status = status
    db.commit()
    db.refresh(recommendation)
    return True