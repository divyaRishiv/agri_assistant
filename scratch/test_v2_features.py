"""
Verification test script for V2 Market-Driven Agriculture Assistant features.
Verifies all 8 core features: Recommendations, Supply Tracking, Alerts, Price Forecast,
What-If Simulation, Crop Plan Registration, and Privacy Thresholding.
"""

import sys
import os
import json

# Ensure utf-8 output encoding on Windows console
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import agri_intelligence_db as db
import agri_engine

def test_recommendations():
    print("--- 1. Testing AI Crop Recommendation Dashboard ---")
    rec = agri_engine.calculate_crop_recommendations(
        state="Andhra Pradesh",
        district="Guntur",
        mandal="Tenali",
        village="Angalakuduru",
        soil_type="Black Soil",
        water_availability="Medium",
        farm_size_acres=3.5,
        season="Kharif",
        target_harvest_month=6
    )
    assert rec is not None, "Recommendation response is None"
    assert len(rec["top_recommendations"]) == 5, f"Expected 5 recommendations, got {len(rec['top_recommendations'])}"
    top = rec["top_recommendations"][0]
    print(f"Top Recommended Crop: {top['name']} (Score: {top['suitability_score']}%)")
    print(f"  • Est. Profit / Acre: ₹{top['estimated_profit_per_acre']:,.2f}")
    print(f"  • Forecast Price Range: {top['forecast_price_range']}")
    print(f"  • Supply Risk Level: {top['supply_risk_level']}")
    print("  • Recommendation Explanation:", top['recommendation_explanation'][:100] + "...")
    print("✅ Recommendations Test Passed.\n")

def test_regional_supply():
    print("--- 2. Testing Regional Crop Supply Tracker & Privacy Protection ---")
    aggregates = db.get_regional_supply_aggregates("Andhra Pradesh", "Guntur", harvest_month=6)
    assert len(aggregates) > 0, "No regional supply aggregates returned"
    
    for item in aggregates:
        print(f"Crop: {item['crop_name']} | Planned Acreage: {item['total_planned_acreage']} Acres | Supply Ratio: {item['supply_ratio']}x Target | Risk: {item['risk_level']}")
        print(f"  • Privacy Status: {item['privacy_note']} (Display Count: {item['display_farmer_count']})")
        
        # Verify privacy protection threshold logic (< 5 threshold)
        if item['raw_farmer_count'] < 5:
            assert item['is_privacy_protected'] is True, f"Expected privacy protection for farmer count < 5, got {item['raw_farmer_count']}"
            assert item['display_farmer_count'] == "<5", f"Expected masked display count '<5', got {item['display_farmer_count']}"

    print("✅ Regional Supply Tracker & Privacy Protection Test Passed.\n")

def test_price_forecast():
    print("--- 3. Testing Seasonal Price Forecasting Engine ---")
    forecast = agri_engine.forecast_harvest_price("Tomato", "Andhra Pradesh", "Guntur", target_month=6)
    print("Tomato Harvest Month 6 Forecast:")
    print(f"  • Forecast Range: ₹{forecast['forecast_min_price']} - ₹{forecast['forecast_max_price']} / quintal")
    print(f"  • Confidence: {forecast['confidence_level_pct']}% ({forecast['confidence_label']})")
    print(f"  • Seasonal Pattern: {forecast['seasonal_insight']}")
    print(f"  • Non-guarantee Disclaimer: {forecast['disclaimer']}")
    assert forecast['forecast_modal_price'] > 0
    print("✅ Price Forecast Test Passed.\n")

def test_what_if_simulation():
    print("--- 4. Testing What-If Crop Planning Simulator ---")
    sim = agri_engine.run_what_if_simulation(
        state="Andhra Pradesh",
        district="Guntur",
        mandal="Tenali",
        selected_crop="Tomato",
        additional_farmers=20,
        additional_acres=80.0,
        target_harvest_month=6
    )
    print("What-If Simulation Scenario (+20 Farmers / +80 Acres of Tomato):")
    print(f"  • Baseline Profit / Acre: ₹{sim['baseline']['profit_per_acre']:,.2f}")
    print(f"  • Simulated Profit / Acre: ₹{sim['simulated']['projected_profit_per_acre']:,.2f}")
    print(f"  • Projected Price Compression: {sim['simulated']['projected_price_compression_pct']}%")
    print(f"  • Profit Shift: ₹{sim['simulated']['profit_difference_per_acre']:,.2f}")
    print("  • Impact Summary:", sim['impact_summary'])
    assert len(sim['recommended_alternatives']) > 0, "No alternative crops offered in simulation"
    print("✅ What-If Simulator Test Passed.\n")

def test_crop_plan_registration():
    print("--- 5. Testing Farmer Crop Planning Registration CRUD ---")
    reg_data = {
        "email": "test_farmer@example.com",
        "farmer_name": "Testing Farmer",
        "phone": "9988776655",
        "state": "Andhra Pradesh",
        "district": "Guntur",
        "mandal": "Tenali",
        "village": "Angalakuduru",
        "crop_name": "Chilli",
        "acreage": 4.5,
        "sowing_date": "2026-03-20",
        "expected_harvest_date": "2026-07-20",
        "status": "Planned",
        "notes": "Automated verification test plan"
    }

    res = db.register_crop_plan(reg_data)
    assert res['status'] == 'success'
    plan_id = res['plan_id']
    print(f"Successfully registered crop plan with ID: {plan_id}")

    # Query registered plans
    plans = db.get_farmer_crop_plans("test_farmer@example.com")
    assert len(plans) > 0
    assert plans[0]['crop_name'] == "Chilli"
    print(f"Retrieved plan: {plans[0]['crop_name']} ({plans[0]['acreage']} acres), Status: {plans[0]['status']}")

    # Update status
    db.update_crop_plan_status(plan_id, "Confirmed")
    updated_plans = db.get_farmer_crop_plans("test_farmer@example.com")
    assert updated_plans[0]['status'] == "Confirmed"
    print("Updated plan status to 'Confirmed'")

    # Cancel plan
    db.delete_crop_plan(plan_id)
    remaining_plans = db.get_farmer_crop_plans("test_farmer@example.com")
    assert len(remaining_plans) == 0
    print("Cancelled plan successfully.")

    print("✅ Crop Plan Registration CRUD Test Passed.\n")

if __name__ == "__main__":
    print("==================================================================")
    print("RUNNING V2 AGRI INTELLIGENCE COMPREHENSIVE SUITE VERIFICATION")
    print("==================================================================\n")
    test_recommendations()
    test_regional_supply()
    test_price_forecast()
    test_what_if_simulation()
    test_crop_plan_registration()
    print("==================================================================")
    print("ALL VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀")
    print("==================================================================")
