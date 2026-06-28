import os
import sys
import asyncio

# Ensure project root is in the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Reconfigure stdout to use UTF-8 (fixes Windows emoji print crash)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from agent import run_agri_agent

async def test():
    print("==================================================")
    print("Testing LangGraph Agent - Kisan Mitra AI")
    print("==================================================")
    
    # Test 1: General Greeting
    print("\n--- Test 1: General Greeting ---")
    res1 = await run_agri_agent(
        message="Namaste! How can you help me today?",
        history=[]
    )
    print("Final Answer:")
    print(res1["final_answer"])
    print("Console Steps:")
    for step in res1["react_steps"]:
        print(f"[{step['type']}] {step['content']}")
        
    # Test 2: Government Schemes / Subsidies Query
    print("\n--- Test 2: Schemes Query (Maharashtra, previous_crop=cotton) ---")
    res2 = await run_agri_agent(
        message="Is there any government subsidy available for my farm?",
        history=[],
        state="Maharashtra",
        previous_crop="Cotton",
        farm_size="5"
    )
    print("Final Answer Summary (First 200 chars):")
    print(res2["final_answer"][:200] + "...")
    print("Console Steps:")
    for step in res2["react_steps"]:
        print(f"[{step['type']}] {step['content']}")
        
    # Test 3: Mandi Prices Query
    print("\n--- Test 3: Mandi Price Query for Wheat in Punjab ---")
    res3 = await run_agri_agent(
        message="What is the current mandi price of wheat in Punjab?",
        history=[],
        state="Punjab"
    )
    print("Final Answer Summary (First 200 chars):")
    print(res3["final_answer"][:200] + "...")
    print("Console Steps:")
    for step in res3["react_steps"]:
        print(f"[{step['type']}] {step['content']}")

if __name__ == "__main__":
    asyncio.run(test())
