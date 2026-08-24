#!/usr/bin/env python3
"""
Test script for the AI Intervention Recommendation Engine
"""
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_intervention_engine():
    """Test the intervention engine components"""
    print("Testing AI Intervention Recommendation Engine...")
    
    try:
        # Import the intervention module
        from app import intervention
        print("✓ Intervention module imported successfully")
        
        # Test loading rules
        rules = intervention.load_rules()
        print(f"✓ Rules loaded successfully, found {len(rules.get('intervention_rules', []))} intervention rule categories")
        
        # Test model loading
        if intervention.model is not None:
            print("✓ ML model loaded successfully")
        else:
            print("⚠ ML model not loaded (will use rule-based fallback)")
            
        # Test action types
        print(f"✓ Defined {len(intervention.ACTION_TYPES)} action types")
        
        print("\nAll basic tests passed!")
        return True
        
    except Exception as e:
        print(f"✗ Error testing intervention engine: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_intervention_engine()
    sys.exit(0 if success else 1)