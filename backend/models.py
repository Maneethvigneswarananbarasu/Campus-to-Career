from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255))
    full_name = Column(String(255))
    role = Column(String(50), default="student")

    profile = relationship("StudentProfile", back_populates="user", uselist=False)
    coding_assessments = relationship("CodingAssessment", back_populates="user")
    interview_sessions = relationship("InterviewSession", back_populates="user")


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    resume_filename = Column(String(255), nullable=True)
    resume_text = Column(Text, nullable=True)
    coding_score = Column(String(50), default="Pending")
    interview_score = Column(String(50), default="Pending")

    user = relationship("User", back_populates="profile")


class CodingAssessment(Base):
    __tablename__ = "coding_assessments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String(255), nullable=False)
    difficulty = Column(String(50), nullable=False)
    topic = Column(String(100), nullable=False)

    description = Column(Text, nullable=False)
    constraints = Column(JSON, nullable=True)
    examples = Column(JSON, nullable=True)

    function_name = Column(String(255), nullable=False)
    starter_code = Column(Text, nullable=False)

    hidden_test_cases = Column(JSON, nullable=False)

    status = Column(String(50), default="not_started")
    score = Column(Integer, default=0)

    started_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="coding_assessments")


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    status = Column(String(50), default="in_progress")
    total_questions = Column(Integer, default=5)
    final_score = Column(String(50), default="Pending")

    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="interview_sessions")
    answers = relationship(
        "InterviewAnswer",
        back_populates="session",
        cascade="all, delete-orphan"
    )


class InterviewAnswer(Base):
    __tablename__ = "interview_answers"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False)

    question_number = Column(Integer, nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    score = Column(Integer, nullable=False)
    feedback = Column(Text, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("InterviewSession", back_populates="answers")