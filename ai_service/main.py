"""FastAPI entrypoint for TESTIFY AI test generation service."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional

from fastapi import Body, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

from services.question_generator import (
    DEFAULT_GEMINI_MODEL,
    QuestionGeneratorService,
    set_default_generator,
)
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
    negative_marks: float = 1

    model_config = ConfigDict(extra="allow")


class FullTestRequest(BaseModel):
    difficulty: str = "medium"
    marks: int = 4
    negative_marks: float = 1

    model_config = ConfigDict(extra="allow")


FULL_LENGTH_BLUEPRINT = [
    {
        "section_name": "Mathematics",
        "subject": "Mathematics",
        "subject_filter": "Mathematics",
        "topic": "Mathematics",
        "question_count": 50,
        "duration_minutes": 70,
        "marks": 12,
        "negative_marks": 3,
    },
    {
        "section_name": "Analytical Ability & Logical Reasoning",
        "subject": "Analytical Ability & Logical Reasoning",
        "subject_filter": "Analytical Ability & Logical Reasoning",
        "topic": "Analytical Ability & Logical Reasoning",
        "question_count": 40,
        "duration_minutes": 30,
        "marks": 6,
        "negative_marks": 1.5,
    },
    {
        "section_name": "Computer Awareness",
        "subject": "Computer Awareness",
        "subject_filter": "Computer Awareness & General English",
        "topic": "Computer Awareness",
        "question_count": 20,
        "duration_minutes": 10,
        "marks": 6,
        "negative_marks": 1.5,
    },
    {
        "section_name": "General English",
        "subject": "General English",
        "subject_filter": "Computer Awareness & General English",
        "topic": "General English",
        "question_count": 10,
        "duration_minutes": 10,
        "marks": 4,
        "negative_marks": 1,
    },
]

NIMCET_SECTION_TIME_ALLOCATIONS = [
    {"section": "Mathematics", "duration_minutes": 70},
    {"section": "Analytical Ability & Logical Reasoning", "duration_minutes": 30},
    {"section": "Computer + General English", "duration_minutes": 20},
]

NIMCET_MARKING_SCHEME = [
    {"section": "Mathematics", "marks": 12, "negative_marks": 3},
    {"section": "Analytical Ability & Logical Reasoning", "marks": 6, "negative_marks": 1.5},
    {"section": "Computer Awareness", "marks": 6, "negative_marks": 1.5},
    {"section": "General English", "marks": 4, "negative_marks": 1},
]

NIMCET_TOTAL_MARKS = 1000
NIMCET_TOTAL_DURATION_MINUTES = 120


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
            model_name=DEFAULT_GEMINI_MODEL,
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
        generation_bundle = question_generator_service.generate_mcq_bundle(
            subject=payload.subject,
            topic=payload.topic,
            question_count=payload.question_count,
            difficulty=payload.difficulty,
            marks=payload.marks,
            negative_marks=payload.negative_marks,
            distribution_mode="topic",
        )

        questions = generation_bundle["questions"]

        logger.info(
            "question generation success endpoint=/generate-topic-test generated=%s",
            len(questions),
        )
        return {
            "questions": questions,
            "generation_seed": generation_bundle["generation_seed"],
            "difficulty_distribution": generation_bundle["difficulty_distribution"],
            "concept_coverage_count": generation_bundle["concept_coverage_count"],
            "concept_distribution": generation_bundle["concept_distribution"],
            "diversity_score": generation_bundle["diversity_score"],
        }
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
        dedupe_state: dict = {}
        section_generation_meta: List[dict] = []

        for blueprint in FULL_LENGTH_BLUEPRINT:
            generation_bundle = question_generator_service.generate_mcq_bundle(
                subject=blueprint["subject"],
                topic=blueprint["topic"],
                question_count=blueprint["question_count"],
                difficulty=payload.difficulty,
                marks=blueprint["marks"],
                negative_marks=blueprint["negative_marks"],
                distribution_mode="full_length",
                dedupe_state=dedupe_state,
            )

            section_questions = generation_bundle["questions"]

            if len(section_questions) != blueprint["question_count"]:
                raise RuntimeError(
                    f"Could not generate required unique questions for section {blueprint['section_name']}",
                )

            section_generation_meta.append(
                {
                    "section_name": blueprint["section_name"],
                    "generation_seed": generation_bundle["generation_seed"],
                    "difficulty_distribution": generation_bundle["difficulty_distribution"],
                    "concept_coverage_count": generation_bundle["concept_coverage_count"],
                    "diversity_score": generation_bundle["diversity_score"],
                }
            )

            sections.append(
                {
                    "section": blueprint["section_name"],
                    "section_name": blueprint["section_name"],
                    "subject": blueprint["subject"],
                    "topic": blueprint["topic"],
                    "duration_minutes": blueprint["duration_minutes"],
                    "marks_per_question": blueprint["marks"],
                    "negative_marks": blueprint["negative_marks"],
                    "expected_question_count": blueprint["question_count"],
                    "generated_question_count": len(section_questions),
                    "questions": section_questions,
                }
            )

        logger.info(
            "question generation success endpoint=/generate-full-test sections=%s",
            len(sections),
        )
        return {
            "sections": sections,
            "total_questions": sum(item["question_count"] for item in FULL_LENGTH_BLUEPRINT),
            "total_marks": NIMCET_TOTAL_MARKS,
            "total_duration_minutes": NIMCET_TOTAL_DURATION_MINUTES,
            "section_time_allocations": NIMCET_SECTION_TIME_ALLOCATIONS,
            "marking_scheme": NIMCET_MARKING_SCHEME,
            "section_generation_meta": section_generation_meta,
        }
    except Exception as error:
        logger.exception("full test generation failed")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate full test: {error}",
        ) from error
