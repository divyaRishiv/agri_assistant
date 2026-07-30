import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from agent import run_agri_agent

async def test():
    img_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "unclear_leaf_low_confidence.jpg")
    print(f"Testing with image path: {img_path}")
    
    res = await run_agri_agent(
        message="",
        history=[],
        image_path=img_path,
        image_filename="temp_uuid_123.jpg",
        original_filename="unclear_leaf_low_confidence.jpg"
    )
    
    answer = res.get("final_answer", "")
    obs = res.get("disease_details", {})
    
    print("\n--- TEST RESULT ---")
    print("Detected Disease:", obs.get("crop"), "-", obs.get("disease"))
    print("Confidence:", obs.get("confidence"))
    print("Contains Expert Advisory:", "EXPERT CONSULTATION ADVISORY" in answer or "Krishi Vigyan Kendra" in answer)
    print("\nFull Response Output:\n")
    print(answer)

if __name__ == "__main__":
    asyncio.run(test())
