"""
Market-Driven Agriculture Assistant Recommendation & Intelligence Engine.
Handles multi-factor crop suitability scoring, seasonal price forecasting,
regional supply aggregation with privacy protection, oversupply risk calculation,
and interactive What-If simulation.
"""

import datetime
from typing import List, Dict, Any, Optional
import agri_intelligence_db as db

# Seasonal month mappings
SEASON_MONTHS = {
    "Kharif": [6, 7, 8, 9, 10], # Sowing June-July, Harvest Oct-Nov
    "Rabi": [10, 11, 12, 1, 2, 3, 4], # Sowing Oct-Nov, Harvest March-April
    "Zaid": [3, 4, 5, 6] # Sowing March, Harvest May-June
}

def forecast_harvest_price(
    crop_name: str,
    state: str,
    district: str,
    target_month: int
) -> Dict[str, Any]:
    """
    Analyzes historical prices for the target harvest month and region.
    Detects seasonal trends, price ranges, and returns a confidence-rated price forecast.
    """
    historical = db.get_historical_prices(crop_name, state=state, district=district, month=target_month)
    if not historical:
        # Fallback to general crop price history
        historical = db.get_historical_prices(crop_name, month=target_month)
    if not historical:
        historical = db.get_historical_prices(crop_name)

    if not historical:
        # Default baseline fallback
        base_modal = 2500.0
        min_p = 2200.0
        max_p = 2900.0
        confidence = 75
        seasonal_pattern = "Standard market pricing pattern."
    else:
        # Calculate historical averages for the harvest month
        modal_prices = [h["modal_price"] for h in historical]
        min_prices = [h["min_price"] for h in historical]
        max_prices = [h["max_price"] for h in historical]

        base_modal = sum(modal_prices) / len(modal_prices)
        min_p = sum(min_prices) / len(min_prices)
        max_p = sum(max_prices) / len(max_prices)

        # Higher data points = higher forecast confidence
        sample_size = len(historical)
        confidence = min(92, 70 + (sample_size * 2))

        # Identify seasonal pattern note
        month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        m_name = month_names[target_month - 1]
        
        if crop_name == "Onion" and target_month in [5, 6]:
            seasonal_pattern = f"Seasonal Peak: Onion market arrivals are low in {m_name}, driving prices higher in major mandis."
        elif crop_name == "Tomato" and target_month in [6, 7]:
            seasonal_pattern = f"Monsoon Shift: Heavy rains in {m_name} often restrict transport, creating price spikes in consuming urban centers."
        elif crop_name == "Tomato" and target_month in [11, 12, 1]:
            seasonal_pattern = f"Peak Arrival Glut: High tomato harvest in winter ({m_name}) typically leads to lower market prices."
        elif crop_name == "Wheat" and target_month in [3, 4]:
            seasonal_pattern = f"Harvest Season Arrival: Wheat arrivals peak in {m_name}. Prices reflect Government Minimum Support Price (MSP)."
        else:
            seasonal_pattern = f"Historical seasonal trends for {crop_name} show stable market demand during {m_name}."

    return {
        "forecast_modal_price": round(base_modal, 2),
        "forecast_min_price": round(min_p, 2),
        "forecast_max_price": round(max_p, 2),
        "confidence_level_pct": confidence,
        "confidence_label": "High Confidence" if confidence >= 85 else "Moderate Confidence",
        "seasonal_insight": seasonal_pattern,
        "disclaimer": "Forecast is advisory based on historical mandi trends and current supply inputs. Selling prices are not guaranteed."
    }

def calculate_crop_recommendations(
    state: str,
    district: str,
    mandal: str,
    village: str,
    soil_type: str,
    water_availability: str, # Low, Medium, High
    farm_size_acres: float = 2.0,
    season: str = "Kharif",
    sowing_date: Optional[str] = None,
    target_harvest_month: Optional[int] = 6
) -> Dict[str, Any]:
    """
    Executes explainable multi-factor crop recommendation algorithm.
    Ranks recommendations based on profitability, demand-supply balance, crop suitability, and risk level.
    """
    if not target_harvest_month:
        target_harvest_month = 6 # Default June

    # 1. Fetch all crops and regional supply aggregates
    all_crops = db.get_crops_list()
    supply_aggregates = {item["crop_name"]: item for item in db.get_regional_supply_aggregates(state, district, mandal, village, target_harvest_month)}

    recommendations = []
    unsuitable_crops = []

    for crop in all_crops:
        crop_name = crop["crop_name"]
        
        # A. Soil Suitability Check
        suitable_soils = [s.strip().lower() for s in crop["suitable_soils"].split(",")]
        soil_clean = soil_type.strip().lower() if soil_type else ""
        soil_match = not soil_clean or any(s in soil_clean or soil_clean in s for s in suitable_soils)

        # B. Water Need Category Check
        crop_water = crop["water_req"].lower() # Low, Medium, High
        water_clean = water_availability.lower() # Low, Medium, High
        
        water_score = 100
        if crop_water == "high" and water_clean == "low":
            water_score = 30 # Severe mismatch
        elif crop_water == "high" and water_clean == "medium":
            water_score = 75
        elif crop_water == "medium" and water_clean == "low":
            water_score = 65

        # C. Season Match Check
        crop_seasons = [s.strip().lower() for s in crop["seasons"].split(",")]
        season_clean = season.strip().lower() if season else "kharif"
        season_match = season_clean in crop_seasons or "all" in crop_seasons

        if not season_match or water_score < 40 or not soil_match:
            # Add to unsuitable list with clear explanation
            reasons = []
            if not season_match:
                reasons.append(f"Not suitable for {season} season.")
            if water_score < 40:
                reasons.append(f"Requires high water availability, but farm irrigation level is {water_availability}.")
            if not soil_match:
                reasons.append(f"Prefers {crop['suitable_soils']} (farm has {soil_type}).")
            
            unsuitable_crops.append({
                "name": crop_name,
                "reason": " ".join(reasons)
            })
            continue

        # D. Get Cultivation Cost & Yield
        cost_info = db.get_crop_cost(crop_name)
        total_cost_per_acre = cost_info["total_cost_per_acre"] if cost_info else crop["avg_cost_per_acre"]
        yield_per_acre = crop["avg_yield_per_acre"] # quintals

        # E. Price Forecast for Target Harvest Month
        price_forecast = forecast_harvest_price(crop_name, state, district, target_harvest_month)
        forecast_price = price_forecast["forecast_modal_price"]

        # F. Supply & Demand Evaluation
        supply_info = supply_aggregates.get(crop_name)
        if supply_info:
            farmers_growing = supply_info["display_farmer_count"]
            raw_farmers = supply_info["raw_farmer_count"]
            planned_acreage = supply_info["total_planned_acreage"]
            supply_ratio = supply_info["supply_ratio"]
            risk_level = supply_info["risk_level"]
        else:
            farmers_growing = "0"
            raw_farmers = 0
            planned_acreage = 0.0
            supply_ratio = 0.2
            risk_level = "Low Supply"

        # Price impact penalty if regional oversupply is detected
        adjusted_price = forecast_price
        price_drop_pct = 0.0
        if supply_ratio > 1.15:
            # Price drops proportionally to oversupply excess
            price_drop_pct = min(35.0, round((supply_ratio - 1.0) * 25.0, 1))
            adjusted_price = round(forecast_price * (1.0 - (price_drop_pct / 100.0)), 2)

        # G. Financial Calculation per acre
        expected_revenue_per_acre = round(yield_per_acre * adjusted_price, 2)
        net_profit_per_acre = round(expected_revenue_per_acre - total_cost_per_acre, 2)

        # H. Calculate Composite Suitability & Profitability Rank Score (0 - 100)
        # Weighting: Profitability (40%), Demand-Supply Balance (35%), Water & Soil Suitability (25%)
        profit_score = min(100.0, max(10.0, (net_profit_per_acre / 150000.0) * 100.0))
        
        # Supply score penalizes oversupplied crops
        if supply_ratio > 1.30:
            supply_score = 30.0
        elif supply_ratio > 1.10:
            supply_score = 60.0
        elif supply_ratio > 0.70:
            supply_score = 95.0
        else:
            supply_score = 85.0 # Low supply is good, but indicates lower established local market

        composite_score = round(
            (profit_score * 0.40) +
            (supply_score * 0.35) +
            (water_score * 0.25)
        )

        # Rationale & Explanation
        explanation = (
            f"{crop_name} offers strong economic returns in {district}. "
            f"Expected harvest yield is ~{yield_per_acre} quintals/acre with an estimated selling price of ₹{adjusted_price:,.0f}/quintal. "
        )
        if supply_ratio > 1.25:
            explanation += f"⚠️ Caution: {planned_acreage} acres are already planned in this region ({farmers_growing} farmers), creating high market supply."
        elif supply_ratio > 0.7:
            explanation += f"✅ Balanced regional supply ({planned_acreage} planned acres) provides good market stability."
        else:
            explanation += f"💡 High market absorption opportunity due to low current regional supply ({planned_acreage} planned acres)."

        recommendations.append({
            "name": crop_name,
            "category": crop["category"],
            "suitability_score": composite_score,
            "water_need_category": crop["water_req"],
            "growing_period": f"{crop['duration_days']} days",
            "expected_yield": f"{yield_per_acre} quintals/acre",
            "expected_yield_value": yield_per_acre,
            "forecast_price_range": f"₹{price_forecast['forecast_min_price']:,.0f} - ₹{price_forecast['forecast_max_price']:,.0f} / quintal",
            "forecast_modal_price": forecast_price,
            "adjusted_price": adjusted_price,
            "price_drop_warning": f"{price_drop_pct}% projected price compression due to regional oversupply" if price_drop_pct > 0 else None,
            "cultivation_cost_per_acre": total_cost_per_acre,
            "cost_breakdown": cost_info,
            "estimated_gross_revenue_per_acre": expected_revenue_per_acre,
            "estimated_profit_per_acre": net_profit_per_acre,
            "farmers_growing_count": farmers_growing,
            "raw_farmer_count": raw_farmers,
            "regional_planned_acreage": planned_acreage,
            "supply_risk_level": risk_level,
            "supply_ratio": supply_ratio,
            "demand_outlook": "High Demand" if supply_ratio < 0.9 else ("Balanced" if supply_ratio <= 1.15 else "Oversupplied"),
            "confidence_level": price_forecast["confidence_label"],
            "recommendation_explanation": explanation
        })

    # Sort recommendations by composite score descending
    recommendations.sort(key=lambda x: x["suitability_score"], reverse=True)

    # Pick top 5 recommendations
    top_5 = recommendations[:5]

    # Generate overarching AI Regional Insights
    oversupplied_crops = [r["name"] for r in recommendations if r["supply_ratio"] > 1.20]
    balanced_crops = [r["name"] for r in top_5 if r["supply_ratio"] <= 1.10]

    ai_insights = []
    if oversupplied_crops:
        ai_insights.append(
            f"🚨 Oversupply Warning: {', '.join(oversupplied_crops)} cultivation is rising rapidly in {district}. "
            f"Based on registered crop plans, harvest volume may exceed market demand during your expected harvest window. "
            f"Consider comparing alternative crops like {', '.join(balanced_crops[:2])}."
        )
    else:
        ai_insights.append(
            f"🌟 Favorable Planting Season in {district}: Regional crop choices are balanced with healthy market demand outlooks."
        )

    return {
        "region": {
            "state": state,
            "district": district,
            "mandal": mandal,
            "village": village
        },
        "sowing_season": season,
        "target_harvest_month": target_harvest_month,
        "top_recommendations": top_5,
        "unsuitable_crops": unsuitable_crops[:3],
        "ai_insights": ai_insights,
        "total_crops_evaluated": len(all_crops)
    }

def run_what_if_simulation(
    state: str,
    district: str,
    mandal: str,
    selected_crop: str,
    additional_farmers: int,
    additional_acres: float,
    target_harvest_month: int = 6
) -> Dict[str, Any]:
    """
    Simulates market & financial impact of N additional farmers or X additional acres
    growing selected_crop in the specified district/mandal.
    """
    # Baseline crop & cost info
    cost_info = db.get_crop_cost(selected_crop)
    total_cost_per_acre = cost_info["total_cost_per_acre"] if cost_info else 35000.0
    
    conn = db.get_db_connection()
    crop_info = conn.execute("SELECT avg_yield_per_acre FROM crops WHERE crop_name = ?;", (selected_crop,)).fetchone()
    conn.close()
    yield_per_acre = crop_info[0] if crop_info else 20.0

    # Baseline supply aggregates
    supply_list = db.get_regional_supply_aggregates(state, district, mandal, harvest_month=target_harvest_month)
    current_supply = next((s for s in supply_list if s["crop_name"] == selected_crop), None)

    baseline_farmers = current_supply["raw_farmer_count"] if current_supply else 0
    baseline_acreage = current_supply["total_planned_acreage"] if current_supply else 0.0
    target_threshold = current_supply["target_acreage_threshold"] if current_supply else 400.0

    # Price forecast baseline
    price_info = forecast_harvest_price(selected_crop, state, district, target_harvest_month)
    base_modal_price = price_info["forecast_modal_price"]

    # --- BASELINE SIMULATION ---
    baseline_ratio = round(baseline_acreage / max(target_threshold, 1.0), 2)
    baseline_drop_pct = min(35.0, round((baseline_ratio - 1.0) * 25.0, 1)) if baseline_ratio > 1.15 else 0.0
    baseline_price = round(base_modal_price * (1.0 - (baseline_drop_pct / 100.0)), 2)
    baseline_profit_per_acre = round((yield_per_acre * baseline_price) - total_cost_per_acre, 2)

    # --- NEW SCENARIO WITH ADDITIONAL FARMERS/ACRES ---
    new_farmers = baseline_farmers + additional_farmers
    new_acreage = baseline_acreage + additional_acres

    new_ratio = round(new_acreage / max(target_threshold, 1.0), 2)
    new_drop_pct = min(40.0, round((new_ratio - 1.0) * 25.0, 1)) if new_ratio > 1.15 else 0.0
    simulated_price = round(base_modal_price * (1.0 - (new_drop_pct / 100.0)), 2)
    simulated_profit_per_acre = round((yield_per_acre * simulated_price) - total_cost_per_acre, 2)

    profit_change_per_acre = round(simulated_profit_per_acre - baseline_profit_per_acre, 2)

    # Risk level classification
    if new_ratio > 1.30:
        new_risk = "Oversupply Risk"
    elif new_ratio > 1.10:
        new_risk = "High Supply"
    elif new_ratio > 0.70:
        new_risk = "Balanced Supply"
    else:
        new_risk = "Low Supply"

    # Fetch 3 Alternative Crops for Comparison
    rec_result = calculate_crop_recommendations(
        state, district, mandal, "Village 1", "Alluvial Soil", "Medium",
        farm_size_acres=additional_acres or 2.0, target_harvest_month=target_harvest_month
    )
    alternatives = [r for r in rec_result["top_recommendations"] if r["name"] != selected_crop][:3]

    return {
        "simulation_parameters": {
            "crop_name": selected_crop,
            "region": f"{mandal}, {district}, {state}",
            "additional_farmers": additional_farmers,
            "additional_acres": additional_acres,
            "target_harvest_month": target_harvest_month
        },
        "baseline": {
            "total_farmers": baseline_farmers,
            "planned_acreage": round(baseline_acreage, 1),
            "supply_ratio": baseline_ratio,
            "modal_price": baseline_price,
            "profit_per_acre": baseline_profit_per_acre,
            "risk_level": current_supply["risk_level"] if current_supply else "Low Supply"
        },
        "simulated": {
            "total_farmers": new_farmers,
            "planned_acreage": round(new_acreage, 1),
            "supply_ratio": new_ratio,
            "projected_price": simulated_price,
            "projected_price_compression_pct": new_drop_pct,
            "projected_profit_per_acre": simulated_profit_per_acre,
            "profit_difference_per_acre": profit_change_per_acre,
            "new_risk_level": new_risk
        },
        "impact_summary": (
            f"If {additional_farmers} additional farmer(s) grow {additional_acres} acres of {selected_crop} in {district}, "
            f"total regional planned acreage will reach {new_acreage:.1f} acres ({new_ratio * 100:.0f}% of target absorption limit). "
            f"This is projected to push market price from ₹{baseline_price:,.0f} to ₹{simulated_price:,.0f}/quintal, "
            f"resulting in a profit impact of ₹{profit_change_per_acre:+,.0f}/acre."
        ),
        "recommended_alternatives": alternatives
    }
