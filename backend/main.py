from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File,
    Request,
    Form
)
from typing import Optional
import base64

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from sqlalchemy.orm import Session

from passlib.context import CryptContext

from pypdf import PdfReader
from docx import Document

from langchain_ollama import ChatOllama
from langchain_core.messages import (
    HumanMessage,
    SystemMessage
)

from pydantic import BaseModel

import redis
import json
import database
import models
import schemas
import os
import cv2
import numpy as np
import mediapipe as mp
import csv
import io

from coding.generator import generate_coding_problem
from coding.validator import validate_problem
from coding.executor import run_code

from datetime import datetime

from ultralytics import YOLO


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Campus-to-Career API"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ============================================================
# DATABASE
# ============================================================

models.Base.metadata.create_all(
    bind=database.engine
)


# ============================================================
# PASSWORD
# ============================================================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


def get_password_hash(password):
    return pwd_context.hash(password)


def verify_password(
    plain_password,
    hashed_password
):
    return pwd_context.verify(
        plain_password,
        hashed_password
    )


# ============================================================
# AI / PROCTORING MODELS
# ============================================================

print("Loading YOLO model...")

proctor_model = YOLO(
    "yolov8n.pt"
)

print("YOLO model loaded.")


print("Loading MediaPipe face detector...")

face_detection = (
    mp.solutions.face_detection.FaceDetection(
        model_selection=1,
        min_detection_confidence=0.35
    )
)

print("MediaPipe face detector loaded.")


# ============================================================
# OLLAMA
# ============================================================

llm = ChatOllama(
    model="llama3",
    temperature=0.7
)


# ============================================================
# REDIS
# ============================================================

try:

    redis_client = redis.Redis(
        host="localhost",
        port=6379,
        db=0,
        decode_responses=True
    )

    redis_client.ping()

    print(
        "Connected to Redis successfully!"
    )

except Exception as e:

    print(
        f"Redis connection warning: {e}"
    )

    redis_client = None


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_interview_numeric_score(
    interview_score
):

    if not interview_score:
        return None

    if interview_score == "Pending":
        return None

    try:

        return float(
            str(interview_score).split("/")[0]
        )

    except Exception:

        return None


def calculate_readiness(
    resume_completed,
    coding_score,
    interview_numeric_score
):

    resume_score = (
        100
        if resume_completed
        else 0
    )

    coding_readiness_score = (
        coding_score
        if coding_score is not None
        else 0
    )

    interview_readiness_score = (
        interview_numeric_score * 10
        if interview_numeric_score is not None
        else 0
    )

    readiness_score = round(
        resume_score * 0.20
        +
        coding_readiness_score * 0.40
        +
        interview_readiness_score * 0.40
    )

    if readiness_score >= 90:

        readiness_label = "Excellent"

    elif readiness_score >= 75:

        readiness_label = "Placement Ready"

    elif readiness_score >= 60:

        readiness_label = "Needs Improvement"

    else:

        readiness_label = "Not Ready"

    return (
        readiness_score,
        readiness_label
    )


def calculate_overall_status(
    coding_status,
    interview_numeric_score
):

    if (
        coding_status == "submitted"
        and
        interview_numeric_score is not None
    ):

        return "Completed"

    return "In Progress"


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def read_root():

    return {
        "message":
        "Welcome to Campus-to-Career API"
    }


# ============================================================
# REGISTER
# ============================================================

@app.post(
    "/api/register",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register_user(
    user: schemas.UserCreate,
    db: Session = Depends(
        database.get_db
    )
):

    existing_user = (
        db.query(models.User)
        .filter(
            models.User.email ==
            user.email
        )
        .first()
    )

    if existing_user:

        raise HTTPException(
            status_code=
            status.HTTP_400_BAD_REQUEST,
            detail=
            "Email already registered"
        )

    hashed_pwd = get_password_hash(
        user.password
    )

    new_user = models.User(
        email=user.email,
        hashed_password=hashed_pwd,
        full_name=user.full_name,
        role=user.role
    )

    db.add(new_user)

    db.commit()

    db.refresh(new_user)

    return new_user


# ============================================================
# LOGIN
# ============================================================

@app.post("/api/login")
def login_user(
    user_credentials: schemas.UserLogin,
    db: Session = Depends(
        database.get_db
    )
):

    user = (
        db.query(models.User)
        .filter(
            models.User.email ==
            user_credentials.email
        )
        .first()
    )

    if (
        not user
        or not verify_password(
            user_credentials.password,
            user.hashed_password
        )
    ):

        raise HTTPException(
            status_code=
            status.HTTP_401_UNAUTHORIZED,
            detail=
            "Invalid credentials"
        )

    return {
        "message":
        "Login successful",

        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }


# ============================================================
# RESUME UPLOAD
# ============================================================

UPLOAD_DIR = "uploads"

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)


@app.post("/api/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    user_id: int = None,
    db: Session = Depends(
        database.get_db
    )
):

    allowed_extensions = [
        ".pdf",
        ".docx"
    ]

    file_extension = os.path.splitext(
        file.filename
    )[1].lower()

    if file_extension not in allowed_extensions:

        raise HTTPException(
            status_code=
            status.HTTP_400_BAD_REQUEST,
            detail=
            "Only PDF and DOCX files are allowed."
        )

    safe_filename = os.path.basename(
        file.filename
    )

    file_path = os.path.join(
        UPLOAD_DIR,
        safe_filename
    )

    content = await file.read()

    with open(
        file_path,
        "wb"
    ) as buffer:

        buffer.write(content)

    extracted_text = ""

    if file_extension == ".pdf":

        reader = PdfReader(
            file_path
        )

        for page in reader.pages:

            text = page.extract_text()

            if text:

                extracted_text += (
                    text + "\n"
                )

    elif file_extension == ".docx":

        document = Document(
            file_path
        )

        for paragraph in document.paragraphs:

            if paragraph.text:

                extracted_text += (
                    paragraph.text + "\n"
                )

    if user_id:

        user = (
            db.query(models.User)
            .filter(
                models.User.id ==
                user_id
            )
            .first()
        )

        if not user:

            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        profile = (
            db.query(
                models.StudentProfile
            )
            .filter(
                models.StudentProfile.user_id ==
                user_id
            )
            .first()
        )

        if profile:

            profile.resume_filename = (
                safe_filename
            )

            profile.resume_text = (
                extracted_text
            )

        else:

            profile = models.StudentProfile(
                user_id=user_id,
                resume_filename=
                safe_filename,
                resume_text=
                extracted_text
            )

            db.add(profile)

        db.commit()

        db.refresh(profile)

    return {
        "filename":
        safe_filename,

        "message":
        "Resume uploaded, parsed, and saved to database successfully!",

        "file_type":
        file_extension,

        "user_id":
        user_id,

        "extracted_text_preview":
        extracted_text[:500]
    }


# ============================================================
# INTERVIEW REQUEST MODELS
# ============================================================

class InterviewStartRequest(BaseModel):

    user_id: int


class InterviewAnswerRequest(BaseModel):

    user_id: int
    question: str
    answer: str


class InterviewFinishRequest(BaseModel):

    user_id: int


# ============================================================
# REDIS INTERVIEW SESSION
# ============================================================

def get_interview_session(
    user_id
):

    if not redis_client:

        return None

    session_key = (
        f"interview_session:{user_id}"
    )

    cached_data = redis_client.get(
        session_key
    )

    if not cached_data:

        return None

    return json.loads(
        cached_data
    )


def save_interview_session(
    user_id,
    session_data
):

    if not redis_client:

        return

    session_key = (
        f"interview_session:{user_id}"
    )

    redis_client.set(
        session_key,
        json.dumps(session_data),
        ex=3600
    )


# ============================================================
# GENERATE INTERVIEW QUESTION
# ============================================================

def generate_interview_question(
    resume_text,
    previous_questions,
    previous_answers
):

    history_text = ""

    for question, answer in zip(
        previous_questions,
        previous_answers
    ):

        history_text += (
            f"Question: {question}\n"
            f"Answer: {answer}\n\n"
        )

    prompt = f"""
You are conducting a professional campus placement interview.

Candidate resume:

{resume_text[:6000]}

Previous interview conversation:

{history_text}

Generate exactly ONE next interview question.

The candidate is applying for a software engineering role.

Rules:

1. Return exactly one question.
2. Return only the question text.
3. Do not return JSON.
4. Do not use markdown.
5. Do not provide explanations.
6. Do not provide an answer.
7. Do not ask multiple questions.
8. Do not repeat any previous question.
9. Make the question relevant to the candidate's resume, projects, skills, education, internship, or software engineering knowledge.
10. Prefer technical questions when the candidate has technical projects.
11. Use HR or behavioral questions when appropriate.
12. Keep the question suitable for spoken conversation.
13. The question must end with a question mark.

Previous questions:

{json.dumps(previous_questions)}

Return only the next interview question.
"""

    messages = [
        SystemMessage(
            content=
            "You are a professional campus placement interviewer. Return exactly one interview question and nothing else."
        ),

        HumanMessage(
            content=prompt
        )
    ]

    response = llm.invoke(
        messages
    )

    question = (
        response.content
        .strip()
        .replace("```", "")
        .strip()
    )

    if (
        question.startswith('"')
        and question.endswith('"')
    ):

        question = question[
            1:-1
        ].strip()

    if question.startswith(
        "Question:"
    ):

        question = question[
            len("Question:"):
        ].strip()

    if not question:

        raise ValueError(
            "Llama returned an empty interview question"
        )

    if "\n" in question:

        question = (
            question
            .split("\n")[0]
            .strip()
        )

    if not question.endswith("?"):

        question += "?"

    return question


# ============================================================
# EVALUATE INTERVIEW ANSWER
# ============================================================

def evaluate_interview_answer(
    resume_text,
    question,
    answer
):

    prompt = f"""
Evaluate this candidate's answer during a software engineering campus interview.

Candidate resume:

{resume_text[:6000]}

Interview question:

{question}

Candidate answer:

{answer}

Evaluate:

- Technical correctness
- Relevance
- Clarity
- Depth
- Communication

Give a score from 0 to 10.

Return ONLY valid JSON in exactly this structure:

{{
    "score": 0,
    "feedback": "short feedback"
}}

Rules:

1. score must be an integer from 0 to 10.
2. feedback must be concise.
3. Evaluate the actual content of the answer.
4. Do not score only based on grammar.
5. Do not include markdown.
6. Do not include text outside the JSON.
"""

    messages = [
        SystemMessage(
            content=
            "You are an interview evaluator. Return only valid JSON."
        ),

        HumanMessage(
            content=prompt
        )
    ]

    evaluation_llm = ChatOllama(
        model="llama3",
        temperature=0,
        format="json"
    )

    response = evaluation_llm.invoke(
        messages
    )

    content = response.content.strip()

    if content.startswith("```json"):

        content = content[7:]

    if content.startswith("```"):

        content = content[3:]

    if content.endswith("```"):

        content = content[:-3]

    content = content.strip()

    try:

        evaluation = json.loads(
            content
        )

    except json.JSONDecodeError:

        evaluation = {
            "score": 5,
            "feedback":
            "Unable to fully evaluate the response."
        }

    score = evaluation.get(
        "score",
        5
    )

    try:

        score = int(score)

    except Exception:

        score = 5

    score = max(
        0,
        min(
            10,
            score
        )
    )

    feedback = evaluation.get(
        "feedback",
        "No feedback available."
    )

    return {
        "score":
        score,

        "feedback":
        str(feedback)
    }


# ============================================================
# START INTERVIEW
# ============================================================

@app.post("/api/interview/start")
def start_interview(
    data: InterviewStartRequest,
    db: Session = Depends(
        database.get_db
    )
):

    user = (
        db.query(models.User)
        .filter(
            models.User.id ==
            data.user_id
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    profile = (
        db.query(
            models.StudentProfile
        )
        .filter(
            models.StudentProfile.user_id ==
            data.user_id
        )
        .first()
    )

    resume_text = ""

    if profile:

        resume_text = (
            profile.resume_text or ""
        )

    if not resume_text:

        resume_text = (
            f"Candidate name: "
            f"{user.full_name}. "
            "No resume has been uploaded."
        )

    existing_session = (
        get_interview_session(
            data.user_id
        )
    )

    if existing_session:

        return {
            "status":
            "existing_session",

            "question":
            existing_session[
                "current_question"
            ],

            "question_number":
            existing_session[
                "question_number"
            ],

            "total_questions":
            existing_session[
                "total_questions"
            ]
        }

    old_database_session = (
        db.query(
            models.InterviewSession
        )
        .filter(
            models.InterviewSession.user_id ==
            data.user_id,

            models.InterviewSession.status ==
            "in_progress"
        )
        .order_by(
            models.InterviewSession.id.desc()
        )
        .first()
    )

    if old_database_session:

        old_database_session.status = (
            "abandoned"
        )

        old_database_session.completed_at = (
            datetime.utcnow()
        )

        db.commit()

    total_questions = 5

    first_question = (
        generate_interview_question(
            resume_text=resume_text,
            previous_questions=[],
            previous_answers=[]
        )
    )

    interview_session = (
        models.InterviewSession(
            user_id=data.user_id,
            status="in_progress",
            total_questions=
            total_questions,
            final_score="Pending",
            started_at=
            datetime.utcnow()
        )
    )

    db.add(
        interview_session
    )

    db.commit()

    db.refresh(
        interview_session
    )

    session_data = {

        "user_id":
        data.user_id,

        "database_session_id":
        interview_session.id,

        "resume_text":
        resume_text,

        "question_number":
        1,

        "total_questions":
        total_questions,

        "current_question":
        first_question,

        "questions": [
            first_question
        ],

        "answers": [],

        "scores": [],

        "feedback": [],

        "started_at":
        datetime.utcnow().isoformat()
    }

    save_interview_session(
        data.user_id,
        session_data
    )

    return {

        "status":
        "started",

        "question":
        first_question,

        "question_number":
        1,

        "total_questions":
        total_questions
    }


# ============================================================
# SUBMIT INTERVIEW ANSWER
# ============================================================

@app.post("/api/interview/answer")
def submit_interview_answer(
    data: InterviewAnswerRequest,
    db: Session = Depends(
        database.get_db
    )
):

    session_data = (
        get_interview_session(
            data.user_id
        )
    )

    if not session_data:

        raise HTTPException(
            status_code=404,
            detail=
            "Interview session not found"
        )

    if not data.answer.strip():

        raise HTTPException(
            status_code=400,
            detail=
            "Answer cannot be empty"
        )

    evaluation = (
        evaluate_interview_answer(
            resume_text=
            session_data[
                "resume_text"
            ],

            question=
            data.question,

            answer=
            data.answer
        )
    )

    database_session_id = (
        session_data.get(
            "database_session_id"
        )
    )

    interview_session = None

    if database_session_id:

        interview_session = (
            db.query(
                models.InterviewSession
            )
            .filter(
                models.InterviewSession.id ==
                database_session_id
            )
            .first()
        )

    if not interview_session:

        interview_session = (
            db.query(
                models.InterviewSession
            )
            .filter(
                models.InterviewSession.user_id ==
                data.user_id,

                models.InterviewSession.status ==
                "in_progress"
            )
            .order_by(
                models.InterviewSession.id.desc()
            )
            .first()
        )

    if not interview_session:

        raise HTTPException(
            status_code=404,
            detail=
            "Interview database session not found"
        )

    question_number = (
        len(
            session_data.get(
                "answers",
                []
            )
        ) + 1
    )

    interview_answer = (
        models.InterviewAnswer(
            session_id=
            interview_session.id,

            question_number=
            question_number,

            question=
            data.question,

            answer=
            data.answer,

            score=
            evaluation["score"],

            feedback=
            evaluation["feedback"],

            created_at=
            datetime.utcnow()
        )
    )

    db.add(
        interview_answer
    )

    session_data[
        "answers"
    ].append(
        data.answer
    )

    session_data[
        "scores"
    ].append(
        evaluation["score"]
    )

    session_data[
        "feedback"
    ].append(
        evaluation["feedback"]
    )

    answered_questions = len(
        session_data["answers"]
    )

    if (
        answered_questions >=
        session_data[
            "total_questions"
        ]
    ):

        save_interview_session(
            data.user_id,
            session_data
        )

        db.commit()

        return {

            "status":
            "completed",

            "score":
            evaluation["score"],

            "feedback":
            evaluation["feedback"],

            "question_number":
            session_data[
                "question_number"
            ],

            "total_questions":
            session_data[
                "total_questions"
            ]
        }

    next_question_number = (
        session_data[
            "question_number"
        ] + 1
    )

    next_question = (
        generate_interview_question(
            resume_text=
            session_data[
                "resume_text"
            ],

            previous_questions=
            session_data[
                "questions"
            ],

            previous_answers=
            session_data[
                "answers"
            ]
        )
    )

    session_data[
        "question_number"
    ] = next_question_number

    session_data[
        "current_question"
    ] = next_question

    session_data[
        "questions"
    ].append(
        next_question
    )

    save_interview_session(
        data.user_id,
        session_data
    )

    db.commit()

    return {

        "status":
        "continue",

        "score":
        evaluation["score"],

        "feedback":
        evaluation["feedback"],

        "question":
        next_question,

        "question_number":
        next_question_number,

        "total_questions":
        session_data[
            "total_questions"
        ]
    }


# ============================================================
# FINISH INTERVIEW
# ============================================================

@app.post("/api/interview/finish")
def finish_interview(
    data: InterviewFinishRequest,
    db: Session = Depends(
        database.get_db
    )
):

    session_data = (
        get_interview_session(
            data.user_id
        )
    )

    if not session_data:

        raise HTTPException(
            status_code=404,
            detail=
            "Interview session not found"
        )

    scores = session_data.get(
        "scores",
        []
    )

    if scores:

        final_score = round(
            sum(scores) /
            len(scores),
            1
        )

    else:

        final_score = 0

    database_session_id = (
        session_data.get(
            "database_session_id"
        )
    )

    interview_session = None

    if database_session_id:

        interview_session = (
            db.query(
                models.InterviewSession
            )
            .filter(
                models.InterviewSession.id ==
                database_session_id
            )
            .first()
        )

    if not interview_session:

        interview_session = (
            db.query(
                models.InterviewSession
            )
            .filter(
                models.InterviewSession.user_id ==
                data.user_id,

                models.InterviewSession.status ==
                "in_progress"
            )
            .order_by(
                models.InterviewSession.id.desc()
            )
            .first()
        )

    if not interview_session:

        raise HTTPException(
            status_code=404,
            detail=
            "Interview database session not found"
        )

    interview_session.status = (
        "completed"
    )

    interview_session.final_score = (
        f"{final_score}/10"
    )

    interview_session.completed_at = (
        datetime.utcnow()
    )

    profile = (
        db.query(
            models.StudentProfile
        )
        .filter(
            models.StudentProfile.user_id ==
            data.user_id
        )
        .first()
    )

    if not profile:

        profile = (
            models.StudentProfile(
                user_id=data.user_id
            )
        )

        db.add(profile)

    profile.interview_score = (
        f"{final_score}/10"
    )

    db.commit()

    if redis_client:

        redis_client.delete(
            f"interview_session:{data.user_id}"
        )

    return {

        "status":
        "completed",

        "score":
        final_score,

        "score_display":
        f"{final_score}/10",

        "questions_answered":
        len(
            session_data.get(
                "answers",
                []
            )
        ),

        "message":
        "Interview completed successfully"
    }


# ============================================================
# CACHE SESSION
# ============================================================

class SessionCacheRequest(BaseModel):

    user_id: int
    session_data: dict


@app.post("/api/cache-session")
def cache_interview_session(
    data: SessionCacheRequest
):

    if not redis_client:

        raise HTTPException(
            status_code=500,
            detail=
            "Redis client is not available"
        )

    session_key = (
        f"interview_session:"
        f"{data.user_id}"
    )

    redis_client.set(
        session_key,
        json.dumps(
            data.session_data
        ),
        ex=3600
    )

    return {

        "message":
        "Session cached successfully in Redis",

        "user_id":
        data.user_id
    }


@app.get("/api/cache-session/{user_id}")
def get_cached_interview_session(
    user_id: int
):

    if not redis_client:

        raise HTTPException(
            status_code=500,
            detail=
            "Redis client is not available"
        )

    session_key = (
        f"interview_session:"
        f"{user_id}"
    )

    cached_data = (
        redis_client.get(
            session_key
        )
    )

    if not cached_data:

        return {

            "session_data":
            None,

            "message":
            "No active session found in cache"
        }

    return {

        "session_data":
        json.loads(
            cached_data
        )
    }


# ============================================================
# CODING REQUEST MODELS
# ============================================================

class CodingGenerateRequest(BaseModel):

    user_id: int
    skills: str = "Python"
    difficulty: str = "Medium"


class CodingRunRequest(BaseModel):

    assessment_id: int
    code: str
    test_input: object


class CodingSubmitRequest(BaseModel):

    assessment_id: int
    code: str


# ============================================================
# PROCTORING
# ============================================================
#
# IMPORTANT:
#
# React sends:
#
# FormData
#   user_id
#   frame = frame.jpg
#
# Therefore FastAPI MUST receive:
#
# user_id: int
# frame: UploadFile
#
# We must NOT use:
#
# request.json()
#
# because JPEG data is binary.
#
# ============================================================

# ============================================================
# PROCTOR FRAME
# ============================================================

@app.post("/api/proctor-frame")
async def proctor_frame(
    request: Request,
    user_id: Optional[int] = None,
    frame: Optional[UploadFile] = File(None)
):

    try:

        # ====================================================
        # 1. READ IMAGE DATA
        # ====================================================

        image_bytes = None
        actual_user_id = user_id

        content_type = request.headers.get(
            "content-type",
            ""
        )

        # ----------------------------------------------------
        # Multipart form-data
        # ----------------------------------------------------

        if "multipart/form-data" in content_type:

            form = await request.form()

            # Get user ID from form if not supplied
            if actual_user_id is None and "user_id" in form:

                try:
                    actual_user_id = int(
                        form["user_id"]
                    )

                except Exception:
                    actual_user_id = 1

            # Get uploaded frame
            uploaded = frame or form.get("frame")

            if uploaded and hasattr(
                uploaded,
                "read"
            ):

                image_bytes = await uploaded.read()

            elif isinstance(
                uploaded,
                bytes
            ):

                image_bytes = uploaded

        # ----------------------------------------------------
        # JSON / Base64 image
        # ----------------------------------------------------

        elif "application/json" in content_type:

            body = await request.json()

            if (
                actual_user_id is None
                and "user_id" in body
            ):

                try:
                    actual_user_id = int(
                        body.get(
                            "user_id",
                            1
                        )
                    )

                except Exception:
                    actual_user_id = 1

            img_data = body.get(
                "image",
                ""
            )

            if img_data:

                if "," in img_data:

                    img_data = img_data.split(
                        ",",
                        1
                    )[1]

                image_bytes = base64.b64decode(
                    img_data
                )

        # ----------------------------------------------------
        # Default user
        # ----------------------------------------------------

        if actual_user_id is None:
            actual_user_id = 1

        # ----------------------------------------------------
        # Make sure image exists
        # ----------------------------------------------------

        if not image_bytes:

            raise HTTPException(
                status_code=400,
                detail="No image data received"
            )

        # ====================================================
        # 2. CONVERT IMAGE TO NUMPY
        # ====================================================

        np_array = np.frombuffer(
            image_bytes,
            dtype=np.uint8
        )

        # ====================================================
        # 3. DECODE IMAGE
        # ====================================================

        image = cv2.imdecode(
            np_array,
            cv2.IMREAD_COLOR
        )

        if image is None:

            raise HTTPException(
                status_code=400,
                detail="Invalid image frame"
            )

        # ====================================================
        # 4. MEDIAPIPE FACE DETECTION
        # ====================================================

        rgb_frame = cv2.cvtColor(
            image,
            cv2.COLOR_BGR2RGB
        )

        face_results = (
            face_detection.process(
                rgb_frame
            )
        )

        face_count = 0

        if face_results.detections:

            face_count = len(
                face_results.detections
            )

        # ====================================================
        # 5. YOLO PERSON + OBJECT DETECTION
        # ====================================================

        yolo_results = proctor_model(
            image,
            imgsz=960,
            conf=0.20,
            verbose=False
        )

        # ----------------------------------------------------
        # Detection variables
        # ----------------------------------------------------

        phone_detected = False

        phone_confidence = 0.0

        person_count = 0

        detected_objects = []

        # ====================================================
        # 6. PROCESS YOLO RESULTS
        # ====================================================

        for result in yolo_results:

            if result.boxes is None:
                continue

            for box in result.boxes:

                # --------------------------------------------
                # Class ID
                # --------------------------------------------

                class_id = int(
                    box.cls[0]
                )

                # --------------------------------------------
                # Confidence
                # --------------------------------------------

                confidence = float(
                    box.conf[0]
                )

                # --------------------------------------------
                # Class name
                # --------------------------------------------

                class_name = (
                    proctor_model.names[
                        class_id
                    ]
                )

                # --------------------------------------------
                # Save detected object
                # --------------------------------------------

                detected_objects.append(
                    {
                        "object": class_name,
                        "confidence": round(
                            confidence,
                            2
                        )
                    }
                )

                # --------------------------------------------
                # PERSON DETECTION
                # --------------------------------------------

                if class_name == "person":

                    person_count += 1

                # --------------------------------------------
                # PHONE DETECTION
                # --------------------------------------------

                if (
                    class_name == "cell phone"
                    and confidence >= 0.20
                ):

                    phone_detected = True

                    # Keep highest phone confidence
                    if (
                        confidence
                        > phone_confidence
                    ):

                        phone_confidence = (
                            confidence
                        )

        # ====================================================
        # 7. DEBUG INFORMATION
        # ====================================================

        print(
            f"[PROCTOR] "
            f"user={actual_user_id} | "
            f"faces={face_count} | "
            f"persons={person_count} | "
            f"phone={phone_detected}"
        )

        # ====================================================
        # 8. DETERMINE VIOLATIONS
        # ====================================================

        violations = []

        # ----------------------------------------------------
        # NO PERSON
        # ----------------------------------------------------

        if (
            face_count == 0
            and person_count == 0
        ):

            violations.append(
                "No person detected!"
            )

        # ----------------------------------------------------
        # MULTIPLE PEOPLE
        #
        # We use BOTH:
        #
        # MediaPipe face count
        # AND
        # YOLO person count
        #
        # If either detector sees > 1,
        # trigger the warning.
        # ----------------------------------------------------

        elif (
            face_count > 1
            or person_count > 1
        ):

            violations.append(
                "Multiple people detected!"
            )

        # ----------------------------------------------------
        # PHONE
        # ----------------------------------------------------

        if phone_detected:

            violations.append(
                "Mobile phone detected! "
                f"Confidence: "
                f"{phone_confidence:.2f}"
            )

        # ====================================================
        # 9. BUILD WARNING
        # ====================================================

        warning = None

        if violations:

            warning = " | ".join(
                violations
            )

        # ====================================================
        # 10. FINAL RESPONSE
        # ====================================================

        response = {

            "status": "success",

            "user_id": actual_user_id,

            "alert": (
                len(violations) > 0
            ),

            "warning": warning,

            "violations": violations,

            "phone_detected": phone_detected,

            "face_count": face_count,

            "person_count": person_count,

            "detected_objects": detected_objects
        }

        # ----------------------------------------------------
        # Print response for debugging
        # ----------------------------------------------------

        print(
            f"[PROCTOR RESPONSE] "
            f"{response}"
        )

        return response

    # ========================================================
    # HTTP EXCEPTION
    # ========================================================

    except HTTPException:

        raise

    # ========================================================
    # GENERAL ERROR
    # ========================================================

    except Exception as e:

        print(
            f"[PROCTOR ERROR] {e}"
        )

        return {

            "status": "error",

            "user_id": actual_user_id,

            "alert": False,

            "warning": None,

            "violations": [],

            "phone_detected": False,

            "face_count": 0,

            "person_count": 0,

            "detected_objects": [],

            "error": str(e)
        }
# ============================================================
# CODING GENERATE
# ============================================================

@app.post("/api/coding/generate")
def generate_coding_assessment(
    data: CodingGenerateRequest,
    db: Session = Depends(
        database.get_db
    )
):

    user = (
        db.query(models.User)
        .filter(
            models.User.id ==
            data.user_id
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    existing_assessment = (
        db.query(
            models.CodingAssessment
        )
        .filter(
            models.CodingAssessment.user_id ==
            data.user_id,

            models.CodingAssessment.status.in_(
                [
                    "not_started",
                    "in_progress"
                ]
            )
        )
        .order_by(
            models.CodingAssessment.id.desc()
        )
        .first()
    )

    if existing_assessment:

        return {

            "assessment_id":
            existing_assessment.id,

            "title":
            existing_assessment.title,

            "difficulty":
            existing_assessment.difficulty,

            "topic":
            existing_assessment.topic,

            "description":
            existing_assessment.description,

            "constraints":
            existing_assessment.constraints,

            "examples":
            existing_assessment.examples,

            "function_name":
            existing_assessment.function_name,

            "starter_code":
            existing_assessment.starter_code,

            "status":
            existing_assessment.status,

            "message":
            "Existing coding assessment loaded"
        }

    attempts = 0

    problem = None

    while attempts < 3:

        attempts += 1

        try:

            problem = (
                generate_coding_problem(
                    skills=data.skills,
                    difficulty=
                    data.difficulty
                )
            )

            valid, message = (
                validate_problem(
                    problem
                )
            )

            if valid:

                break

            problem = None

        except Exception as e:

            print(
                f"Coding problem generation error: {e}"
            )

    if not problem:

        raise HTTPException(
            status_code=500,
            detail=
            "Unable to generate a valid coding assessment"
        )

    assessment = (
        models.CodingAssessment(
            user_id=data.user_id,
            title=problem["title"],
            difficulty=problem["difficulty"],
            topic=problem["topic"],
            description=problem["description"],
            constraints=problem["constraints"],
            examples=problem["examples"],
            function_name=problem["function_name"],
            starter_code=problem["starter_code"],
            hidden_test_cases=
            problem["hidden_test_cases"],
            status="not_started",
            score=0
        )
    )

    db.add(
        assessment
    )

    db.commit()

    db.refresh(
        assessment
    )

    return {

        "assessment_id":
        assessment.id,

        "title":
        assessment.title,

        "difficulty":
        assessment.difficulty,

        "topic":
        assessment.topic,

        "description":
        assessment.description,

        "constraints":
        assessment.constraints,

        "examples":
        assessment.examples,

        "function_name":
        assessment.function_name,

        "starter_code":
        assessment.starter_code,

        "status":
        assessment.status,

        "message":
        "New coding assessment generated"
    }


# ============================================================
# CODING SUBMIT
# ============================================================

@app.post("/api/coding/submit")
def submit_coding_code(
    data: CodingSubmitRequest,
    db: Session = Depends(
        database.get_db
    )
):

    assessment = (
        db.query(
            models.CodingAssessment
        )
        .filter(
            models.CodingAssessment.id ==
            data.assessment_id
        )
        .first()
    )

    if not assessment:

        raise HTTPException(
            status_code=404,
            detail=
            "Coding assessment not found"
        )

    results = run_code(
        code=data.code,
        function_name=
        assessment.function_name,
        test_cases=
        assessment.hidden_test_cases
    )

    total_tests = len(
        results
    )

    passed_tests = 0

    for result, test_case in zip(
        results,
        assessment.hidden_test_cases
    ):

        if (
            result["status"] ==
            "success"
        ):

            actual_output = (
                result["output"]
            )

            expected_output = (
                test_case[
                    "expected_output"
                ]
            )

            if (
                str(actual_output) ==
                str(expected_output)
            ):

                passed_tests += 1

    if total_tests > 0:

        score = int(
            (
                passed_tests /
                total_tests
            ) * 100
        )

    else:

        score = 0

    assessment.score = score

    assessment.status = "submitted"

    assessment.submitted_at = (
        datetime.utcnow()
    )

    db.commit()

    return {

        "assessment_id":
        assessment.id,

        "total_tests":
        total_tests,

        "passed_tests":
        passed_tests,

        "failed_tests":
        total_tests -
        passed_tests,

        "score":
        score,

        "status":
        assessment.status,

        "results":
        results
    }


# ============================================================
# CODING RUN
# ============================================================

@app.post("/api/coding/run")
def run_coding_code(
    data: CodingRunRequest,
    db: Session = Depends(
        database.get_db
    )
):

    assessment = (
        db.query(
            models.CodingAssessment
        )
        .filter(
            models.CodingAssessment.id ==
            data.assessment_id
        )
        .first()
    )

    if not assessment:

        raise HTTPException(
            status_code=404,
            detail=
            "Coding assessment not found"
        )

    results = run_code(
        code=data.code,
        function_name=
        assessment.function_name,
        test_cases=[
            {
                "input":
                data.test_input
            }
        ]
    )

    return {

        "assessment_id":
        assessment.id,

        "results":
        results
    }


# ============================================================
# STUDENT DASHBOARD
# ============================================================

@app.get("/api/student/{user_id}/dashboard")
def get_student_dashboard(
    user_id: int,
    db: Session = Depends(
        database.get_db
    )
):

    user = (
        db.query(models.User)
        .filter(
            models.User.id ==
            user_id
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    profile = (
        db.query(
            models.StudentProfile
        )
        .filter(
            models.StudentProfile.user_id ==
            user_id
        )
        .first()
    )

    coding_assessment = (
        db.query(
            models.CodingAssessment
        )
        .filter(
            models.CodingAssessment.user_id ==
            user_id
        )
        .order_by(
            models.CodingAssessment.id.desc()
        )
        .first()
    )

    resume_status = "Pending"

    resume_filename = None

    if (
        profile
        and profile.resume_filename
    ):

        resume_status = "Completed"

        resume_filename = (
            profile.resume_filename
        )

    coding_status = "Not Started"

    coding_score = None

    if coding_assessment:

        coding_status = (
            coding_assessment.status
        )

        if coding_status == "submitted":

            coding_score = (
                coding_assessment.score
            )

    interview_score = "Pending"

    interview_numeric_score = None

    if profile:

        interview_score = (
            profile.interview_score
            or "Pending"
        )

        interview_numeric_score = (
            get_interview_numeric_score(
                interview_score
            )
        )

    overall_status = calculate_overall_status(
        coding_status,
        interview_numeric_score
    )

    readiness_score, readiness_label = (
        calculate_readiness(
            resume_status == "Completed",
            coding_score,
            interview_numeric_score
        )
    )

    return {

        "user": {

            "id":
            user.id,

            "email":
            user.email,

            "full_name":
            user.full_name,

            "role":
            user.role
        },

        "resume": {

            "status":
            resume_status,

            "filename":
            resume_filename
        },

        "coding": {

            "status":
            coding_status,

            "score":
            coding_score
        },

        "interview": {

            "score":
            interview_score,

            "numeric_score":
            interview_numeric_score
        },

        "readiness": {

            "score":
            readiness_score,

            "label":
            readiness_label
        },

        "overall_status":
        overall_status
    }


# ============================================================
# ALL STUDENTS
# ============================================================

@app.get("/api/students")
def get_all_students(
    db: Session = Depends(
        database.get_db
    )
):

    students = (
        db.query(models.User)
        .filter(
            models.User.role == "student"
        )
        .order_by(
            models.User.id.desc()
        )
        .all()
    )

    result = []

    for student in students:

        profile = (
            db.query(
                models.StudentProfile
            )
            .filter(
                models.StudentProfile.user_id ==
                student.id
            )
            .first()
        )

        coding_assessment = (
            db.query(
                models.CodingAssessment
            )
            .filter(
                models.CodingAssessment.user_id ==
                student.id
            )
            .order_by(
                models.CodingAssessment.id.desc()
            )
            .first()
        )

        resume_status = "Pending"

        if (
            profile
            and profile.resume_filename
        ):

            resume_status = "Completed"

        coding_status = "Not Started"

        coding_score = None

        if coding_assessment:

            coding_status = (
                coding_assessment.status
            )

            if coding_status == "submitted":

                coding_score = (
                    coding_assessment.score
                )

        interview_score = "Pending"

        interview_numeric_score = None

        if profile:

            interview_score = (
                profile.interview_score
                or "Pending"
            )

            interview_numeric_score = (
                get_interview_numeric_score(
                    interview_score
                )
            )

        overall_status = calculate_overall_status(
            coding_status,
            interview_numeric_score
        )

        readiness_score, readiness_label = (
            calculate_readiness(
                resume_status == "Completed",
                coding_score,
                interview_numeric_score
            )
        )

        result.append(
            {

                "id":
                student.id,

                "full_name":
                student.full_name,

                "email":
                student.email,

                "resume_status":
                resume_status,

                "coding_status":
                coding_status,

                "coding_score":
                coding_score,

                "interview_score":
                interview_score,

                "interview_numeric_score":
                interview_numeric_score,

                "overall_status":
                overall_status,

                "readiness_score":
                readiness_score,

                "readiness_label":
                readiness_label
            }
        )

    return result


# ============================================================
# STUDENT DETAIL
# ============================================================

@app.get("/api/students/{student_id}")
def get_student_detail(
    student_id: int,
    db: Session = Depends(
        database.get_db
    )
):

    student = (
        db.query(models.User)
        .filter(
            models.User.id ==
            student_id,

            models.User.role ==
            "student"
        )
        .first()
    )

    if not student:

        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    profile = (
        db.query(
            models.StudentProfile
        )
        .filter(
            models.StudentProfile.user_id ==
            student_id
        )
        .first()
    )

    coding_assessment = (
        db.query(
            models.CodingAssessment
        )
        .filter(
            models.CodingAssessment.user_id ==
            student_id
        )
        .order_by(
            models.CodingAssessment.id.desc()
        )
        .first()
    )

    interview_session = (
        db.query(
            models.InterviewSession
        )
        .filter(
            models.InterviewSession.user_id ==
            student_id
        )
        .order_by(
            models.InterviewSession.id.desc()
        )
        .first()
    )

    interview_answers = []

    if interview_session:

        answers = (
            db.query(
                models.InterviewAnswer
            )
            .filter(
                models.InterviewAnswer.session_id ==
                interview_session.id
            )
            .order_by(
                models.InterviewAnswer.question_number
            )
            .all()
        )

        for answer in answers:

            interview_answers.append(
                {

                    "id":
                    answer.id,

                    "question_number":
                    answer.question_number,

                    "question":
                    answer.question,

                    "answer":
                    answer.answer,

                    "score":
                    answer.score,

                    "feedback":
                    answer.feedback
                }
            )

    coding_score = None

    coding_status = "Not Started"

    if coding_assessment:

        coding_status = (
            coding_assessment.status
        )

        if coding_status == "submitted":

            coding_score = (
                coding_assessment.score
            )

    interview_score = "Pending"

    interview_numeric_score = None

    if profile:

        interview_score = (
            profile.interview_score
            or "Pending"
        )

        interview_numeric_score = (
            get_interview_numeric_score(
                interview_score
            )
        )

    resume_completed = (
        profile is not None
        and
        bool(
            profile.resume_filename
        )
    )

    overall_status = calculate_overall_status(
        coding_status,
        interview_numeric_score
    )

    readiness_score, readiness_label = (
        calculate_readiness(
            resume_completed,
            coding_score,
            interview_numeric_score
        )
    )

    return {

        "id":
        student.id,

        "full_name":
        student.full_name,

        "email":
        student.email,

        "resume_filename":
        profile.resume_filename
        if profile
        else None,

        "resume_text":
        profile.resume_text
        if profile
        else None,

        "coding_status":
        coding_status,

        "coding_score":
        coding_score,

        "interview_score":
        interview_score,

        "interview_numeric_score":
        interview_numeric_score,

        "overall_status":
        overall_status,

        "readiness_score":
        readiness_score,

        "readiness_label":
        readiness_label,

        "interview_answers":
        interview_answers
    }


# ============================================================
# STUDENT RESULTS
# ============================================================

@app.get("/api/student/{user_id}/results")
def get_student_results(
    user_id: int,
    db: Session = Depends(
        database.get_db
    )
):

    user = (
        db.query(models.User)
        .filter(
            models.User.id == user_id
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    profile = (
        db.query(
            models.StudentProfile
        )
        .filter(
            models.StudentProfile.user_id ==
            user_id
        )
        .first()
    )

    coding_assessment = (
        db.query(
            models.CodingAssessment
        )
        .filter(
            models.CodingAssessment.user_id ==
            user_id
        )
        .order_by(
            models.CodingAssessment.id.desc()
        )
        .first()
    )

    interview_session = (
        db.query(
            models.InterviewSession
        )
        .filter(
            models.InterviewSession.user_id ==
            user_id
        )
        .order_by(
            models.InterviewSession.id.desc()
        )
        .first()
    )

    interview_answers = []

    if interview_session:

        answers = (
            db.query(
                models.InterviewAnswer
            )
            .filter(
                models.InterviewAnswer.session_id ==
                interview_session.id
            )
            .order_by(
                models.InterviewAnswer.question_number
            )
            .all()
        )

        for answer in answers:

            interview_answers.append(
                {

                    "id":
                    answer.id,

                    "question_number":
                    answer.question_number,

                    "question":
                    answer.question,

                    "answer":
                    answer.answer,

                    "score":
                    answer.score,

                    "feedback":
                    answer.feedback
                }
            )

    resume_status = "Pending"

    if (
        profile
        and profile.resume_filename
    ):

        resume_status = "Completed"

    coding_status = "Not Started"

    coding_score = None

    if coding_assessment:

        coding_status = (
            coding_assessment.status
        )

        if coding_status == "submitted":

            coding_score = (
                coding_assessment.score
            )

    interview_score = "Pending"

    interview_numeric_score = None

    if profile:

        interview_score = (
            profile.interview_score
            or "Pending"
        )

        interview_numeric_score = (
            get_interview_numeric_score(
                interview_score
            )
        )

    overall_status = calculate_overall_status(
        coding_status,
        interview_numeric_score
    )

    readiness_score, readiness_label = (
        calculate_readiness(
            resume_status == "Completed",
            coding_score,
            interview_numeric_score
        )
    )

    return {

        "user": {

            "id":
            user.id,

            "full_name":
            user.full_name,

            "email":
            user.email
        },

        "resume_status":
        resume_status,

        "resume_filename":
        profile.resume_filename
        if profile
        else None,

        "coding_status":
        coding_status,

        "coding_score":
        coding_score,

        "interview_score":
        interview_score,

        "interview_numeric_score":
        interview_numeric_score,

        "overall_status":
        overall_status,

        "readiness_score":
        readiness_score,

        "readiness_label":
        readiness_label,

        "interview_answers":
        interview_answers
    }


# ============================================================
# EXPORT REPORT
# ============================================================

@app.get("/api/export-report")
def export_report(
    db: Session = Depends(
        database.get_db
    )
):

    students = (
        db.query(models.User)
        .filter(
            models.User.role == "student"
        )
        .order_by(
            models.User.id.asc()
        )
        .all()
    )

    output = io.StringIO()

    writer = csv.writer(
        output
    )

    writer.writerow(
        [
            "Student ID",
            "Name",
            "Email",
            "Resume Status",
            "Coding Status",
            "Coding Score",
            "Interview Score",
            "Overall Status",
            "Readiness Score",
            "Readiness Label"
        ]
    )

    for student in students:

        profile = (
            db.query(
                models.StudentProfile
            )
            .filter(
                models.StudentProfile.user_id ==
                student.id
            )
            .first()
        )

        coding_assessment = (
            db.query(
                models.CodingAssessment
            )
            .filter(
                models.CodingAssessment.user_id ==
                student.id
            )
            .order_by(
                models.CodingAssessment.id.desc()
            )
            .first()
        )

        resume_status = "Pending"

        if (
            profile
            and profile.resume_filename
        ):

            resume_status = "Completed"

        coding_status = "Not Started"

        coding_score = ""

        if coding_assessment:

            coding_status = (
                coding_assessment.status
            )

            if coding_status == "submitted":

                coding_score = (
                    coding_assessment.score
                )

        interview_score = "Pending"

        interview_numeric_score = None

        if profile:

            interview_score = (
                profile.interview_score
                or "Pending"
            )

            interview_numeric_score = (
                get_interview_numeric_score(
                    interview_score
                )
            )

        overall_status = calculate_overall_status(
            coding_status,
            interview_numeric_score
        )

        readiness_score, readiness_label = (
            calculate_readiness(
                resume_status == "Completed",

                coding_assessment.score
                if (
                    coding_assessment
                    and
                    coding_status == "submitted"
                )
                else None,

                interview_numeric_score
            )
        )

        writer.writerow(
            [
                student.id,
                student.full_name,
                student.email,
                resume_status,
                coding_status,
                coding_score,
                interview_score,
                overall_status,
                readiness_score,
                readiness_label
            ]
        )

    output.seek(0)

    filename = (
        "campus_to_career_report.csv"
    )

    return StreamingResponse(
        iter(
            [
                output.getvalue()
            ]
        ),
        media_type="text/csv",
        headers={
            "Content-Disposition":
            f"attachment; filename={filename}"
        }
    )