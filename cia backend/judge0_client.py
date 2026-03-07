import asyncio
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException, status

ENV_PATH = Path(__file__).resolve().with_name(".env")
load_dotenv(ENV_PATH)

JUDGE0_API_URL = os.getenv("JUDGE0_API_URL", "https://ce.judge0.com").rstrip("/")
JUDGE0_API_KEY = os.getenv("JUDGE0_API_KEY", "")
JUDGE0_API_HOST = os.getenv("JUDGE0_API_HOST", "")
JUDGE0_AUTH_TOKEN = os.getenv("JUDGE0_AUTH_TOKEN", "")
JUDGE0_AUTH_USER = os.getenv("JUDGE0_AUTH_USER", "")
JUDGE0_POLL_INTERVAL_SECONDS = float(os.getenv("JUDGE0_POLL_INTERVAL_SECONDS", 1.0))
JUDGE0_MAX_POLL_ATTEMPTS = int(os.getenv("JUDGE0_MAX_POLL_ATTEMPTS", 10))


def build_judge0_headers() -> dict[str, str]:
    headers: dict[str, str] = {"Accept": "application/json"}

    if JUDGE0_AUTH_TOKEN:
        headers["X-Auth-Token"] = JUDGE0_AUTH_TOKEN

    if JUDGE0_AUTH_USER:
        headers["X-Auth-User"] = JUDGE0_AUTH_USER

    if JUDGE0_API_KEY:
        headers["X-RapidAPI-Key"] = JUDGE0_API_KEY

    if JUDGE0_API_HOST:
        headers["X-RapidAPI-Host"] = JUDGE0_API_HOST

    return headers


def normalize_output(value: str | None) -> str:
    if value is None:
        return ""

    return value.replace("\r\n", "\n").strip()


async def execute_test_case(
    client: httpx.AsyncClient,
    source_code: str,
    language_id: int,
    stdin: str,
    headers: dict[str, str],
) -> dict:
    payload = {
        "source_code": source_code,
        "language_id": language_id,
        "stdin": stdin,
    }

    try:
        submission_response = await client.post(
            f"{JUDGE0_API_URL}/submissions",
            params={"base64_encoded": "false", "wait": "false"},
            json=payload,
            headers=headers,
        )
        submission_response.raise_for_status()

        token = submission_response.json().get("token")
        if not token:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Judge0 did not return a submission token.",
            )

        for _ in range(JUDGE0_MAX_POLL_ATTEMPTS):
            result_response = await client.get(
                f"{JUDGE0_API_URL}/submissions/{token}",
                params={"base64_encoded": "false"},
                headers=headers,
            )
            result_response.raise_for_status()
            result_data = result_response.json()

            status_data = result_data.get("status") or {}
            status_id = status_data.get("id")

            if status_id not in (1, 2):
                return result_data

            await asyncio.sleep(JUDGE0_POLL_INTERVAL_SECONDS)

        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Code execution timed out while waiting for Judge0.",
        )
    except httpx.HTTPStatusError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Judge0 request failed: {error.response.text}",
        ) from error
    except httpx.RequestError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not connect to Judge0 service.",
        ) from error
