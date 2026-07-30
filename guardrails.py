import re
from typing import Dict, Any, Optional, List, Tuple
from pydantic import BaseModel

class InputGuardrailResult(BaseModel):
    is_safe: bool
    action: str  # "proceed", "block_injection", "redirect_offtopic", "flag_chemical"
    modified_message: Optional[str] = None
    override_response: Optional[str] = None
    warning_flag: Optional[str] = None

class OutputGuardrailResult(BaseModel):
    is_valid: bool
    sanitized_answer: str
    warnings: List[str] = []
    actions_taken: List[str] = []

# List of highly toxic, restricted, or banned pesticides in Indian agriculture
HAZARDOUS_CHEMICALS = [
    "paraquat", "monocrotophos", "endosulfan", "phorate", "methyl parathion", 
    "carbofuran", "phosphamidon", "aluminum phosphide", "ddt", "aldicarb", 
    "triazophos", "methomyl", "dichlorvos"
]

# Patterns for prompt injection and system override attacks
PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|above)\s+instructions",
    r"disregard\s+all\s+(rules|prompts|system)",
    r"you\s+are\s+now\s+(a|an)\s+",
    r"bypass\s+(safety|guardrails|filters)",
    r"system\s+prompt",
    r"act\s+as\s+a\s+hacker",
    r"dan\s+mode",
    r"jailbreak"
]

# Non-agricultural domains for scope check
OFF_TOPIC_PATTERNS = [
    r"write\s+(a\s+)?python\s+script",
    r"stock\s+(market|price|trading|crypto)",
    r"bitcoin|ethereum|nft",
    r"how\s+to\s+(hack|crack|steal)",
    r"recipe\s+for\s+cake",
    r"movie\s+recommendation",
    r"who\s+won\s+the\s+(football|cricket)\s+match",
    r"human\s+medical|heart\s+attack|fever\s+medicine\s+for\s+child"
]

def apply_input_guardrails(message: str, state: Optional[dict] = None) -> InputGuardrailResult:
    """
    Validates user input against safety, prompt injection, and domain scope rules.
    """
    if not message or not message.strip():
        return InputGuardrailResult(is_safe=True, action="proceed", modified_message=message)

    msg_lower = message.lower().strip()

    # 1. Check for Prompt Injection Attack
    for pattern in PROMPT_INJECTION_PATTERNS:
        if re.search(pattern, msg_lower):
            return InputGuardrailResult(
                is_safe=False,
                action="block_injection",
                override_response=(
                    "Namaste! 🙏 I am Kisan Mitra AI, dedicated exclusively to assisting farmers with "
                    "crop management, disease diagnosis, mandi market prices, and government schemes. "
                    "I cannot fulfill instructions to alter my system prompt or security guidelines."
                )
            )

    # 2. Check for Off-Topic / Out of Domain Queries
    agri_keywords = ["crop", "farm", "soil", "pest", "disease", "mandi", "price", "scheme", "fertilizer", "seed", "water", "irrigation", "subsidy", "kisan", "yield", "field", "harvest", "plant", "leaf", "wheat", "rice", "paddy", "cotton", "tomato"]
    has_agri_context = any(kw in msg_lower for kw in agri_keywords) or (state and (state.get("state") or state.get("previous_crop") or state.get("image_path")))

    for pattern in OFF_TOPIC_PATTERNS:
        if re.search(pattern, msg_lower) and not has_agri_context:
            return InputGuardrailResult(
                is_safe=False,
                action="redirect_offtopic",
                override_response=(
                    "Namaste! 🙏 I am Kisan Mitra AI, an intelligent agricultural assistant built for Indian farmers. "
                    "I can help you with crop disease diagnosis, organic pest control, live mandi market rates, and government agricultural schemes. "
                    "How can I assist you with your farm today?"
                )
            )

    # 3. Check for Hazardous Chemical Queries
    detected_chemicals = [chem for chem in HAZARDOUS_CHEMICALS if chem in msg_lower]
    warning_flag = None
    if detected_chemicals:
        warning_flag = f"Detected query mentioning restricted/hazardous chemical(s): {', '.join(detected_chemicals)}. Enforce safe handling & organic priority in output."

    return InputGuardrailResult(
        is_safe=True,
        action="proceed",
        modified_message=message,
        warning_flag=warning_flag
    )

def apply_output_guardrails(final_answer: str, context: Optional[dict] = None) -> OutputGuardrailResult:
    """
    Post-processes and validates generated output text for safety, formatting, and low-confidence warnings.
    """
    sanitized = final_answer
    warnings = []
    actions_taken = []
    context = context or {}

    ans_lower = sanitized.lower()
    msg_lower = (context.get("message") or "").lower()

    # 1. Hazardous Chemical Suppression & Safety Advisory
    found_in_ans = [chem for chem in HAZARDOUS_CHEMICALS if chem in ans_lower]
    found_in_msg = [chem for chem in HAZARDOUS_CHEMICALS if chem in msg_lower]
    all_found_chemicals = list(set(found_in_ans + found_in_msg))

    if all_found_chemicals:
        warning_msg = f"Referenced/Queried restricted chemical(s): {', '.join(all_found_chemicals)}."
        warnings.append(warning_msg)
        
        if "important safety advisory" not in ans_lower and "safety advisory" not in ans_lower:
            safety_disclaimer = (
                "\n\n⚠️ **IMPORTANT SAFETY ADVISORY**: "
                f"The chemical pesticide ({', '.join(all_found_chemicals).capitalize()}) is classified as highly restricted/toxic. "
                "Always prioritize bio-pesticides or neem-based organic treatments. If applying chemical control, "
                "wear full protective gear (gloves, mask, eye protection) and adhere strictly to recommended dosage guidelines."
            )
            sanitized += safety_disclaimer
            actions_taken.append("Appended hazardous chemical safety advisory")

    # 2. Low Confidence Vision Expert Escort Guard (< 70%)
    observation = context.get("observation")
    if observation and isinstance(observation, dict):
        confidence = observation.get("confidence")
        if isinstance(confidence, (int, float)) and confidence < 70:
            if "expert consultation advisory" not in ans_lower and "expert referral advisory" not in ans_lower:
                expert_disclaimer = (
                    "\n\n📢 **EXPERT CONSULTATION ADVISORY**: "
                    f"The disease diagnosis confidence is currently **{confidence}%** (below 70%). "
                    "Before applying chemical or intensive treatments, we strongly recommend showing a leaf sample "
                    "to your nearest **Krishi Vigyan Kendra (KVK)** or local District Agricultural Extension Officer."
                )
                sanitized += expert_disclaimer
                actions_taken.append("Appended low-confidence Krishi Vigyan Kendra expert referral")

    # 3. Schema & Format Compliance Guard for Disease Diagnosis
    if observation and isinstance(observation, dict):
        # Flexible check for section headers
        has_disease_header = "Detected Disease:" in sanitized
        has_confidence_header = "Confidence:" in sanitized
        has_symptoms_header = "Symptoms:" in sanitized
        has_action_header = "Recommended Action:" in sanitized or "Recommended Actions" in sanitized
        has_prevention_header = "Prevention:" in sanitized or "Prevention Measures" in sanitized

        missing = []
        if not has_disease_header: missing.append("Detected Disease:")
        if not has_confidence_header: missing.append("Confidence:")
        if not has_symptoms_header: missing.append("Symptoms:")
        if not has_action_header: missing.append("Recommended Action:")
        if not has_prevention_header: missing.append("Prevention:")

        if missing:
            warnings.append(f"Missing required visual headers in disease output: {missing}")
            actions_taken.append(f"Flagged missing visual headers: {missing}")

    # 4. Safe URL / Link Sanitizer Guard
    def sanitize_url(match):
        url = match.group(0)
        if ".gov.in" in url or "localhost" in url or "127.0.0.1" in url or "vercel.app" in url:
            return url
        return "[Official Portal]"

    sanitized_url_text = re.sub(r'https?://[^\s<"]+', sanitize_url, sanitized)
    if sanitized_url_text != sanitized:
        actions_taken.append("Sanitized untrusted external web links")
        sanitized = sanitized_url_text

    return OutputGuardrailResult(
        is_valid=True,
        sanitized_answer=sanitized,
        warnings=warnings,
        actions_taken=actions_taken
    )
