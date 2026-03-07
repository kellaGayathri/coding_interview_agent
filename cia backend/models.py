import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column("full_name", String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column("hashed_password", String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="in_progress")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    total_score: Mapped[float] = mapped_column(default=0.0)
    feedback_summary: Mapped[str] = mapped_column(String, nullable=True)

    # relationship to question feedback
    question_feedback: Mapped[list["QuestionFeedback"]] = relationship(
        "QuestionFeedback",
        back_populates="session",
        cascade="all, delete-orphan",
    )


class QuestionFeedback(Base):
    __tablename__ = "question_feedback"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    interview_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("interview_sessions.id"), nullable=False)
    question_id: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=True)
    difficulty: Mapped[str] = mapped_column(String(50), nullable=True)
    attempts: Mapped[int] = mapped_column(default=0)
    score: Mapped[float] = mapped_column(default=0.0)
    is_solved: Mapped[bool] = mapped_column(default=False)
    feedback: Mapped[str] = mapped_column(String, nullable=True)

    session: Mapped[InterviewSession] = relationship("InterviewSession", back_populates="question_feedback")
