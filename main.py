import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Agriculture Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FarmData(BaseModel):
    state: str
    district: str
    soil_type: str
    season: str
    irrigation: str
    water_source: str
    farm_size: Optional[str] = ""
    previous_crop: Optional[str] = ""

client = OpenAI(
    api_key=os.environ.get("GROQ_API_KEY", "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"),
    base_url="https://api.groq.com/openai/v1"
)

@app.post("/api/recommend")
async def recommend_crops(data: FarmData):
    prompt = f"""
You are an AI-powered Agriculture Assistant for Indian farmers. 
Analyze the following farm details and recommend the best crops:
- State: {data.state}
- District: {data.district}
- Soil Type: {data.soil_type}
- Season: {data.season}
- Irrigation availability: {data.irrigation}
- Water source availability: {data.water_source}
- Farm size: {data.farm_size}
- Previous crop cultivated: {data.previous_crop}

Based on these inputs, perform a thorough, scientific agricultural analysis and return a structured JSON response.

You MUST respond strictly with a valid JSON object matching this schema:
{{
  "seasonal_analysis": {{
    "summary": "Detailed, professional analysis of seasonal suitability for the district and state in this season (temperature, rainfall, humidity).",
    "suitability_score": 85, // An integer between 1 and 100 representing general agricultural favorability
    "general_advice": "Practical general tips for the farmer in this season/region (e.g. soil prep, moisture conservation)."
  }},
  "recommended_crops": [
    {{
      "name": "Crop Name (e.g. Paddy (Rice))",
      "suitability_score": 95, // Integer 1-100 indicating crop suitability
      "water_need_category": "Low", // Must be one of: 'Low', 'Medium', 'High'
      "growing_period": "Duration in days/months (e.g. 100-120 days)",
      "water_suitability_explanation": "Explain how this crop matches or adapts to the farmer's water level ({data.irrigation} irrigation / {data.water_source} water source). Give actionable water management tips.",
      "why_recommended": "Specific scientific and regional reasons why it fits this soil type ({data.soil_type}), district ({data.district}), and state ({data.state}).",
      "fertilizer_recommendation": "Precise nutrient/fertilizer suggestions (e.g. Urea, DAP, Gypsum, organic manure) and timing.",
      "expected_yield": "Expected output per acre (e.g. 1.5 - 2 tons/acre or 15-20 quintals/acre)",
      "market_demand": "High" // Must be one of: 'Low', 'Medium', 'High'
    }}
  ],
  "unsuitable_crops": [
    {{
      "name": "Crop Name (e.g. Wheat)",
      "reason": "Scientific explanation of why this crop is highly risky or unsuitable for the current season ({data.season}) or irrigation level."
    }}
  ],
  "critical_warnings": [
    "Alert 1 (e.g. pest risk, heatwaves, delayed monsoon, waterlogging)",
    "Alert 2"
  ]
}}

Rules:
- Provide at least 3-5 recommended crops across different water requirement categories (Low, Medium, High) so the farmer can evaluate options based on water levels.
- Ensure the recommendations are tailored scientifically to {data.state}, {data.district}, {data.soil_type}, and {data.season}.
- Use regional Indian names alongside standard names where appropriate.
- Return ONLY the raw JSON object. Do not wrap in markdown codeblocks (e.g. ```json) or add any extra text.
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a helpful, scientific, and knowledgeable Agriculture Assistant for Indian farmers. You respond strictly in raw JSON format matching the requested schema."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.4,
        )
        import json
        result = json.loads(response.choices[0].message.content)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Serve React static files in production
frontend_path = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
