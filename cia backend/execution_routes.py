import httpx
from fastapi import APIRouter

from judge0_client import build_judge0_headers, execute_test_case, normalize_output
from schema import (
    ExecuteCodeRequest,
    ExecuteCodeResponse,
    ScoreSubmissionRequest,
    ScoreSubmissionResponse,
)

router = APIRouter(prefix="/code", tags=["code"])


@router.post("/run", response_model=ExecuteCodeResponse)
async def run_code(payload: ExecuteCodeRequest):
    headers = build_judge0_headers()

    async with httpx.AsyncClient(timeout=30.0) as client:
        result = await execute_test_case(
            client=client,
            source_code=payload.source_code,
            language_id=payload.language_id,
            stdin=payload.stdin,
            headers=headers,
        )

    status_data = result.get("status") or {}

    return {
        "status": str(status_data.get("description", "Unknown")),
        "status_id": status_data.get("id"),
        "stdout": result.get("stdout"),
        "stderr": result.get("stderr"),
        "compile_output": result.get("compile_output"),
        "time": result.get("time"),
        "memory": result.get("memory"),
    }


@router.post("/execute", response_model=ScoreSubmissionResponse)
async def execute_code(payload: ScoreSubmissionRequest):
    headers = build_judge0_headers()

    results: list[dict] = []
    earned_score = 0.0
    max_score = sum(case.weight for case in payload.test_cases)

    async with httpx.AsyncClient(timeout=30.0) as client:
        for index, test_case in enumerate(payload.test_cases, start=1):
            result = await execute_test_case(
                client=client,
                source_code=payload.source_code,
                language_id=payload.language_id,
                stdin=test_case.input,
                headers=headers,
            )

            status_data = result.get("status") or {}
            status_id = status_data.get("id")
            status_description = str(status_data.get("description", "Unknown"))

            actual_output = result.get("stdout") or ""
            is_output_correct = normalize_output(actual_output) == normalize_output(test_case.expected_output)
            passed = status_id == 3 and is_output_correct

            case_score = round(test_case.weight, 2) if passed else 0.0
            earned_score += case_score

            results.append(
                {
                    "test_case_number": index,
                    "passed": passed,
                    "score": case_score,
                    "status": status_description,
                    "expected_output": test_case.expected_output,
                    "actual_output": actual_output,
                    "stderr": result.get("stderr"),
                    "compile_output": result.get("compile_output"),
                    "time": result.get("time"),
                    "memory": result.get("memory"),
                }
            )

    passed_count = sum(1 for result in results if result["passed"])
    total_score = round((earned_score / max_score) * 100, 2) if max_score > 0 else 0.0

    return {
        "message": "Scoring completed",
        "total_score": total_score,
        "earned_score": round(earned_score, 2),
        "max_score": round(max_score, 2),
        "passed_count": passed_count,
        "total_count": len(results),
        "results": results,
    }
