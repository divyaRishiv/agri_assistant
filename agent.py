import os
import json
import datetime
from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, START, END

# Define AgentState schema
class AgentState(TypedDict):
    message: str                  # User input message
    history: List[Dict[str, str]] # Chat history list
    email: Optional[str]          # Farmer email
    state: Optional[str]          # State
    district: Optional[str]       # District
    farm_size: Optional[str]      # Farm size (acres)
    previous_crop: Optional[str]  # Previous crop
    soil_type: Optional[str]      # Soil type
    irrigation: Optional[str]     # Irrigation level
    water_source: Optional[str]   # Water source rating
    
    # Files/Upload details
    image_path: Optional[str]
    image_filename: Optional[str]
    image_url: Optional[str]
    
    # Internal agent steps & outputs
    react_steps: List[Dict[str, Any]]
    observation: Optional[Dict[str, Any]]
    retrieved_schemes: Optional[List[Dict[str, Any]]]
    mandi_prices: Optional[List[Dict[str, Any]]]
    
    final_answer: str             # Synthesized response text

# Router edge conditional function
def route_query(state: AgentState) -> str:
    # 1. Image upload implies disease classification request
    if state.get("image_path"):
        return "diagnose_disease"
    
    message = state.get("message", "")
    if not message:
        return "general_chat"
        
    msg_lower = message.lower()
    
    # 2. Keywords routing for Government schemes/subsidies
    scheme_keywords = [
        "subsidy", "subsidies", "scheme", "government", "pm-kisan", 
        "insurance", "financial aid", "pmfby", "yojana", "help", 
        "incentive", "benefit", "grant", "pension"
    ]
    if any(kw in msg_lower for kw in scheme_keywords):
        return "retrieve_schemes"
        
    # 3. Keywords routing for Mandi pricing
    mandi_keywords = [
        "price", "prices", "rate", "rates", "mandi", "market", 
        "cost", "worth", "selling", "bazaar", "price list"
    ]
    if any(kw in msg_lower for kw in mandi_keywords):
        return "retrieve_mandi_prices"
        
    # Default to general advice/conversational chat
    return "general_chat"

# Node for disease diagnosis
async def diagnose_disease_node(state: AgentState) -> Dict[str, Any]:
    steps = list(state.get("react_steps", []))
    steps.append({
        "type": "thought",
        "content": "Reasoning: The farmer has uploaded an image of a crop leaf/plant. I need to invoke the disease detection model tool to identify the crop type, disease name, confidence score, symptoms, and potential treatment actions."
    })
    
    image_filename = state.get("image_filename") or "leaf.jpg"
    steps.append({
        "type": "tool_call",
        "content": f"Tool Call: disease_detection_model.detect_crop_disease(image='{image_filename}')"
    })
    
    # Run vision model diagnosis
    from main import detect_disease_via_vision
    image_path = state.get("image_path")
    observation = detect_disease_via_vision(image_path, image_filename)
    
    steps.append({
        "type": "observation",
        "content": f"Observation: Disease model returned result.\nCrop: {observation.get('crop')}\nDetected Disease: {observation.get('disease')}\nConfidence: {observation.get('confidence')}%\nSymptoms: {observation.get('symptoms')}"
    })
    
    steps.append({
        "type": "thought",
        "content": f"Reasoning: The tool successfully identified {observation.get('crop')} {observation.get('disease')} ({observation.get('confidence')}% confidence). I will now formulate a friendly, clear explanation with recommended actions focusing on organic solutions, and prevention measures."
    })
    
    # Save chat memory if email is provided
    email = state.get("email")
    if email and email.strip():
        try:
            cleaned_email = email.strip().lower()
            memory_file = os.path.join(os.path.dirname(__file__), "uploads", "chat_memory.json")
            memory_db = {}
            if os.path.exists(memory_file):
                with open(memory_file, "r", encoding="utf-8") as f:
                    memory_db = json.load(f)
            memory_db[cleaned_email] = {
                "last_crop": observation.get('crop'),
                "last_disease": observation.get('disease'),
                "timestamp": datetime.datetime.now().isoformat()
            }
            os.makedirs(os.path.dirname(memory_file), exist_ok=True)
            with open(memory_file, "w", encoding="utf-8") as f:
                json.dump(memory_db, f, indent=2)
        except Exception as e:
            print(f"Error saving chat memory in diagnose_disease_node: {e}")

    return {
        "observation": observation,
        "react_steps": steps,
        "image_url": f"/uploads/{image_filename}" if state.get("image_filename") else None
    }

# Node for scheme retrieval
async def retrieve_schemes_node(state: AgentState) -> Dict[str, Any]:
    steps = list(state.get("react_steps", []))
    steps.append({
        "type": "thought",
        "content": f"Reasoning: The farmer is asking about subsidies or government schemes. I need to retrieve relevant agricultural schemes matching their profile (State: '{state.get('state') or 'Any'}', Previous Crop: '{state.get('previous_crop') or 'Any'}', Farm Size: {state.get('farm_size') or 'Any'} acres)."
    })
    
    args_str = f"state='{state.get('state') or ''}', crop='{state.get('previous_crop') or ''}', farm_size='{state.get('farm_size') or ''}'"
    steps.append({
        "type": "tool_call",
        "content": f"Tool Call: government_schemes_db.retrieve_eligible_schemes({args_str})"
    })
    
    from main import retrieve_eligible_schemes
    retrieved = retrieve_eligible_schemes(
        state=state.get("state"),
        crop=state.get("previous_crop"),
        farm_size=state.get("farm_size"),
        query=state.get("message")
    )
    
    scheme_names = [s.get("name") for s in retrieved]
    steps.append({
        "type": "observation",
        "content": f"Observation: Retrieved {len(retrieved)} eligible schemes: {', '.join(scheme_names) if scheme_names else 'None found matching demographic criteria.'}"
    })
    
    steps.append({
        "type": "thought",
        "content": "Reasoning: I will now present the retrieved schemes (eligibility, benefits, application process) to the farmer in a simplified, supportive format, explaining how they apply to their specific farm size and location."
    })
    
    return {
        "retrieved_schemes": retrieved,
        "react_steps": steps
    }

# Node for Mandi price retrieval
async def retrieve_mandi_prices_node(state: AgentState) -> Dict[str, Any]:
    steps = list(state.get("react_steps", []))
    from main import MANDI_DATA, get_market_prices
    
    message = state.get("message", "")
    target_state = state.get("state")
    
    # Check if user mentioned a specific state in their message
    for s in MANDI_DATA.keys():
        if s.lower() in message.lower():
            target_state = s
            break
            
    steps.append({
        "type": "thought",
        "content": f"Reasoning: The farmer is inquiring about mandi market prices. I will retrieve mandi prices for state: '{target_state or 'All India'}'."
    })
    
    steps.append({
        "type": "tool_call",
        "content": f"Tool Call: mandi_market_prices.get_market_prices(state='{target_state or ''}')"
    })
    
    prices_data = await get_market_prices(target_state)
    prices = prices_data.get("prices", [])
    
    # Filter by crop if mentioned in message using word boundaries to avoid matching "rice" in "price"
    import re
    crop_keywords = [
        "paddy", "rice", "wheat", "cotton", "maize", "sugarcane", 
        "soybean", "soyabean", "mustard", "onion", "tomato", "potato", 
        "chana", "chickpea", "chilli", "coconut", "tapioca"
    ]
    mentioned_crop = None
    for ck in crop_keywords:
        pattern = r"\b" + re.escape(ck) + r"\b"
        if re.search(pattern, message.lower()):
            mentioned_crop = ck
            break
            
    filtered_prices = prices
    if mentioned_crop:
        # Standardize soybean vs soyabean
        c_clean = "soyabean" if mentioned_crop == "soybean" else mentioned_crop
        filtered_prices = [
            p for p in prices 
            if c_clean in p.get("crop", "").lower() or 
            (c_clean == "rice" and "paddy" in p.get("crop", "").lower()) or
            (c_clean == "paddy" and "rice" in p.get("crop", "").lower())
        ]
        if not filtered_prices:
            filtered_prices = prices
            
    # Limit output to 6 entries to avoid console spam
    filtered_prices = filtered_prices[:6]
    
    prices_desc = [f"- {p.get('crop')} at {p.get('mandi')} Mandi: ₹{p.get('modal_price')}/{p.get('unit')} (Trend: {p.get('trend')})" for p in filtered_prices]
    
    steps.append({
        "type": "observation",
        "content": f"Observation: Found {len(prices)} mandi price records. Showing relevant updates:\n" + ("\n".join(prices_desc) if prices_desc else "No pricing matches found.")
    })
    
    steps.append({
        "type": "thought",
        "content": "Reasoning: I will summarize the current mandi rates for these crops, explaining whether they are trending up or down, and offering selling recommendations."
    })
    
    return {
        "mandi_prices": filtered_prices,
        "react_steps": steps
    }

# Node for general conversation
async def general_chat_node(state: AgentState) -> Dict[str, Any]:
    steps = list(state.get("react_steps", []))
    steps.append({
        "type": "thought",
        "content": "Reasoning: The farmer's question is general in nature. I will call the language model to answer the query directly using simple, agriculture-friendly recommendations."
    })
    return {
        "react_steps": steps
    }

# Node for output compilation
async def finalizer_node(state: AgentState) -> Dict[str, Any]:
    from main import client as openai_client, get_local_chat_response
    
    observation = state.get("observation")
    retrieved_schemes = state.get("retrieved_schemes")
    mandi_prices = state.get("mandi_prices")
    message = state.get("message", "")
    history = state.get("history", [])
    email = state.get("email")
    
    # Retrieve previous crop/disease memory context
    memory_context = ""
    if email and email.strip():
        try:
            cleaned_email = email.strip().lower()
            memory_file = os.path.join(os.path.dirname(__file__), "uploads", "chat_memory.json")
            if os.path.exists(memory_file):
                with open(memory_file, "r", encoding="utf-8") as f:
                    memory_db = json.load(f)
                user_mem = memory_db.get(cleaned_email)
                if user_mem:
                    memory_context = f"\nNote: The farmer's crop previously suffered from {user_mem.get('last_disease')} on {user_mem.get('last_crop')}. If relevant or asked, feel free to reference this history to provide a highly personalized, contextual experience."
        except Exception:
            pass

    # Determine prompt path based on populated states
    if observation:
        actions_str = "\n".join([f"- {action}" for action in observation.get('recommended_action', [])])
        prevention_str = "\n".join([f"- {prev}" for prev in observation.get('prevention', [])])
        
        sys_prompt = f"""
You are Kisan Mitra AI, a warm, helpful, and scientific Agriculture Assistant for Indian farmers. 
A farmer has uploaded an image of a crop leaf and the disease detection tool returned this result:
{json.dumps(observation, indent=2)}
{memory_context}

Explain these results to the farmer in simple, friendly, conversational language.

Communication & Prompt Engineering Rules:
1. Keep responses short and easy to understand.
2. Use warm, agriculture-friendly, and simple language.
3. Focus heavily on organic, safe, and natural treatments. Do NOT provide unsafe chemical pesticide recommendations.
4. If the confidence score is below 70%, recommend consulting a local agriculture expert.
5. You MUST include the details in this exact visual format in your response:

Detected Disease: {observation.get('crop')} - {observation.get('disease')}
Confidence: {observation.get('confidence')}%
Symptoms: {observation.get('symptoms')}

Recommended Action:
{actions_str}

Prevention:
{prevention_str}

Follow up with a supportive message telling them they can ask any questions about this disease, treatment, or precautions!
"""
    elif retrieved_schemes is not None:
        schemes_context = ""
        for i, s in enumerate(retrieved_schemes, 1):
            schemes_context += (
                f"\nScheme {i}: {s.get('name')}\n"
                f"- Type: {s.get('type')}\n"
                f"- Description: {s.get('description')}\n"
                f"- Benefits: {s.get('benefits')}\n"
                f"- Eligibility: {s.get('eligibility', {}).get('details')}\n"
                f"- How to Apply: {s.get('application_process')}\n"
            )
            
        sys_prompt = f"""
You are Kisan Mitra AI, a warm, helpful, and scientific Agriculture Assistant for Indian farmers.
The farmer is asking about subsidies, schemes, or financial aid they are eligible for.
{memory_context}

We have retrieved the following eligible government schemes matching their farm profile:
- Selected State: {state.get('state') or 'Not specified'}
- Selected District: {state.get('district') or 'Not specified'}
- Farm Size: {state.get('farm_size') or 'Not specified'} acres
- Previous Crop: {state.get('previous_crop') or 'Not specified'}

Retrieved Schemes:
{schemes_context if retrieved_schemes else "No schemes matched the specific criteria. However, general national schemes like PM-KISAN, PMFBY (Crop Insurance), and PMKSY are generally available."}

Communication & Prompt Engineering Rules:
1. Explain the eligible schemes to the farmer in a simple, friendly, and structured layout.
2. Clearly highlight:
   - What the scheme is
   - The specific benefits (money, pump subsidy, etc.)
   - Who qualifies (specifically reference their state '{state.get('state')}' and farm size '{state.get('farm_size')}' to show how they fit the criteria)
   - Step-by-step instructions on how they can apply
3. Keep the tone very encouraging, supportive, and agricultural.
4. If they haven't provided a state, district, or farm size, advise them that they can fill in their farm advisor form on the left to get a highly customized local list of subsidies.
"""
    elif mandi_prices is not None:
        prices_context = ""
        for p in mandi_prices:
            prices_context += (
                f"- **{p.get('crop')}** in **{p.get('mandi')} Mandi, {p.get('state')}**:\n"
                f"  • Modal Price: ₹{p.get('modal_price')}/{p.get('unit')} (Range: ₹{p.get('min_price')} - ₹{p.get('max_price')})\n"
                f"  • Daily Trend: {p.get('change_percent')}% ({p.get('trend')})\n"
            )
            
        sys_prompt = f"""
You are Kisan Mitra AI, a warm, helpful, and scientific Agriculture Assistant for Indian farmers.
The farmer is asking about live mandi market prices or crop rates.
{memory_context}

Here are the latest mandi market price details retrieved:
{prices_context if mandi_prices else "No pricing matches found. Please make sure the state is selected in the form."}

Communication & Prompt Engineering Rules:
1. Present these market prices in a clear, friendly, and supportive agricultural format.
2. Highlight modal rates, the price range (min to max), and highlight positive daily trends (e.g. if price is up, congratulate them).
3. Offer helpful suggestions (e.g. if prices are low, mention standard storage options, or if high, suggests selling options).
4. Encourage them to verify local mandi rates before selling.
"""
    else:
        sys_prompt = f"""
You are Kisan Mitra AI, a warm, helpful, and scientific Agriculture Assistant for Indian farmers.
Answer the farmer's question in a simple, friendly, and easy-to-understand conversational language.
{memory_context}

Prompt Engineering & Communication Rules:
1. Keep responses short and direct. Avoid complex scientific terminology.
2. Use agriculture-friendly language.
3. Recommend organic and safe solutions. Do NOT suggest unsafe chemical pesticides.
4. Be supportive and encourage the farmer in their work.
"""

    messages = [{"role": "system", "content": sys_prompt}]
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    
    if message:
        messages.append({"role": "user", "content": message})
    elif state.get("image_path") and not message:
        messages.append({"role": "user", "content": "Analyze this uploaded image and tell me about any diseases and how to treat them."})

    try:
        response = openai_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.4,
        )
        final_answer = response.choices[0].message.content
    except Exception as e:
        print(f"Groq API failed in finalizer_node: {e}. Using local fallback chat engine...")
        if retrieved_schemes is not None:
            final_answer = get_local_chat_response(message or "", observation, retrieved_schemes)
        elif mandi_prices is not None:
            # Local fallback formatting for mandi prices
            prices_str = ""
            for p in mandi_prices:
                prices_str += (
                    f"  • **{p.get('crop')}** in **{p.get('mandi')} Mandi, {p.get('state')}**: ₹{p.get('modal_price')}/{p.get('unit')} ({p.get('trend')} trend)\n"
                )
            final_answer = (
                f"Namaste! 🙏 Here are the latest mandi market prices I retrieved for you:\n\n"
                f"{prices_str}\n"
                f"I hope this helps you get the best rates for your harvest! 🌾 Please note that these rates can vary daily. Let me know if you want to look up prices for other states."
            )
        else:
            final_answer = get_local_chat_response(message or "", observation)

    return {
        "final_answer": final_answer
    }

# Build and Compile the StateGraph Workflow
workflow = StateGraph(AgentState)

# Add Nodes
workflow.add_node("diagnose_disease", diagnose_disease_node)
workflow.add_node("retrieve_schemes", retrieve_schemes_node)
workflow.add_node("retrieve_mandi_prices", retrieve_mandi_prices_node)
workflow.add_node("general_chat", general_chat_node)
workflow.add_node("finalizer", finalizer_node)

# Add Entry Router Conditional Edge
workflow.add_conditional_edges(
    START,
    route_query,
    {
        "diagnose_disease": "diagnose_disease",
        "retrieve_schemes": "retrieve_schemes",
        "retrieve_mandi_prices": "retrieve_mandi_prices",
        "general_chat": "general_chat"
    }
)

# Connect Nodes to finalizer
workflow.add_edge("diagnose_disease", "finalizer")
workflow.add_edge("retrieve_schemes", "finalizer")
workflow.add_edge("retrieve_mandi_prices", "finalizer")
workflow.add_edge("general_chat", "finalizer")

# End transition
workflow.add_edge("finalizer", END)

# Compile the graph
compiled_graph = workflow.compile()

# Public execution function
async def run_agri_agent(
    message: Optional[str],
    history: List[Dict[str, str]],
    email: Optional[str] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    farm_size: Optional[str] = None,
    previous_crop: Optional[str] = None,
    soil_type: Optional[str] = None,
    irrigation: Optional[str] = None,
    water_source: Optional[str] = None,
    image_path: Optional[str] = None,
    image_filename: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes the Kisan Mitra LangGraph state machine workflow.
    """
    initial_state: AgentState = {
        "message": message or "",
        "history": history,
        "email": email,
        "state": state,
        "district": district,
        "farm_size": farm_size,
        "previous_crop": previous_crop,
        "soil_type": soil_type,
        "irrigation": irrigation,
        "water_source": water_source,
        "image_path": image_path,
        "image_filename": image_filename,
        "image_url": None,
        "react_steps": [],
        "observation": None,
        "retrieved_schemes": None,
        "mandi_prices": None,
        "final_answer": ""
    }
    
    # Run the graph asynchronously
    result = await compiled_graph.ainvoke(initial_state)
    
    return {
        "image_url": result.get("image_url"),
        "react_steps": result.get("react_steps", []),
        "final_answer": result.get("final_answer", ""),
        "disease_details": result.get("observation")
    }
