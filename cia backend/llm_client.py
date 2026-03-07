import os
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException, status

ENV_PATH = Path(__file__).resolve().with_name(".env")
load_dotenv(ENV_PATH)

HF_API_BASE_URL = os.getenv("HF_API_BASE_URL", "https://router.huggingface.co").rstrip("/")
HUGGINGFACE_API_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN", "")
REPO_ID = os.getenv("REPO_ID", "")
HF_MAX_NEW_TOKENS = int(os.getenv("HF_MAX_NEW_TOKENS", 1024))
HF_TEMPERATURE = float(os.getenv("HF_TEMPERATURE", 0.6))
HF_TIMEOUT_SECONDS = float(os.getenv("HF_TIMEOUT_SECONDS", 120))


def _build_model_url() -> str:
    base_url = HF_API_BASE_URL.rstrip("/")

    # If user provides the website URL, switch to router automatically.
    if "huggingface.co" in base_url and "router.huggingface.co" not in base_url:
        return "https://router.huggingface.co/v1/chat/completions"

    if base_url.endswith("/v1/chat/completions"):
        return base_url

    if base_url.endswith("/v1"):
        return f"{base_url}/chat/completions"

    return f"{base_url}/v1/chat/completions"


def _extract_chat_completion_text(data: object) -> str | None:
    if not isinstance(data, dict):
        return None

    choices = data.get("choices")
    if not isinstance(choices, list) or not choices:
        return None

    first_choice = choices[0]
    if not isinstance(first_choice, dict):
        return None

    message = first_choice.get("message")
    if not isinstance(message, dict):
        return None

    content = message.get("content")
    if isinstance(content, str):
        return content.strip()

    return None


def _extract_generated_text(data: object) -> str:
    chat_text = _extract_chat_completion_text(data)
    if chat_text is not None:
        return chat_text

    if isinstance(data, list) and data:
        first_item = data[0]
        if isinstance(first_item, dict) and "generated_text" in first_item:
            return str(first_item["generated_text"]).strip()

    if isinstance(data, dict):
        if "error" in data:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Hugging Face error: {data['error']}",
            )
        if "generated_text" in data:
            return str(data["generated_text"]).strip()

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="Unexpected response format from Hugging Face.",
    )


async def generate_text(
    prompt: str,
    max_tokens: int | None = None,
    temperature: float | None = None,
) -> str:
    if not HUGGINGFACE_API_TOKEN or not REPO_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Missing HUGGINGFACE_API_TOKEN or REPO_ID in backend .env.",
        )

    model_url = _build_model_url()
    headers = {"Authorization": f"Bearer {HUGGINGFACE_API_TOKEN}"}
    payload = {
        "model": REPO_ID,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": HF_TEMPERATURE if temperature is None else temperature,
        "max_tokens": HF_MAX_NEW_TOKENS if max_tokens is None else max_tokens,
    }

    try:
        async with httpx.AsyncClient(timeout=HF_TIMEOUT_SECONDS) as client:
            response = await client.post(model_url, headers=headers, json=payload)
            response.raise_for_status()
            return _extract_generated_text(response.json())
    except httpx.HTTPStatusError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Hugging Face request failed: {error.response.text}",
        ) from error
    except httpx.RequestError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not connect to Hugging Face service.",
        ) from error
