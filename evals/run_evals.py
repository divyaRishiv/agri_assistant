import os
import sys
import json
import asyncio

# Force stdout/stderr encoding to utf-8 if possible
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from evals.evaluator import EvaluationRunner

async def main():
    dataset_file = os.path.join(os.path.dirname(__file__), "dataset.json")
    if not os.path.exists(dataset_file):
        print(f"Error: Dataset file not found at {dataset_file}")
        sys.exit(1)

    print("==========================================================")
    print("[AGRI ASSISTANT] - EVALUATION BENCHMARK SUITE")
    print("==========================================================")
    print(f"Loading dataset: {dataset_file}\n")

    runner = EvaluationRunner(dataset_file)
    summary = await runner.run_all()

    print("----------------------------------------------------------")
    print(f"OVERALL BENCHMARK SCORE: {summary['overall_score_percent']}%")
    print(f"[PASS] Passed: {summary['passed_cases']} / {summary['total_cases']}")
    print(f"[FAIL] Failed: {summary['failed_cases']} / {summary['total_cases']}")
    print("----------------------------------------------------------")
    print("CATEGORY BREAKDOWN:")
    for cat, score in summary["category_scores"].items():
        print(f"  * {cat}: {score}%")
    print("----------------------------------------------------------")
    print("\nDETAILED TEST RESULTS:")
    for r in summary["test_results"]:
        status_icon = "[PASS]" if r["passed"] else "[FAIL]"
        print(f" [{r['case_id']}] {status_icon} | {r['category']} - {r['description']}")
        if not r["passed"]:
            for reason in r["reasons"]:
                print(f"      └─ [WARNING] {reason}")

    # Save summary report to eval_results.json
    output_report_file = os.path.join(os.path.dirname(__file__), "eval_results.json")
    with open(output_report_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"\nEvaluation report successfully saved to: {output_report_file}\n")

if __name__ == "__main__":
    asyncio.run(main())
