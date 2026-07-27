import json
import os
import asyncio
from typing import Dict, Any, List
from guardrails import apply_input_guardrails, apply_output_guardrails

class EvaluationRunner:
    def __init__(self, dataset_path: str):
        self.dataset_path = dataset_path
        with open(dataset_path, "r", encoding="utf-8") as f:
            self.dataset = json.load(f)

    async def run_eval_case(self, test_case: Dict[str, Any]) -> Dict[str, Any]:
        case_id = test_case["id"]
        category = test_case["category"]
        description = test_case["description"]
        inp = test_case["input"]
        exp = test_case["expected"]

        msg = inp.get("message", "")
        state_params = {
            "state": inp.get("state"),
            "district": inp.get("district"),
            "farm_size": inp.get("farm_size"),
            "previous_crop": inp.get("previous_crop")
        }

        # 1. Run Input Guardrails Evaluation
        input_guard = apply_input_guardrails(msg, state_params)

        passed = True
        reason = []
        output_text = ""

        if exp.get("should_block"):
            if input_guard.action != "block_injection":
                passed = False
                reason.append(f"Expected block_injection but got {input_guard.action}")
            else:
                output_text = input_guard.override_response or ""

        elif exp.get("should_redirect"):
            if input_guard.action != "redirect_offtopic":
                passed = False
                reason.append(f"Expected redirect_offtopic but got {input_guard.action}")
            else:
                output_text = input_guard.override_response or ""

        else:
            # Execute Agent Pipeline
            from agent import run_agri_agent
            
            mock_obs = inp.get("mock_observation")
            if mock_obs:
                # Test direct output guardrails with mock observation
                from agent import finalizer_node
                state = {
                    "message": msg,
                    "history": [],
                    "observation": mock_obs,
                    "react_steps": []
                }
                final_res = await finalizer_node(state)
                raw_answer = final_res.get("final_answer", "")
                output_guard = apply_output_guardrails(raw_answer, {"observation": mock_obs, "message": msg})
                output_text = output_guard.sanitized_answer
            else:
                res = await run_agri_agent(
                    message=msg,
                    history=[],
                    state=inp.get("state"),
                    farm_size=inp.get("farm_size"),
                    previous_crop=inp.get("previous_crop")
                )
                output_text = res.get("final_answer", "")
                output_guard = apply_output_guardrails(output_text, {"message": msg})
                output_text = output_guard.sanitized_answer

            # Validate Expectations
            if exp.get("must_contain_safety_advisory"):
                if "safety advisory" not in output_text.lower() and "safety precautions" not in output_text.lower():
                    passed = False
                    reason.append("Missing required safety advisory for chemical query")

            if exp.get("must_contain_kvk_referral"):
                if "krishi vigyan kendra" not in output_text.lower():
                    passed = False
                    reason.append("Missing required Krishi Vigyan Kendra referral for low confidence output")

            if exp.get("expected_keyword"):
                if exp["expected_keyword"].lower() not in output_text.lower():
                    passed = False
                    reason.append(f"Missing expected keyword: '{exp['expected_keyword']}'")

            if exp.get("expected_keywords"):
                for kw in exp["expected_keywords"]:
                    if kw.lower() not in output_text.lower():
                        passed = False
                        reason.append(f"Missing expected keyword: '{kw}'")

            if exp.get("required_headers"):
                for header in exp["required_headers"]:
                    header_clean = header.replace(":", "").strip().lower()
                    if header_clean not in output_text.lower():
                        passed = False
                        reason.append(f"Missing visual section header: '{header}'")

        return {
            "case_id": case_id,
            "category": category,
            "description": description,
            "passed": passed,
            "reasons": reason,
            "output_snippet": output_text[:150] + "..." if len(output_text) > 150 else output_text
        }

    async def run_all(self) -> Dict[str, Any]:
        results = []
        category_stats = {}

        for test_case in self.dataset:
            res = await self.run_eval_case(test_case)
            results.append(res)
            
            cat = res["category"]
            if cat not in category_stats:
                category_stats[cat] = {"total": 0, "passed": 0}
            category_stats[cat]["total"] += 1
            if res["passed"]:
                category_stats[cat]["passed"] += 1

        total_cases = len(results)
        passed_cases = sum(1 for r in results if r["passed"])
        overall_score = round((passed_cases / total_cases) * 100, 2) if total_cases > 0 else 0

        category_scores = {}
        for cat, stats in category_stats.items():
            category_scores[cat] = round((stats["passed"] / stats["total"]) * 100, 2)

        return {
            "overall_score_percent": overall_score,
            "total_cases": total_cases,
            "passed_cases": passed_cases,
            "failed_cases": total_cases - passed_cases,
            "category_scores": category_scores,
            "test_results": results
        }
