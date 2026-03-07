from pydantic import BaseModel, Field

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class UserResponse(BaseModel):
    username: str
    email: str = Field(pattern=EMAIL_PATTERN)


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str = Field(pattern=EMAIL_PATTERN)
    password: str = Field(min_length=6)


class RegisterResponse(BaseModel):
    message: str
    user: UserResponse


class LoginRequest(BaseModel):
    email: str = Field(pattern=EMAIL_PATTERN)
    password: str = Field(min_length=6)


class LoginResponse(BaseModel):
    message: str
    user: UserResponse


class GeneratedTestCase(BaseModel):
    input: str = ""
    expected_output: str


class GeneratedQuestion(BaseModel):
    title: str
    difficulty: str
    problem_statement: str
    input_format: str
    output_format: str
    sample_input: str
    sample_output: str
    constraints: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    hint: str
    test_cases: list[GeneratedTestCase] = Field(min_length=1)


class GenerateQuestionsResponse(BaseModel):
    questions: list[GeneratedQuestion]


class GenerateFeedbackRequest(BaseModel):
    score: float = Field(ge=0, le=50)


class GenerateFeedbackResponse(BaseModel):
    feedback: str


class GenerateHintRequest(BaseModel):
    question_title: str
    question_statement: str
    difficulty: str
    attempts: int


class GenerateHintResponse(BaseModel):
    hint: str


class GenerateSolutionRequest(BaseModel):
    question_title: str
    question_statement: str
    difficulty: str
    attempts: int


class GenerateSolutionResponse(BaseModel):
    solution: str


class ExecuteCodeRequest(BaseModel):
    source_code: str = Field(min_length=1)
    language_id: int = Field(gt=0)
    stdin: str = ""


class ExecuteCodeResponse(BaseModel):
    status: str
    status_id: int | None = None
    stdout: str | None = None
    stderr: str | None = None
    compile_output: str | None = None
    time: str | None = None
    memory: int | None = None


class TestCaseRequest(BaseModel):
    input: str = ""
    expected_output: str
    weight: float = Field(default=1.0, gt=0)


class ScoreSubmissionRequest(BaseModel):
    source_code: str = Field(min_length=1)
    language_id: int = Field(gt=0)
    test_cases: list[TestCaseRequest] = Field(min_length=1)


class TestCaseResult(BaseModel):
    test_case_number: int
    passed: bool
    score: float
    status: str
    expected_output: str
    actual_output: str
    stderr: str | None = None
    compile_output: str | None = None
    time: str | None = None
    memory: int | None = None


class ScoreSubmissionResponse(BaseModel):
    message: str
    total_score: float
    earned_score: float
    max_score: float
    passed_count: int
    total_count: int
    results: list[TestCaseResult]


# --- interview session storage schemas ------------------------------------------------

class QuestionResult(BaseModel):
    question_id: str
    title: str | None = None
    difficulty: str | None = None
    attempts: int
    score: float
    is_solved: bool
    feedback: str | None = None


class InterviewSessionCreate(BaseModel):
    user_id: str
    status: str = "completed"
    started_at: str | None = None
    completed_at: str | None = None
    total_score: float
    feedback_summary: str | None = None
    question_results: list[QuestionResult] = Field(min_length=1)


class InterviewSessionSummary(BaseModel):
    interview_id: str
    status: str
    total_score: float
    started_at: str
    completed_at: str | None = None


class DashboardResponse(BaseModel):
    total_interviews: int
    total_score: float
    average_score: float
    recent_interviews: list[InterviewSessionSummary]


class InterviewSessionResponse(BaseModel):
    interview_id: str
    user_id: str
    status: str
    total_score: float
    started_at: str
    completed_at: str | None = None
    feedback_summary: str | None = None
    question_results: list[QuestionResult]
