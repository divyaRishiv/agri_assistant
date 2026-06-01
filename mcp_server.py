import os
import sys
import asyncio
from typing import Optional
from mcp.server.fastmcp import FastMCP

# Add parent directory to path to ensure imports work correctly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import (
    FarmData,
    recommend_crops,
    get_market_prices,
    detect_disease_via_vision,
    client as openai_client,
    get_local_chat_response
)

# Initialize MCP Server
mcp = FastMCP("Kisan Mitra Agriculture Assistant")

@mcp.tool()
async def get_crop_recommendations(
    state: str,
    district: str,
    soil_type: str,
    season: str,
    irrigation: str,
    water_source: str,
    farm_size: Optional[str] = "",
    previous_crop: Optional[str] = ""
) -> str:
    """
    Get customized crop recommendations for an Indian farm based on geographical and soil attributes.
    
    Args:
        state: Indian State name (e.g. Maharashtra, Punjab)
        district: District name within the selected state
        soil_type: Type of soil (e.g. Black Soil, Alluvial Soil, Red Soil)
        season: Cropping season (Kharif, Rabi, Zaid)
        irrigation: Irrigation availability level (Rain-fed, Low, Medium, High)
        water_source: Water source availability level (1 for Very Low to 5 for Very High)
        farm_size: Farm size in acres (optional)
        previous_crop: Previously cultivated crop in the farm (optional)
    """
    # Create the FarmData schema object
    data = FarmData(
        state=state,
        district=district,
        soil_type=soil_type,
        season=season,
        irrigation=irrigation,
        water_source=water_source,
        farm_size=farm_size,
        previous_crop=previous_crop
    )
    
    recommendation = await recommend_crops(data)
    
    import json
    return json.dumps(recommendation, indent=2)


@mcp.tool()
async def get_mandi_prices(state: Optional[str] = None) -> str:
    """
    Get the latest government mandi market crop prices, min/max/modal rates, and price trends.
    
    Args:
        state: Optional Indian state name to filter prices (e.g. Maharashtra, Punjab)
    """
    prices_data = await get_market_prices(state)
    
    import json
    return json.dumps(prices_data, indent=2)


@mcp.tool()
def detect_crop_disease(image_path: str) -> str:
    """
    Diagnose crop diseases from a plant leaf image path.
    
    Args:
        image_path: Absolute or relative local path to the leaf image file
    """
    if not os.path.exists(image_path):
        return f"Error: Image path '{image_path}' does not exist on disk."
        
    filename = os.path.basename(image_path)
    result = detect_disease_via_vision(image_path, filename)
    
    import json
    return json.dumps(result, indent=2)


@mcp.tool()
def chat_with_agri_assistant(message: str, disease_observation_json: Optional[str] = None) -> str:
    """
    Chat with Kisan Mitra AI to seek crop health advice, organic treatment, or agricultural precautions.
    
    Args:
        message: The farmer's question or message
        disease_observation_json: Optional JSON string of the diagnosed disease details to provide context
    """
    observation = None
    if disease_observation_json:
        try:
            import json
            observation = json.loads(disease_observation_json)
        except Exception:
            pass
            
    # Try calling the standard OpenAI client first, fall back to local rule engine
    sys_prompt = "You are Kisan Mitra AI, a warm, helpful, and scientific Agriculture Assistant for Indian farmers. Answer the farmer's question in a simple, friendly, and easy-to-understand conversational language."
    
    if observation:
        actions_str = "\n".join([f"- {action}" for action in observation.get('recommended_action', [])])
        prevention_str = "\n".join([f"- {prev}" for prev in observation.get('prevention', [])])
        
        sys_prompt = f"""
You are Kisan Mitra AI, a warm, helpful, and scientific Agriculture Assistant for Indian farmers. 
A farmer has uploaded an image of a crop leaf and the disease detection tool returned this result:
{json.dumps(observation, indent=2)}

Explain these results to the farmer in simple, friendly, conversational language.
Rules:
1. Keep responses short and easy to understand.
2. Focus heavily on organic, safe, and natural treatments.
3. Include standard visual blocks for Detected Disease, Confidence, Symptoms, Recommended Action, and Prevention.
"""
    
    messages = [
        {"role": "system", "content": sys_prompt},
        {"role": "user", "content": message}
    ]
    
    try:
        response = openai_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.4,
        )
        return response.choices[0].message.content
    except Exception:
        return get_local_chat_response(message, observation)


if __name__ == "__main__":
    # Start FastMCP server in standard stdio mode
    mcp.run()
