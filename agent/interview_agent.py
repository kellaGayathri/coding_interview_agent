# weighted_interview_agent.py

from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv
import os

# -----------------------------
# Load Environment
# -----------------------------

load_dotenv()

hf_token = os.getenv("HUGGINGFACE_API_TOKEN")
repo_id = os.getenv("REPO_ID")

if not hf_token or not repo_id:
    raise ValueError("Missing HUGGINGFACE_API_TOKEN or REPO_ID in .env")

# -----------------------------
# Initialize LLM
# -----------------------------

llm_endpoint = HuggingFaceEndpoint(
    repo_id=repo_id,
    huggingfacehub_api_token=hf_token,
    temperature=0.6,
    max_new_tokens=1000
)

llm = ChatHuggingFace(llm=llm_endpoint)
parser = StrOutputParser()

# -----------------------------
# Question Generator
# -----------------------------

question_prompt = ChatPromptTemplate.from_template("""
You are a senior technical interviewer.

Generate EXACTLY 5 different DSA coding questions.

Distribution MUST be:
- Question 1: Easy
- Question 2: Easy
- Question 3: Medium
- Question 4: Medium
- Question 5: Hard

Rules:
- Cover different DSA topics
- No repeated patterns
- Difficulty must strictly match label
- Do NOT provide solutions

For each question provide:
1. Title
2. Difficulty
3. Problem Statement
4. Input Format
5. Output Format
6. Sample Input
7. Sample Output
8. testcase(at least 5)
""")

question_chain = question_prompt | llm | parser


def generate_questions():
    return question_chain.invoke({})


# -----------------------------
# Feedback Generator
# -----------------------------

feedback_prompt = ChatPromptTemplate.from_template("""
You are an AI interview evaluator.

The candidate scored {score} out of 50.

Performance Scale:
40-50 → Excellent
30-39 → Good
20-29 → Average
Below 20 → Needs Improvement

Generate:

1. Overall Summary
2. Strengths
3. Weaknesses
4. Improvement Plan
5. Final Verdict

Be realistic and professional.
""")

feedback_chain = feedback_prompt | llm | parser


def generate_feedback(score):
    return feedback_chain.invoke({"score": score})


# -----------------------------
# Weighted Scoring Logic
# -----------------------------

difficulty_weights = {
    1: 5,   # Easy
    2: 5,   # Easy
    3: 10,  # Medium
    4: 10,  # Medium
    5: 20   # Hard
}


def calculate_total_score():
    total = 0

    for q_no in range(1, 6):
        max_score = difficulty_weights[q_no]
        score = int(input(f"Enter score for Question {q_no} (0-{max_score}): "))

        if score > max_score:
            print("Score exceeds maximum. Assigning max score.")
            score = max_score

        total += score

    return total


# -----------------------------
# CLI Flow
# -----------------------------

if __name__ == "__main__":

    print("=" * 60)
    print("AI Coding Interview Agent")
    print("=" * 60)

    print("\nGenerating 5 DSA Questions (2 Easy, 2 Medium, 1 Hard)...\n")

    questions = generate_questions()
    print(questions)

    print("\nScoring Section:")
    print("Easy -> 5 marks each")
    print("Medium -> 10 marks each")
    print("Hard -> 20 marks")

    total_score = calculate_total_score()

    print(f"\nTotal Score: {total_score} / 50")

    print("\nGenerating AI Feedback...\n")

    feedback = generate_feedback(total_score)
    print(feedback)