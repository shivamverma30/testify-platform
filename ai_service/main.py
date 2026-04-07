"""FastAPI entrypoint for TESTIFY AI test generation service."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional

from fastapi import Body, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

from services.question_generator import QuestionGeneratorService, set_default_generator
from services.retriever_service import RetrieverService, set_default_retriever

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("testify.ai_service")


class TopicTestRequest(BaseModel):
    subject: str
    topic: str
    question_count: int = Field(gt=0, le=200)
    difficulty: str = "medium"
    marks: int = 4
    negative_marks: int = -1

    model_config = ConfigDict(extra="allow")


class FullTestRequest(BaseModel):
    difficulty: str = "medium"
    marks: int = 4
    negative_marks: int = -1

    model_config = ConfigDict(extra="allow")


FULL_LENGTH_BLUEPRINT = [
    {
        "section": "Mathematics",
        "subject": "Mathematics",
        "topic": "Mathematics",
        "question_count": 50,
    },
    {
        "section": "Reasoning",
        "subject": "Analytical Ability & Logical Reasoning",
        "topic": "Logical and Analytical Reasoning",
        "question_count": 40,
    },
    {
        "section": "Computer",
        "subject": "Computer Awareness & General English",
        "topic": "Computer Awareness",
        "question_count": 20,
    },
    {
        "section": "English",
        "subject": "Computer Awareness & General English",
        "topic": "English",
        "question_count": 10,
    },
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.startup_error = None
    app.state.retriever_service = None
    app.state.question_generator_service = None

    try:
        base_dir = Path(__file__).resolve().parent
        index_path = base_dir / "vector_store" / "faiss_index"

        retriever_service = RetrieverService(index_path=index_path, top_k=5)
        retriever_service.load_index()
        set_default_retriever(retriever_service)

        question_generator_service = QuestionGeneratorService(
            retriever_service=retriever_service,
            model_name="gemini-1.5-flash",
            retrieval_top_k=5,
        )
        set_default_generator(question_generator_service)

        app.state.retriever_service = retriever_service
        app.state.question_generator_service = question_generator_service

        logger.info("AI service startup completed successfully")
    except Exception as error:  # pragma: no cover - startup path
        app.state.startup_error = str(error)
        logger.exception("AI service startup failed")

    yield


app = FastAPI(title="TESTIFY AI Service", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_question_generator_service(request: Request) -> QuestionGeneratorService:
    startup_error: Optional[str] = getattr(request.app.state, "startup_error", None)
    if startup_error:
        raise HTTPException(
            status_code=500,
            detail=f"AI service initialization failed: {startup_error}",
        )

    question_generator_service: Optional[QuestionGeneratorService] = getattr(
        request.app.state,
        "question_generator_service",
        None,
    )

    if question_generator_service is None:
        raise HTTPException(status_code=500, detail="Question generator service is not initialized")

    return question_generator_service


@app.get("/")
def health_check() -> dict:
    return {"status": "AI service running"}


@app.post("/generate-topic-test")
def generate_topic_test(payload: TopicTestRequest, request: Request) -> dict:
    logger.info(
        "AI request start endpoint=/generate-topic-test subject=%s topic=%s question_count=%s",
        payload.subject,
        payload.topic,
        payload.question_count,
    )

    question_generator_service = get_question_generator_service(request)

    try:
        questions = question_generator_service.generate_mcq(
            subject=payload.subject,
            topic=payload.topic,
            question_count=payload.question_count,
            difficulty=payload.difficulty,
        )

        logger.info(
            "question generation success endpoint=/generate-topic-test generated=%s",
            len(questions),
        )
        return {"questions": questions}
    except Exception as error:
        logger.exception("topic test generation failed")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate topic test: {error}",
        ) from error


@app.post("/generate-full-test")
def generate_full_test(
    payload: FullTestRequest = Body(default_factory=FullTestRequest),
    request: Request = None,
) -> dict:
    logger.info("AI request start endpoint=/generate-full-test")

    question_generator_service = get_question_generator_service(request)

    try:
        sections: List[dict] = []

        for blueprint in FULL_LENGTH_BLUEPRINT:
            section_questions = question_generator_service.generate_mcq(
                subject=blueprint["subject"],
                topic=blueprint["topic"],
                question_count=blueprint["question_count"],
                difficulty=payload.difficulty,
            )

            sections.append(
                {
                    "section": blueprint["section"],
                    "questions": section_questions,
                }
            )

        logger.info(
            "question generation success endpoint=/generate-full-test sections=%s",
            len(sections),
        )
        return {"sections": sections}
    except Exception as error:
        logger.exception("full test generation failed")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate full test: {error}",
        ) from error
