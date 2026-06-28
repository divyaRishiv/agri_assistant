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
    email: Optional[str] = "",
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
        email: Farmer's email address to receive the PDF report (optional)
        farm_size: Farm size in acres (optional)
        previous_crop: Previously cultivated crop in the farm (optional)
    """
    # Create the FarmData schema object
    data = FarmData(
        email=email or "",
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
async def chat_with_agri_assistant(
    message: str, 
    disease_observation_json: Optional[str] = None,
    state: Optional[str] = None,
    previous_crop: Optional[str] = None,
    farm_size: Optional[str] = None
) -> str:
    """
    Chat with Kisan Mitra AI to seek crop health advice, organic treatment, government schemes, or mandi prices.
    
    Args:
        message: The farmer's question or message
        disease_observation_json: Optional JSON string of the diagnosed disease details to provide context
        state: Optional Indian state (e.g. Maharashtra, Punjab) to check for schemes or mandi rates
        previous_crop: Optional crop type (e.g. Wheat) to personalize schemes
        farm_size: Optional farm size in acres to calculate eligibility
    """
    import json
    observation = None
    if disease_observation_json:
        try:
            observation = json.loads(disease_observation_json)
        except Exception:
            pass
            
    from agent import run_agri_agent
    try:
        result = await run_agri_agent(
            message=message,
            history=[],
            state=state,
            previous_crop=previous_crop or (observation.get("crop") if observation else None),
            farm_size=farm_size
        )
        return result.get("final_answer", "")
    except Exception as e:
        return f"Error running LangGraph agent: {str(e)}"


if __name__ == "__main__":
    # Start FastMCP server in standard stdio mode
    mcp.run()
