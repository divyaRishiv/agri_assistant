"""
Database storage and seeding module for Market-Driven Agriculture Assistant.
Handles SQLite initialization, tables for Farmers, Crop Plans, Historical Prices,
Market Demand, Regional Supply, Weather Data, and Cultivation Costs.
"""

import os
import sqlite3
import datetime
import random
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "agri_assistant.db")

def get_db_connection():
    """Establishes SQLite connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes tables and seeds initial data if database is empty."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON;")

    # 1. Farmers Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS farmers (
        farmer_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        state TEXT NOT NULL,
        district TEXT NOT NULL,
        mandal TEXT NOT NULL,
        village TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Crop Plans Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS crop_plans (
        plan_id TEXT PRIMARY KEY,
        farmer_id TEXT NOT NULL,
        state TEXT NOT NULL,
        district TEXT NOT NULL,
        mandal TEXT NOT NULL,
        village TEXT NOT NULL,
        crop_name TEXT NOT NULL,
        acreage REAL NOT NULL,
        sowing_date TEXT NOT NULL,
        expected_harvest_date TEXT NOT NULL,
        status TEXT DEFAULT 'Planned', -- Planned, Confirmed, Harvested, Cancelled
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (farmer_id) REFERENCES farmers(farmer_id)
    );
    """)

    # 3. Crops Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS crops (
        crop_id TEXT PRIMARY KEY,
        crop_name TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL, -- Cereal, Pulse, Vegetable, Cash Crop, Oilseed
        duration_days INTEGER NOT NULL,
        avg_yield_per_acre REAL NOT NULL, -- Quintals per acre
        avg_cost_per_acre REAL NOT NULL, -- INR per acre
        water_req TEXT NOT NULL, -- Low, Medium, High
        suitable_soils TEXT NOT NULL, -- CSV string
        seasons TEXT NOT NULL -- CSV string e.g. Kharif, Rabi, Zaid
    );
    """)

    # 4. Cultivation Costs Breakdown Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cultivation_costs (
        cost_id TEXT PRIMARY KEY,
        crop_name TEXT UNIQUE NOT NULL,
        seed_cost REAL NOT NULL,
        fertilizer_cost REAL NOT NULL,
        labor_cost REAL NOT NULL,
        irrigation_cost REAL NOT NULL,
        pesticide_cost REAL NOT NULL,
        machinery_cost REAL NOT NULL,
        total_cost_per_acre REAL NOT NULL
    );
    """)

    # 5. Historical Market Prices Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS historical_market_prices (
        price_id INTEGER PRIMARY KEY AUTOINCREMENT,
        crop_name TEXT NOT NULL,
        state TEXT NOT NULL,
        district TEXT NOT NULL,
        mandi_name TEXT NOT NULL,
        month INTEGER NOT NULL, -- 1 to 12
        year INTEGER NOT NULL,
        min_price REAL NOT NULL, -- INR / quintal
        max_price REAL NOT NULL,
        modal_price REAL NOT NULL,
        demand_index REAL DEFAULT 1.0
    );
    """)

    # 6. Market Demand & Threshold Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS market_demand (
        demand_id INTEGER PRIMARY KEY AUTOINCREMENT,
        state TEXT NOT NULL,
        district TEXT NOT NULL,
        crop_name TEXT NOT NULL,
        month INTEGER NOT NULL,
        monthly_demand_quintals REAL NOT NULL,
        target_acreage_threshold REAL NOT NULL
    );
    """)

    # 7. Weather Data Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS weather_data (
        weather_id INTEGER PRIMARY KEY AUTOINCREMENT,
        state TEXT NOT NULL,
        district TEXT NOT NULL,
        month INTEGER NOT NULL,
        avg_temp_c REAL NOT NULL,
        rainfall_mm REAL NOT NULL,
        humidity_pct REAL NOT NULL,
        summary TEXT
    );
    """)

    # 8. Notifications Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        notification_id TEXT PRIMARY KEY,
        farmer_id TEXT, -- NULL for regional broadcast
        state TEXT NOT NULL,
        district TEXT NOT NULL,
        crop_name TEXT,
        type TEXT NOT NULL, -- oversupply, price_trend, planting_window, advisory
        risk_level TEXT DEFAULT 'Moderate', -- Low, Moderate, High, Severe
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Indexing for quick aggregated regional supply queries
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_plans_region ON crop_plans(state, district, mandal, village, crop_name, status);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_prices_lookup ON historical_market_prices(crop_name, state, district, month);")

    conn.commit()

    # Seed data if DB is new
    cursor.execute("SELECT COUNT(*) FROM crops;")
    if cursor.fetchone()[0] == 0:
        seed_initial_data(conn)

    conn.close()

def seed_initial_data(conn):
    """Populates realistic initial dataset for Indian crops, historical prices, demand, and registered farmers."""
    cursor = conn.cursor()

    # Seed Crops
    crops_data = [
        ("c1", "Tomato", "Vegetable", 105, 120.0, 42000.0, "Medium", "Alluvial Soil, Red Soil, Black Soil", "Kharif, Rabi, Zaid"),
        ("c2", "Onion", "Vegetable", 120, 110.0, 38000.0, "Medium", "Alluvial Soil, Black Soil, Red Soil", "Kharif, Rabi, Zaid"),
        ("c3", "Chilli", "Vegetable", 140, 45.0, 48000.0, "Medium", "Black Soil, Red Soil, Alluvial Soil", "Kharif, Rabi"),
        ("c4", "Groundnut", "Oilseed", 115, 18.0, 24000.0, "Low", "Red Soil, Black Soil, Desert Soil", "Kharif, Rabi"),
        ("c5", "Paddy (Rice)", "Cereal", 130, 22.0, 28000.0, "High", "Alluvial Soil, Black Soil", "Kharif, Rabi"),
        ("c6", "Cotton", "Cash Crop", 165, 10.0, 32000.0, "Medium", "Black Soil, Alluvial Soil", "Kharif"),
        ("c7", "Wheat", "Cereal", 115, 20.0, 22000.0, "Medium", "Alluvial Soil, Black Soil", "Rabi"),
        ("c8", "Maize (Corn)", "Cereal", 100, 25.0, 20000.0, "Medium", "Alluvial Soil, Red Soil", "Kharif, Rabi"),
        ("c9", "Soyabean", "Oilseed", 105, 12.0, 18000.0, "Low", "Black Soil, Alluvial Soil", "Kharif"),
        ("c10", "Potato", "Vegetable", 100, 130.0, 36000.0, "Medium", "Alluvial Soil, Red Soil", "Rabi"),
        ("c11", "Sugarcane", "Cash Crop", 360, 400.0, 65000.0, "High", "Alluvial Soil, Black Soil", "Kharif, Rabi"),
        ("c12", "Mustard", "Oilseed", 110, 8.0, 16000.0, "Low", "Alluvial Soil, Desert Soil", "Rabi")
    ]

    cursor.executemany("""
    INSERT INTO crops (crop_id, crop_name, category, duration_days, avg_yield_per_acre, avg_cost_per_acre, water_req, suitable_soils, seasons)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, crops_data)

    # Seed Cultivation Costs
    cost_data = [
        ("cost_1", "Tomato", 6000, 10000, 14000, 4000, 5000, 3000, 42000),
        ("cost_2", "Onion", 5000, 9000, 13000, 4000, 4000, 3000, 38000),
        ("cost_3", "Chilli", 7000, 11000, 16000, 5000, 6000, 3000, 48000),
        ("cost_4", "Groundnut", 4000, 5000, 8000, 3000, 2000, 2000, 24000),
        ("cost_5", "Paddy (Rice)", 3500, 7000, 9500, 4000, 2000, 2000, 28000),
        ("cost_6", "Cotton", 4500, 8500, 10000, 3000, 3500, 2500, 32000),
        ("cost_7", "Wheat", 3000, 6000, 6500, 3000, 1500, 2000, 22000),
        ("cost_8", "Maize (Corn)", 2800, 5500, 6000, 2500, 1700, 1500, 20000),
        ("cost_9", "Soyabean", 2500, 5000, 5500, 2000, 1500, 1500, 18000),
        ("cost_10", "Potato", 8000, 9000, 10000, 3000, 3000, 3000, 36000),
        ("cost_11", "Sugarcane", 12000, 16000, 20000, 8000, 4000, 5000, 65000),
        ("cost_12", "Mustard", 2000, 4500, 5000, 2000, 1200, 1300, 16000)
    ]

    cursor.executemany("""
    INSERT INTO cultivation_costs (cost_id, crop_name, seed_cost, fertilizer_cost, labor_cost, irrigation_cost, pesticide_cost, machinery_cost, total_cost_per_acre)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, cost_data)

    # Seed Regions & Historical Prices for 2024, 2025, 2026 across 12 months
    # Define baseline modal prices per crop with seasonal multiplication factors
    base_crop_prices = {
        "Tomato": 2200,    # Peaks in June-July, crashes in Nov-Jan
        "Onion": 2400,     # Spikes May-June & Oct-Nov
        "Chilli": 17500,   # High value
        "Groundnut": 6300,
        "Paddy (Rice)": 2350,
        "Cotton": 7300,
        "Wheat": 2400,     # Dips post harvest in April
        "Maize (Corn)": 2150,
        "Soyabean": 4600,
        "Potato": 1500,
        "Sugarcane": 320,  # Per Tonne -> scaled
        "Mustard": 5400
    }

    seasonal_modifiers = {
        # Month: {crop: multiplier}
        1:  {"Tomato": 0.70, "Onion": 0.85, "Potato": 0.75, "Wheat": 1.05},
        2:  {"Tomato": 0.75, "Onion": 0.80, "Potato": 0.70, "Wheat": 1.08},
        3:  {"Tomato": 0.85, "Onion": 0.90, "Wheat": 0.95, "Mustard": 0.88},
        4:  {"Tomato": 0.95, "Onion": 0.95, "Wheat": 0.90, "Mustard": 0.90},
        5:  {"Tomato": 1.25, "Onion": 1.35, "Chilli": 1.10},
        6:  {"Tomato": 1.45, "Onion": 1.40, "Groundnut": 1.12},
        7:  {"Tomato": 1.30, "Onion": 1.25, "Groundnut": 1.15},
        8:  {"Tomato": 1.10, "Onion": 1.10, "Paddy (Rice)": 1.05},
        9:  {"Tomato": 0.90, "Onion": 1.15, "Soyabean": 0.92},
        10: {"Tomato": 0.80, "Onion": 1.30, "Soyabean": 0.88, "Cotton": 0.92},
        11: {"Tomato": 0.75, "Onion": 1.20, "Cotton": 0.95},
        12: {"Tomato": 0.70, "Onion": 0.95, "Potato": 0.85}
    }

    sample_states_districts = [
        ("Andhra Pradesh", "Guntur", "Guntur Mandi"),
        ("Andhra Pradesh", "Anantapur", "Anantapur Mandi"),
        ("Andhra Pradesh", "Kurnool", "Kurnool Mandi"),
        ("Maharashtra", "Nashik", "Pimplgaon Mandi"),
        ("Maharashtra", "Pune", "Pune Mandi"),
        ("Maharashtra", "Nagpur", "Nagpur Mandi"),
        ("Punjab", "Ludhiana", "Ludhiana Mandi"),
        ("Punjab", "Bathinda", "Bathinda Mandi"),
        ("Uttar Pradesh", "Agra", "Agra Mandi"),
        ("Uttar Pradesh", "Varanasi", "Varanasi Mandi"),
        ("Tamil Nadu", "Coimbatore", "Coimbatore Mandi"),
        ("Karnataka", "Bengaluru", "Yeshwanthpur Mandi"),
        ("Gujarat", "Rajkot", "Rajkot Mandi"),
        ("Rajasthan", "Jaipur", "Jaipur Mandi"),
        ("Madhya Pradesh", "Indore", "Indore Mandi")
    ]

    price_records = []
    for state, district, mandi in sample_states_districts:
        for year in [2024, 2025, 2026]:
            for month in range(1, 13):
                for crop, base in base_crop_prices.items():
                    modifier = seasonal_modifiers.get(month, {}).get(crop, 1.0)
                    # Add slight random noise per mandi
                    mandi_noise = 0.95 + (hash(mandi + crop) % 10) * 0.01
                    final_modal = round(base * modifier * mandi_noise)
                    min_p = round(final_modal * 0.90)
                    max_p = round(final_modal * 1.10)
                    price_records.append((crop, state, district, mandi, month, year, min_p, max_p, final_modal, round(modifier, 2)))

    cursor.executemany("""
    INSERT INTO historical_market_prices (crop_name, state, district, mandi_name, month, year, min_price, max_price, modal_price, demand_index)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, price_records)

    # Seed Market Demand & Acreage Thresholds per Region
    demand_records = []
    crops_list = list(base_crop_prices.keys())
    for state, district, _ in sample_states_districts:
        for month in range(1, 13):
            for crop in crops_list:
                # Set realistic regional target monthly absorption (quintals) and recommended max acreage threshold
                if crop in ["Tomato", "Onion", "Potato"]:
                    target_acreage = 350.0  # limit per district/mandal
                    monthly_demand = 40000.0
                elif crop in ["Paddy (Rice)", "Wheat", "Sugarcane"]:
                    target_acreage = 1200.0
                    monthly_demand = 25000.0
                elif crop in ["Cotton", "Chilli", "Groundnut"]:
                    target_acreage = 500.0
                    monthly_demand = 9000.0
                else:
                    target_acreage = 450.0
                    monthly_demand = 12000.0
                
                demand_records.append((state, district, crop, month, monthly_demand, target_acreage))

    cursor.executemany("""
    INSERT INTO market_demand (state, district, crop_name, month, monthly_demand_quintals, target_acreage_threshold)
    VALUES (?, ?, ?, ?, ?, ?);
    """, demand_records)

    # Seed Weather Data
    weather_records = []
    for state, district, _ in sample_states_districts:
        for month in range(1, 13):
            if month in [6, 7, 8, 9]:
                temp, rain, hum = 28.5, 210.0, 82.0
                summary = "Monsoon Season: Heavy to moderate rainfall expected. Good for rain-fed Kharif crops."
            elif month in [11, 12, 1, 2]:
                temp, rain, hum = 18.0, 15.0, 55.0
                summary = "Winter Season: Dry and cool weather. Ideal for Rabi crops."
            else:
                temp, rain, hum = 34.0, 25.0, 45.0
                summary = "Summer Season: Warm to hot temperatures. Requires consistent irrigation."
            weather_records.append((state, district, month, temp, rain, hum, summary))

    cursor.executemany("""
    INSERT INTO weather_data (state, district, month, avg_temp_c, rainfall_mm, humidity_pct, summary)
    VALUES (?, ?, ?, ?, ?, ?, ?);
    """, weather_records)

    # Seed Sample Registered Farmers & Crop Plans to showcase regional supply & oversupply warnings
    sample_farmers = [
        ("f1", "Ramesh Kumar", "ramesh@example.com", "9876543210", "Andhra Pradesh", "Guntur", "Tenali", "Angalakuduru"),
        ("f2", "Suresh Reddy", "suresh@example.com", "9876543211", "Andhra Pradesh", "Guntur", "Tenali", "Nandivelugu"),
        ("f3", "Venkatesh Rao", "venkatesh@example.com", "9876543212", "Andhra Pradesh", "Guntur", "Tenali", "Angalakuduru"),
        ("f4", "Lakshmi Devi", "lakshmi@example.com", "9876543213", "Andhra Pradesh", "Guntur", "Tenali", "Angalakuduru"),
        ("f5", "Anil Patil", "anil@example.com", "9876543214", "Maharashtra", "Nashik", "Niphad", "Pimpalgaon"),
        ("f6", "Balasaheb Shinde", "balasaheb@example.com", "9876543215", "Maharashtra", "Nashik", "Niphad", "Ranwad"),
        ("f7", "Gurpreet Singh", "gurpreet@example.com", "9876543216", "Punjab", "Ludhiana", "Jagraon", "Sidwan"),
        ("f8", "Harpreet Kaur", "harpreet@example.com", "9876543217", "Punjab", "Ludhiana", "Jagraon", "Chowkiman")
    ]

    cursor.executemany("""
    INSERT INTO farmers (farmer_id, name, email, phone, state, district, mandal, village)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, sample_farmers)

    # Seed multiple crop plans in Guntur to simulate high tomato planned acreage for June harvest
    # We will simulate 42 farmers planning Tomato (480 acres total) in Guntur to trigger Oversupply Risk!
    plans_list = []
    
    # 42 simulated farmers in Guntur planning Tomato for June harvest
    for i in range(1, 43):
        f_id = f"f_{i}"
        plans_list.append((
            f"plan_tom_{i}",
            "f1" if i == 1 else "f2",
            "Andhra Pradesh",
            "Guntur",
            "Tenali" if i <= 25 else "Mangalagiri",
            "Angalakuduru" if i <= 15 else "Village B",
            "Tomato",
            11.5, # avg ~11.5 acres per farmer = 483 acres total (exceeding 350 acre threshold!)
            "2026-03-01",
            "2026-06-15",
            "Planned",
            "Registered via Kisan Mitra AI"
        ))

    # Add Chilli and Groundnut plans in Guntur (balanced supply)
    for i in range(1, 12):
        plans_list.append((
            f"plan_chil_{i}",
            "f3",
            "Andhra Pradesh",
            "Guntur",
            "Tenali",
            "Angalakuduru",
            "Chilli",
            12.0, # 132 acres total (well balanced)
            "2026-03-05",
            "2026-07-20",
            "Planned",
            "Registered plan"
        ))

    # Add Onion plans in Nashik (high supply)
    for i in range(1, 28):
        plans_list.append((
            f"plan_oni_{i}",
            "f5",
            "Maharashtra",
            "Nashik",
            "Niphad",
            "Pimpalgaon",
            "Onion",
            14.0, # ~392 acres total
            "2026-02-15",
            "2026-06-10",
            "Planned",
            "Registered plan"
        ))

    cursor.executemany("""
    INSERT INTO crop_plans (plan_id, farmer_id, state, district, mandal, village, crop_name, acreage, sowing_date, expected_harvest_date, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, plans_list)

    # Seed Sample Notifications
    notifications_list = [
        ("n1", None, "Andhra Pradesh", "Guntur", "Tomato", "oversupply", "High", "Oversupply Risk Alert: Tomato in Guntur", "42 farmers in Guntur have registered 483 acres of Tomato for harvest in June. Projected harvest volume exceeds local demand by 38%. Price drop expected. Consider Chilli or Groundnut."),
        ("n2", None, "Maharashtra", "Nashik", "Onion", "price_trend", "Moderate", "Price Trend Alert: Onion Seasonality", "Historical data indicates Onion prices rise peak in May-June in Nashik Mandi. Plan harvest window carefully."),
        ("n3", None, "Andhra Pradesh", "Guntur", "Chilli", "planting_window", "Low", "Favorable Sowing Window: Chilli", "Weather conditions and market demand outlook for Chilli in Guntur are optimal for March-April sowing.")
    ]

    cursor.executemany("""
    INSERT INTO notifications (notification_id, farmer_id, state, district, crop_name, type, risk_level, title, message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, notifications_list)

    conn.commit()
    print("Database initial schema and seeding completed successfully.")

# Initialize DB when module is imported
init_db()

# ─────────────────────────────────────────────────────────────────────
# HELPER DATA ACCESS FUNCTIONS
# ─────────────────────────────────────────────────────────────────────

def get_crops_list() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM crops ORDER BY crop_name;").fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_crop_cost(crop_name: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM cultivation_costs WHERE crop_name = ?;", (crop_name,)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_market_demand(state: str, district: str, crop_name: str, month: int) -> Dict[str, Any]:
    conn = get_db_connection()
    row = conn.execute(
        "SELECT * FROM market_demand WHERE state = ? AND district = ? AND crop_name = ? AND month = ?;",
        (state, district, crop_name, month)
    ).fetchone()
    
    if not row:
        # Fallback query matching state & crop or default
        row = conn.execute(
            "SELECT * FROM market_demand WHERE crop_name = ? LIMIT 1;", (crop_name,)
        ).fetchone()

    conn.close()
    if row:
        return dict(row)
    return {
        "state": state, "district": district, "crop_name": crop_name, "month": month,
        "monthly_demand_quintals": 15000.0, "target_acreage_threshold": 400.0
    }

def get_historical_prices(crop_name: str, state: str = None, district: str = None, month: int = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    query = "SELECT * FROM historical_market_prices WHERE crop_name = ?"
    params = [crop_name]

    if state:
        query += " AND state = ?"
        params.append(state)
    if district:
        query += " AND district = ?"
        params.append(district)
    if month:
        query += " AND month = ?"
        params.append(month)

    query += " ORDER BY year ASC, month ASC;"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_weather(state: str, district: str, month: int) -> Dict[str, Any]:
    conn = get_db_connection()
    row = conn.execute(
        "SELECT * FROM weather_data WHERE state = ? AND district = ? AND month = ?;",
        (state, district, month)
    ).fetchone()
    conn.close()
    if row:
        return dict(row)
    return {
        "state": state, "district": district, "month": month,
        "avg_temp_c": 28.0, "rainfall_mm": 80.0, "humidity_pct": 65.0,
        "summary": "Favorable general climate conditions for cultivation."
    }

def register_crop_plan(data: Dict[str, Any]) -> Dict[str, Any]:
    """Registers or updates a farmer's crop plan."""
    conn = get_db_connection()
    cursor = conn.cursor()

    email = data.get("email", "").strip().lower()
    farmer_name = data.get("farmer_name", "Farmer").strip()
    phone = data.get("phone", "").strip()
    state = data.get("state", "").strip()
    district = data.get("district", "").strip()
    mandal = data.get("mandal", "").strip() or "Central Mandal"
    village = data.get("village", "").strip() or "Village 1"

    # Find or create farmer
    cursor.execute("SELECT farmer_id FROM farmers WHERE email = ?;", (email,))
    row = cursor.fetchone()
    if row:
        farmer_id = row[0]
    else:
        farmer_id = f"farmer_{int(datetime.datetime.now().timestamp())}_{random.randint(100,999)}"
        cursor.execute(
            "INSERT INTO farmers (farmer_id, name, email, phone, state, district, mandal, village) VALUES (?, ?, ?, ?, ?, ?, ?, ?);",
            (farmer_id, farmer_name, email, phone, state, district, mandal, village)
        )

    plan_id = data.get("plan_id") or f"plan_{int(datetime.datetime.now().timestamp())}_{random.randint(100,999)}"
    crop_name = data.get("crop_name")
    acreage = float(data.get("acreage", 1.0))
    sowing_date = data.get("sowing_date", str(datetime.date.today()))
    expected_harvest_date = data.get("expected_harvest_date", str(datetime.date.today() + datetime.timedelta(days=110)))
    status = data.get("status", "Planned")
    notes = data.get("notes", "")

    # Upsert plan
    cursor.execute("SELECT plan_id FROM crop_plans WHERE plan_id = ?;", (plan_id,))
    if cursor.fetchone():
        cursor.execute("""
        UPDATE crop_plans 
        SET state=?, district=?, mandal=?, village=?, crop_name=?, acreage=?, sowing_date=?, expected_harvest_date=?, status=?, notes=?, updated_at=CURRENT_TIMESTAMP
        WHERE plan_id=?;
        """, (state, district, mandal, village, crop_name, acreage, sowing_date, expected_harvest_date, status, notes, plan_id))
    else:
        cursor.execute("""
        INSERT INTO crop_plans (plan_id, farmer_id, state, district, mandal, village, crop_name, acreage, sowing_date, expected_harvest_date, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (plan_id, farmer_id, state, district, mandal, village, crop_name, acreage, sowing_date, expected_harvest_date, status, notes))

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "plan_id": plan_id,
        "message": f"Crop plan for {crop_name} ({acreage} acres) successfully registered."
    }

def get_farmer_crop_plans(email: str) -> List[Dict[str, Any]]:
    """Gets registered plans for a specific farmer by email."""
    conn = get_db_connection()
    rows = conn.execute("""
    SELECT cp.*, f.name as farmer_name, f.email 
    FROM crop_plans cp
    JOIN farmers f ON cp.farmer_id = f.farmer_id
    WHERE LOWER(f.email) = ?
    ORDER BY cp.created_at DESC;
    """, (email.strip().lower(),)).fetchall()
    conn.close()
    return [dict(row) for row in rows]

def update_crop_plan_status(plan_id: str, new_status: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE crop_plans SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE plan_id = ?;", (new_status, plan_id))
    conn.commit()
    affected = cursor.rowcount > 0
    conn.close()
    return affected

def delete_crop_plan(plan_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM crop_plans WHERE plan_id = ?;", (plan_id,))
    conn.commit()
    affected = cursor.rowcount > 0
    conn.close()
    return affected

def get_regional_supply_aggregates(
    state: str,
    district: str,
    mandal: Optional[str] = None,
    village: Optional[str] = None,
    harvest_month: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Calculates aggregated crop plans and projected supply for a given geographic area.
    Applies privacy group-size thresholding (minimum 5 farmers threshold).
    """
    conn = get_db_connection()
    
    # Base query for aggregation
    query = """
    SELECT 
        crop_name,
        COUNT(DISTINCT farmer_id) as farmer_count,
        SUM(acreage) as total_planned_acreage,
        COUNT(CASE WHEN status = 'Planned' THEN 1 END) as planned_count,
        COUNT(CASE WHEN status = 'Confirmed' THEN 1 END) as confirmed_count,
        COUNT(CASE WHEN status = 'Harvested' THEN 1 END) as harvested_count
    FROM crop_plans
    WHERE state = ? AND district = ? AND status != 'Cancelled'
    """
    params = [state, district]

    if mandal:
        query += " AND mandal = ?"
        params.append(mandal)
    if village:
        query += " AND village = ?"
        params.append(village)

    query += " GROUP BY crop_name ORDER BY total_planned_acreage DESC;"

    rows = conn.execute(query, params).fetchall()
    
    results = []
    PRIVACY_THRESHOLD = 5 # Minimum group size threshold to protect privacy

    for row in rows:
        item = dict(row)
        crop_name = item["crop_name"]
        farmer_count = item["farmer_count"]
        acreage = item["total_planned_acreage"] or 0.0

        # Fetch crop yield info
        crop_info = conn.execute("SELECT avg_yield_per_acre FROM crops WHERE crop_name = ?;", (crop_name,)).fetchone()
        yield_per_acre = crop_info[0] if crop_info else 20.0
        estimated_harvest_quintals = round(acreage * yield_per_acre, 1)

        # Get demand limit
        curr_month = harvest_month or datetime.date.today().month
        demand_info = get_market_demand(state, district, crop_name, curr_month)
        target_limit = demand_info.get("target_acreage_threshold", 400.0)
        monthly_demand = demand_info.get("monthly_demand_quintals", 15000.0)

        # Supply Ratio & Risk Status
        supply_ratio = round(acreage / max(target_limit, 1.0), 2)
        if supply_ratio > 1.30:
            risk_level = "Oversupply Risk"
            risk_class = "risk-high"
        elif supply_ratio > 1.05:
            risk_level = "High Supply"
            risk_class = "risk-moderate-high"
        elif supply_ratio > 0.70:
            risk_level = "Balanced Supply"
            risk_class = "risk-balanced"
        else:
            risk_level = "Low Supply"
            risk_class = "risk-low"

        # Apply Privacy Protection: If farmer count < PRIVACY_THRESHOLD, mask count & anonymize exact village stats
        is_masked = farmer_count < PRIVACY_THRESHOLD
        display_farmer_count = f"<{PRIVACY_THRESHOLD}" if is_masked else str(farmer_count)

        results.append({
            "crop_name": crop_name,
            "raw_farmer_count": farmer_count,
            "display_farmer_count": display_farmer_count,
            "is_privacy_protected": is_masked,
            "privacy_note": f"Privacy Protected (Group size < {PRIVACY_THRESHOLD} farmers anonymized)" if is_masked else "Aggregated Data Only",
            "total_planned_acreage": round(acreage, 1),
            "estimated_harvest_quintals": estimated_harvest_quintals,
            "planned_count": item["planned_count"],
            "confirmed_count": item["confirmed_count"],
            "harvested_count": item["harvested_count"],
            "target_acreage_threshold": target_limit,
            "monthly_demand_quintals": monthly_demand,
            "supply_ratio": supply_ratio,
            "risk_level": risk_level,
            "risk_class": risk_class,
            "harvest_month": curr_month
        })

    conn.close()
    return results

def get_active_notifications(state: str, district: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    rows = conn.execute("""
    SELECT * FROM notifications 
    WHERE state = ? AND district = ?
    ORDER BY created_at DESC LIMIT 10;
    """, (state, district)).fetchall()
    conn.close()
    return [dict(row) for row in rows]
