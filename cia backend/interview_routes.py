import json
import re
from typing import Any
from datetime import datetime

from fastapi import APIRouter, HTTPException, status, Depends

from llm_client import generate_text
from schema import (
    GenerateFeedbackRequest,
    GenerateFeedbackResponse,
    GenerateQuestionsResponse,
    InterviewSessionCreate,
    InterviewSessionResponse,
    DashboardResponse,
    GenerateHintRequest,
    GenerateHintResponse,
    GenerateSolutionRequest,
    GenerateSolutionResponse,
    InterviewSessionSummary,
)

router = APIRouter(prefix="/interview", tags=["interview"])

# database dependency imported from authentication module to keep things simple
from authentication import get_db
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import InterviewSession, QuestionFeedback


DIFFICULTY_ORDER = ["Easy", "Easy", "Medium", "Medium", "Hard"]
QUESTION_MAX_TOKENS_PRIMARY = 2600
QUESTION_MAX_TOKENS_RETRY = 3400

QUESTION_GENERATION_PROMPT = """
You are a senior technical interviewer.

Generate EXACTLY 5 different DSA coding questions.
Distribution must be:
1) Easy
2) Easy
3) Medium
4) Medium
5) Hard

Return ONLY valid JSON.
Do not include markdown, prose, explanations, or code fences.
JSON schema:
{
  "questions": [
    {
      "title": "string",
      "difficulty": "Easy | Medium | Hard",
      "problem_statement": "string",
      "input_format": "string",
      "output_format": "string",
      "sample_input": "string",
      "sample_output": "string",
      "constraints": ["string", "string"],
      "tags": ["string", "string"],
      "hint": "string",
      "test_cases": [
        {"input": "string", "expected_output": "string"}
      ]
    }
  ]
}

Rules:
- questions length must be exactly 5
- each question should contain at least 4 test_cases
- test cases must match the question statement
- keep titles concise and unique
- do NOT include solutions
"""

QUESTION_GENERATION_RETRY_PROMPT = """
Return ONLY valid minified JSON in this exact format:
{"questions":[{"title":"...","difficulty":"Easy|Medium|Hard","problem_statement":"...","input_format":"...","output_format":"...","sample_input":"...","sample_output":"...","constraints":["..."],"tags":["..."],"hint":"...","test_cases":[{"input":"...","expected_output":"..."}]}]}

Generate exactly 5 DSA questions in order:
1 Easy, 2 Easy, 3 Medium, 4 Medium, 5 Hard.

Keep each field concise:
- title under 8 words
- problem_statement under 45 words
- hint under 20 words
- one sample and at least one test case per question

No markdown. No backticks. No extra keys. No explanation text.
"""

FEEDBACK_PROMPT_TEMPLATE = """
You are an AI interview evaluator.

The candidate scored {score} out of 50.

Performance scale:
- 40 to 50: Excellent
- 30 to 39: Good
- 20 to 29: Average
- Below 20: Needs Improvement

Generate:
1. Overall Summary
2. Improvement Plan
3. Final Verdict

Be realistic and professional. Keep the response in clear bullet points.
"""

HINT_GENERATION_PROMPT_TEMPLATE = """
You are an AI coding assistant.

Generate a helpful hint for this coding problem:

Question: {question_title}
Difficulty: {difficulty}
Problem: {question_statement}

The candidate has attempted this question {attempts} times without solving it.

Provide a concise hint (2-3 sentences) that:
- Points toward the right approach without giving away the solution
- Mentions relevant concepts or techniques
- Is encouraging but not too revealing

Keep the hint under 150 characters.
"""

SOLUTION_GENERATION_PROMPT_TEMPLATE = """
You are an AI coding assistant.

Generate a beginner-friendly solution for this coding problem:

Question: {question_title}
Difficulty: {difficulty}
Problem: {question_statement}

The candidate has attempted this question {attempts} times without solving it.

Generate a simple, beginner-level solution that:
- Uses basic programming concepts and simple logic
- Avoids advanced data structures or complex algorithms unless absolutely necessary
- Does NOT use classes or object-oriented programming
- Uses only basic control structures (if/else, loops, functions)
- Includes clear comments explaining the approach
- Is easy for a beginner to understand and follow
- Provide a complete solution in Python that reads from standard input and writes to standard output
- Include a solve() function and a small main/driver that reads stdin and prints the result
- Parse input robustly: testcases may include brackets, commas, or extra spaces (e.g., "[2, 7, 11, 15], 9").
- Use a regex-based integer parser to extract all numbers from stdin, and interpret the last number as the target.

The solution should be practical and correct, focusing on clarity over optimization.
"""


def _strip_code_fences(value: str) -> str:
    cleaned = value.strip()
    cleaned = re.sub(r"^```[a-zA-Z0-9_-]*\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def _normalize_text(value: Any) -> str:
    return str(value or "").replace("\r\n", "\n").strip()

def _normalize_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    normalized: list[str] = []
    for item in value:
        text = _normalize_text(item)
        if text:
            normalized.append(text)
    return normalized


def _normalize_difficulty(value: Any, index: int) -> str:
    raw = _normalize_text(value).lower()
    if "easy" in raw:
        return "Easy"
    if "medium" in raw:
        return "Medium"
    if "hard" in raw:
        return "Hard"
    return DIFFICULTY_ORDER[index] if index < len(DIFFICULTY_ORDER) else "Medium"


def _extract_json_candidates(raw_text: str) -> list[str]:
    text = _strip_code_fences(raw_text)
    candidates: list[str] = []

    if text:
        candidates.append(text)

    object_start = text.find("{")
    object_end = text.rfind("}")
    if object_start != -1 and object_end != -1 and object_end > object_start:
        candidates.append(text[object_start : object_end + 1])

    array_start = text.find("[")
    array_end = text.rfind("]")
    if array_start != -1 and array_end != -1 and array_end > array_start:
        candidates.append(text[array_start : array_end + 1])

    unique_candidates: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        normalized = candidate.strip()
        if normalized and normalized not in seen:
            unique_candidates.append(normalized)
            seen.add(normalized)
    return unique_candidates


def _load_json_payload(raw_text: str) -> Any:
    for candidate in _extract_json_candidates(raw_text):
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="Question generator did not return valid JSON.",
    )


def _extract_question_list(payload: Any) -> list[dict[str, Any]]:
    raw_questions: Any = None

    if isinstance(payload, list):
        raw_questions = payload
    elif isinstance(payload, dict):
        raw_questions = payload.get("questions")
        if isinstance(raw_questions, str):
            try:
                raw_questions = json.loads(raw_questions)
            except json.JSONDecodeError as error:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Question list string is not valid JSON: {error.msg}",
                ) from error

    if not isinstance(raw_questions, list):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Question generator JSON must include a 'questions' array.",
        )

    if len(raw_questions) != 5:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Question generator must return exactly 5 questions, got {len(raw_questions)}.",
        )

    normalized: list[dict[str, Any]] = []
    for index, item in enumerate(raw_questions):
        if not isinstance(item, dict):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Question {index + 1} is not a JSON object.",
            )
        normalized.append(item)

    return normalized


def _split_question_blocks(raw_text: str) -> list[tuple[str, str]]:
    text = _strip_code_fences(raw_text)
    if not text:
        return []

    header_pattern = re.compile(
        r"(?:^|\n)\s*(?:[#>*-]*\s*)?(?:question|q)\s*(\d+)\s*[:.)-]?\s*(.*)$",
        re.IGNORECASE | re.MULTILINE,
    )
    matches = list(header_pattern.finditer(text))
    if not matches:
        return []

    blocks: list[tuple[str, str]] = []
    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        header_title = _normalize_text(match.group(2))
        block = text[start:end].strip()
        if block:
            blocks.append((header_title, block))
    return blocks


def _parse_test_cases_from_text(value: str, sample_input: str, sample_output: str) -> list[dict[str, str]]:
    cases: list[dict[str, str]] = []
    normalized = _normalize_text(value)
    if normalized:
        pair_pattern = re.compile(
            r"input\s*:\s*(.*?)\n\s*(?:expected\s*)?output\s*:\s*(.*?)(?=\n\s*(?:test\s*case\s*\d+\s*:?\s*|input\s*:|$))",
            re.IGNORECASE | re.DOTALL,
        )
        for match in pair_pattern.finditer(normalized):
            case_input = _normalize_text(match.group(1))
            expected_output = _normalize_text(match.group(2))
            if expected_output:
                cases.append({"input": case_input, "expected_output": expected_output})

    if not cases and sample_output:
        cases.append({"input": sample_input, "expected_output": sample_output})

    return cases


def _parse_questions_from_text(raw_text: str) -> list[dict[str, Any]]:
    blocks = _split_question_blocks(raw_text)
    if not blocks:
        return []

    parsed_questions: list[dict[str, Any]] = []
    key_map = {
        "title": "title",
        "difficulty": "difficulty",
        "difficulty level": "difficulty",
        "problem statement": "problem_statement",
        "problem": "problem_statement",
        "statement": "problem_statement",
        "input format": "input_format",
        "output format": "output_format",
        "sample input": "sample_input",
        "sample output": "sample_output",
        "constraints": "constraints",
        "tags": "tags",
        "topics": "tags",
        "hint": "hint",
        "test cases": "test_cases",
        "test case": "test_cases",
    }

    for index, (header_title, block) in enumerate(blocks[:5]):
        sections: dict[str, list[str]] = {
            "title": [],
            "difficulty": [],
            "problem_statement": [],
            "input_format": [],
            "output_format": [],
            "sample_input": [],
            "sample_output": [],
            "constraints": [],
            "tags": [],
            "hint": [],
            "test_cases": [],
        }
        current_key: str | None = None

        for raw_line in block.split("\n"):
            line = _normalize_text(raw_line)
            line = re.sub(r"^\s*[-*>\u2022]+\s*", "", line)
            if not line:
                continue

            field_match = re.match(r"^([A-Za-z][A-Za-z \-]{1,45})\s*:\s*(.*)$", line)
            if field_match:
                field = _normalize_text(field_match.group(1)).lower()
                value = _normalize_text(field_match.group(2))
                mapped_key = key_map.get(field)
                if mapped_key:
                    current_key = mapped_key
                    if value:
                        sections[mapped_key].append(value)
                    continue

            if current_key:
                sections[current_key].append(line)

        title = _normalize_text("\n".join(sections["title"])) or header_title
        problem_statement = _normalize_text("\n".join(sections["problem_statement"]))
        if not title or not problem_statement:
            continue

        sample_input = _normalize_text("\n".join(sections["sample_input"]))
        sample_output = _normalize_text("\n".join(sections["sample_output"]))
        raw_cases = _parse_test_cases_from_text("\n".join(sections["test_cases"]), sample_input, sample_output)

        parsed_questions.append(
            {
                "title": title,
                "difficulty": _normalize_text("\n".join(sections["difficulty"])) or DIFFICULTY_ORDER[index],
                "problem_statement": problem_statement,
                "input_format": _normalize_text("\n".join(sections["input_format"])) or "Read input from stdin.",
                "output_format": _normalize_text("\n".join(sections["output_format"])) or "Write output to stdout.",
                "sample_input": sample_input,
                "sample_output": sample_output,
                "constraints": _normalize_list(sections["constraints"]),
                "tags": _normalize_list(sections["tags"]),
                "hint": _normalize_text("\n".join(sections["hint"])) or "Focus on correctness and edge cases.",
                "test_cases": raw_cases,
            }
        )

    return parsed_questions


def _normalize_questions_from_objects(raw_questions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized_questions: list[dict[str, Any]] = []

    for index, raw_question in enumerate(raw_questions):
        title = _normalize_text(raw_question.get("title"))
        problem_statement = _normalize_text(
            raw_question.get(
                "problem_statement",
                raw_question.get("problemStatement", raw_question.get("question")),
            )
        )
        input_format = _normalize_text(raw_question.get("input_format", raw_question.get("inputFormat")))
        output_format = _normalize_text(raw_question.get("output_format", raw_question.get("outputFormat")))
        sample_input = _normalize_text(raw_question.get("sample_input", raw_question.get("sampleInput")))
        sample_output = _normalize_text(raw_question.get("sample_output", raw_question.get("sampleOutput")))

        if not title:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Question {index + 1} is missing title.",
            )
        if not problem_statement:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Question {index + 1} is missing problem_statement.",
            )

        normalized_questions.append(
            {
                "title": title,
                "difficulty": _normalize_difficulty(raw_question.get("difficulty"), index),
                "problem_statement": problem_statement,
                "input_format": input_format or "Read input from stdin.",
                "output_format": output_format or "Write output to stdout.",
                "sample_input": sample_input,
                "sample_output": sample_output,
                "constraints": _normalize_list(raw_question.get("constraints")),
                "tags": _normalize_list(raw_question.get("tags")),
                "hint": _normalize_text(raw_question.get("hint")) or "Focus on correctness and edge cases.",
                "test_cases": _normalize_test_cases(raw_question, sample_input, sample_output),
            }
        )

    return normalized_questions


def _normalize_test_cases(raw_question: dict[str, Any], sample_input: str, sample_output: str) -> list[dict[str, str]]:
    raw_test_cases = raw_question.get("test_cases", raw_question.get("testCases"))
    cases: list[dict[str, str]] = []

    if isinstance(raw_test_cases, list):
        for raw_case in raw_test_cases:
            if not isinstance(raw_case, dict):
                continue
            case_input = _normalize_text(raw_case.get("input"))
            expected_output = _normalize_text(
                raw_case.get("expected_output", raw_case.get("expectedOutput", raw_case.get("output")))
            )
            if expected_output:
                cases.append(
                    {
                        "input": case_input,
                        "expected_output": expected_output,
                    }
                )

    if not cases and sample_output:
        cases.append({"input": sample_input, "expected_output": sample_output})

    if not cases:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Each question must contain at least one test case or sample_output.",
        )

    return cases


def _normalize_questions(raw_response: str) -> list[dict[str, Any]]:
    try:
        payload = _load_json_payload(raw_response)
        raw_questions = _extract_question_list(payload)
    except HTTPException:
        raw_questions = _parse_questions_from_text(raw_response)
        if len(raw_questions) != 5:
            snippet = _normalize_text(raw_response)[:220]
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Question generator response could not be parsed into 5 questions. Raw preview: {snippet}",
            ) from None

    if len(raw_questions) != 5:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Question generator must return exactly 5 questions, got {len(raw_questions)}.",
        )

    return _normalize_questions_from_objects(raw_questions)


@router.post("/questions", response_model=GenerateQuestionsResponse)
async def generate_questions():
    first_response = await generate_text(
        QUESTION_GENERATION_PROMPT,
        max_tokens=QUESTION_MAX_TOKENS_PRIMARY,
        temperature=0.3,
    )
    try:
        questions = _normalize_questions(first_response)
        return {"questions": questions}
    except HTTPException as first_error:
        retry_response = await generate_text(
            QUESTION_GENERATION_RETRY_PROMPT,
            max_tokens=QUESTION_MAX_TOKENS_RETRY,
            temperature=0.2,
        )
        try:
            questions = _normalize_questions(retry_response)
            return {"questions": questions}
        except HTTPException as retry_error:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    "Question generation failed after retry. "
                    f"Primary parse error: {first_error.detail}. "
                    f"Retry parse error: {retry_error.detail}"
                ),
            ) from None


@router.post("/feedback", response_model=GenerateFeedbackResponse)
async def generate_feedback(payload: GenerateFeedbackRequest):
    feedback = await generate_text(FEEDBACK_PROMPT_TEMPLATE.format(score=payload.score))
    return {"feedback": feedback}


@router.post("/hint", response_model=GenerateHintResponse)
async def generate_hint(payload: GenerateHintRequest):
    hint = await generate_text(
        HINT_GENERATION_PROMPT_TEMPLATE.format(
            question_title=payload.question_title,
            question_statement=payload.question_statement,
            difficulty=payload.difficulty,
            attempts=payload.attempts,
        ),
        max_tokens=150,
        temperature=0.7,
    )
    return {"hint": hint}


@router.post("/solution", response_model=GenerateSolutionResponse)
async def generate_solution(payload: GenerateSolutionRequest):
    solution = await generate_text(
        SOLUTION_GENERATION_PROMPT_TEMPLATE.format(
            question_title=payload.question_title,
            question_statement=payload.question_statement,
            difficulty=payload.difficulty,
            attempts=payload.attempts,
        ),
        max_tokens=800,
        temperature=0.3,
    )
    return {"solution": solution}


# persistence endpoints -------------------------------------------------------------

@router.post("/sessions", response_model=InterviewSessionResponse)
async def create_session(
    payload: InterviewSessionCreate, db: AsyncSession = Depends(get_db)
):
    started = datetime.fromisoformat(payload.started_at) if payload.started_at else datetime.utcnow()
    completed = datetime.fromisoformat(payload.completed_at) if payload.completed_at else None

    session = InterviewSession(
        user_id=payload.user_id,
        status=payload.status,
        started_at=started,
        completed_at=completed,
        total_score=payload.total_score,
        feedback_summary=payload.feedback_summary,
    )
    db.add(session)
    await db.flush()

    for item in payload.question_results:
        qb = QuestionFeedback(
            interview_id=session.id,
            question_id=item.question_id,
            title=item.title or "",
            difficulty=item.difficulty or "",
            attempts=item.attempts,
            score=item.score,
            is_solved=item.is_solved,
            feedback=item.feedback,
        )
        db.add(qb)

    await db.commit()
    await db.refresh(session)
    await db.refresh(session, attribute_names=["question_feedback"])

    return {
        "interview_id": str(session.id),
        "user_id": session.user_id,
        "status": session.status,
        "total_score": session.total_score,
        "started_at": session.started_at.isoformat(),
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
        "feedback_summary": session.feedback_summary,
        "question_results": [
            {
                "question_id": q.question_id,
                "title": q.title,
                "difficulty": q.difficulty,
                "attempts": q.attempts,
                "score": q.score,
                "is_solved": q.is_solved,
                "feedback": q.feedback,
            }
            for q in session.question_feedback
        ],
    }


@router.get("/sessions/{session_id}", response_model=InterviewSessionResponse)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(InterviewSession).where(InterviewSession.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found")
    await db.refresh(session, attribute_names=["question_feedback"])

    return {
        "interview_id": str(session.id),
        "user_id": session.user_id,
        "status": session.status,
        "total_score": session.total_score,
        "started_at": session.started_at.isoformat(),
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
        "feedback_summary": session.feedback_summary,
        "question_results": [
            {
                "question_id": q.question_id,
                "title": q.title,
                "difficulty": q.difficulty,
                "attempts": q.attempts,
                "score": q.score,
                "is_solved": q.is_solved,
                "feedback": q.feedback,
            }
            for q in session.question_feedback
        ],
    }


@router.get("/dashboard", response_model=DashboardResponse)
async def session_dashboard(user_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(InterviewSession).where(InterviewSession.user_id == user_id).order_by(InterviewSession.started_at.desc())
    result = await db.execute(stmt)
    sessions = result.scalars().all()

    total_interviews = len(sessions)
    total_score = sum(s.total_score for s in sessions)
    average_score = round(total_score / total_interviews, 2) if total_interviews else 0.0

    recent = sessions[:8]
    recent_list = [
        {
            "interview_id": str(s.id),
            "status": s.status,
            "total_score": s.total_score,
            "started_at": s.started_at.isoformat(),
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        }
        for s in recent
    ]

    return {
        "total_interviews": total_interviews,
        "total_score": round(total_score, 2),
        "average_score": average_score,
        "recent_interviews": recent_list,
    }
