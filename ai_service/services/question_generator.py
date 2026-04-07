"""Question generation service using RAG context and Gemini LLM."""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

import google.generativeai as genai

from services.retriever_service import RetrieverService

logger = logging.getLogger(__name__)

_ALLOWED_OPTIONS = ["A", "B", "C", "D"]


class QuestionGeneratorService:
    """Generates concept-based MCQs using retrieved context and Gemini."""

    def __init__(
        self,
        retriever_service: RetrieverService,
        model_name: str = "gemini-1.5-flash",
        retrieval_top_k: int = 5,
    ) -> None:
        self.retriever_service = retriever_service
        self.model_name = model_name
        self.retrieval_top_k = retrieval_top_k
        self.model: Optional[genai.GenerativeModel] = None

        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel(self.model_name)

    def _ensure_model(self) -> genai.GenerativeModel:
        if self.model is None:
            raise RuntimeError("GEMINI_API_KEY or GOOGLE_API_KEY is not configured for question generation")
        return self.model

    @staticmethod
    def _extract_json_text(raw_text: str) -> str:
        fenced = re.search(r"```(?:json)?\s*(.*?)```", raw_text, re.DOTALL | re.IGNORECASE)
        if fenced:
            return fenced.group(1).strip()
        return raw_text.strip()

    @staticmethod
    def _coerce_question_list(payload: Any) -> List[Dict[str, Any]]:
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]

        if isinstance(payload, dict):
            for key in ("questions", "data", "result"):
                value = payload.get(key)
                if isinstance(value, list):
                    return [item for item in value if isinstance(item, dict)]

        return []

    @staticmethod
    def _normalize_options(raw: Dict[str, Any]) -> List[str]:
        if isinstance(raw.get("options"), list):
            options = [str(item).strip() for item in raw["options"] if str(item).strip()]
            if len(options) >= 4:
                return options[:4]

        if isinstance(raw.get("options"), dict):
            options_obj = raw["options"]
            options = [
                str(options_obj.get("A") or options_obj.get("a") or "").strip(),
                str(options_obj.get("B") or options_obj.get("b") or "").strip(),
                str(options_obj.get("C") or options_obj.get("c") or "").strip(),
                str(options_obj.get("D") or options_obj.get("d") or "").strip(),
            ]
            if all(options):
                return options

        fallback = [
            str(raw.get("option_a") or raw.get("optionA") or raw.get("A") or "").strip(),
            str(raw.get("option_b") or raw.get("optionB") or raw.get("B") or "").strip(),
            str(raw.get("option_c") or raw.get("optionC") or raw.get("C") or "").strip(),
            str(raw.get("option_d") or raw.get("optionD") or raw.get("D") or "").strip(),
        ]

        if not all(fallback):
            raise ValueError("Question must include exactly 4 options")

        return fallback

    @staticmethod
    def _normalize_correct_answer(raw: Dict[str, Any], options: List[str]) -> str:
        raw_answer = (
            raw.get("correct_answer")
            or raw.get("correctOption")
            or raw.get("correct_option")
            or raw.get("answer")
            or ""
        )

        candidate = str(raw_answer).strip()
        if not candidate:
            raise ValueError("Question must include correct_answer")

        upper = candidate.upper()
        if upper in _ALLOWED_OPTIONS:
            return upper

        for index, option in enumerate(options):
            if option.lower() == candidate.lower():
                return _ALLOWED_OPTIONS[index]

        raise ValueError("correct_answer must match option letter or one option text")

    @staticmethod
    def _normalize_question(raw: Dict[str, Any]) -> Dict[str, Any]:
        question_text = str(
            raw.get("question")
            or raw.get("question_text")
            or raw.get("questionText")
            or "",
        ).strip()

        if not question_text:
            raise ValueError("Question text is missing")

        options = QuestionGeneratorService._normalize_options(raw)
        correct_answer = QuestionGeneratorService._normalize_correct_answer(raw, options)

        return {
            "question": question_text,
            "options": options,
            "correct_answer": correct_answer,
        }

    def generate_mcq(
        self,
        subject: str,
        topic: str,
        question_count: int,
        difficulty: str = "medium",
    ) -> List[Dict[str, Any]]:
        model = self._ensure_model()

        query = f"{subject} - {topic}"
        contexts = self.retriever_service.retrieve_context(query=query, top_k=self.retrieval_top_k)
        logger.info(
            "retrieval success subject=%s topic=%s chunks=%s",
            subject,
            topic,
            len(contexts),
        )

        if not contexts:
            raise RuntimeError("No relevant context found in the FAISS knowledge base")

        context_text = "\n\n".join(contexts)

        prompt = f"""
You are an expert exam question setter.
Generate exactly {question_count} concept-based multiple-choice questions.

Rules:
- Subject: {subject}
- Topic: {topic}
- Difficulty: {difficulty}
- 4 options per question
- one correct answer
- clear and exam-ready wording

Return ONLY valid JSON in this shape:
{{
  "questions": [
    {{
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correct_answer": "A"
    }}
  ]
}}

Knowledge Context:
{context_text[:14000]}
""".strip()

        response = model.generate_content(prompt)
        raw_text = getattr(response, "text", "")

        if not raw_text:
            raise RuntimeError("Gemini returned an empty response")

        json_text = self._extract_json_text(raw_text)
        parsed = json.loads(json_text)

        raw_questions = self._coerce_question_list(parsed)
        if not raw_questions:
            raise RuntimeError("Gemini response did not contain questions")

        normalized_questions: List[Dict[str, Any]] = []
        for raw_question in raw_questions:
            normalized_questions.append(self._normalize_question(raw_question))
            if len(normalized_questions) >= question_count:
                break

        if not normalized_questions:
            raise RuntimeError("No valid questions could be parsed from Gemini response")

        logger.info(
            "question generation success subject=%s topic=%s generated=%s",
            subject,
            topic,
            len(normalized_questions),
        )
        return normalized_questions


_default_generator: Optional[QuestionGeneratorService] = None


def set_default_generator(service: QuestionGeneratorService) -> None:
    global _default_generator
    _default_generator = service


def generate_mcq(subject: str, topic: str, question_count: int, difficulty: str = "medium") -> List[Dict[str, Any]]:
    if _default_generator is None:
        raise RuntimeError("QuestionGeneratorService has not been initialized")

    return _default_generator.generate_mcq(
        subject=subject,
        topic=topic,
        question_count=question_count,
        difficulty=difficulty,
    )
