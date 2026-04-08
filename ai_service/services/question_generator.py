"""Question generation service using RAG context and Gemini LLM."""

from __future__ import annotations

import json
import logging
import math
import random
import re
import secrets
import time
from collections import Counter
from typing import Any, Dict, List, Optional, Sequence, Tuple

import google.generativeai as genai
from langchain_core.documents import Document

from config import require_gemini_api_key
from services.retriever_service import RetrieverService

logger = logging.getLogger(__name__)

_ALLOWED_OPTIONS = ["A", "B", "C", "D"]
DEFAULT_GEMINI_MODEL = "gemini-flash-latest"
FALLBACK_GEMINI_MODELS = (
    DEFAULT_GEMINI_MODEL,
    "gemini-pro-latest",
    "gemini-2.0-flash",
)

GENERATION_CONFIG = {
    "temperature": 0.7,
    "top_p": 0.9,
    "candidate_count": 1,
}

SIMILARITY_DUPLICATE_THRESHOLD = 0.85
MIN_DIVERSITY_SCORE = 0.55

TOPIC_DIFFICULTY_DISTRIBUTIONS = {
    "easy": {"easy": 0.6, "medium": 0.3, "hard": 0.1},
    "medium": {"easy": 0.3, "medium": 0.5, "hard": 0.2},
    "hard": {"easy": 0.1, "medium": 0.3, "hard": 0.6},
}

FULL_LENGTH_DIFFICULTY_DISTRIBUTION = {
    "easy": 0.3,
    "medium": 0.5,
    "hard": 0.2,
}

STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "if",
    "in",
    "into",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "their",
    "there",
    "these",
    "this",
    "to",
    "was",
    "were",
    "with",
    "which",
    "what",
    "when",
    "where",
    "why",
    "how",
    "you",
    "your",
    "can",
    "will",
    "would",
    "should",
    "could",
}


class QuestionGeneratorService:
    """Generates concept-based MCQs using retrieved context and Gemini."""

    def __init__(
        self,
        retriever_service: RetrieverService,
        model_name: str = DEFAULT_GEMINI_MODEL,
        retrieval_top_k: int = 5,
    ) -> None:
        self.retriever_service = retriever_service
        self.model_name = model_name
        self.retrieval_top_k = retrieval_top_k
        self.model: Optional[genai.GenerativeModel] = None
        self.api_key: str = ""
        self.last_generation_meta: Dict[str, Any] = {}

        self.api_key = require_gemini_api_key()

        try:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(self.model_name)
        except Exception as error:
            raise RuntimeError(
                "Gemini initialization failed. Verify GEMINI_API_KEY/GOOGLE_API_KEY "
                "and Gemini model access.",
            ) from error

    def _ensure_model(self) -> genai.GenerativeModel:
        if self.model is None:
            raise RuntimeError(
                "GEMINI_API_KEY is not configured for question generation. "
                "Set GEMINI_API_KEY (or GOOGLE_API_KEY) in ai_service/.env.",
            )
        return self.model

    @staticmethod
    def _is_model_resolution_error(error: Exception) -> bool:
        error_message = str(error).lower()
        return (
            "not found" in error_message
            or "not supported" in error_message
            or "unsupported" in error_message
            or ("404" in error_message and "model" in error_message)
        )

    @staticmethod
    def _build_rng() -> Tuple[random.Random, int]:
        seed = int(time.time_ns()) ^ secrets.randbits(32)
        return random.Random(seed), seed

    def _generate_with_gemini(self, prompt: str, generation_config: Optional[Dict[str, Any]] = None):
        self._ensure_model()

        config = dict(GENERATION_CONFIG)
        if generation_config:
            config.update(generation_config)

        candidate_models = [self.model_name]
        for fallback_model in FALLBACK_GEMINI_MODELS:
            if fallback_model not in candidate_models:
                candidate_models.append(fallback_model)

        last_error: Optional[Exception] = None

        for candidate_model in candidate_models:
            if self.model is None or candidate_model != self.model_name:
                self.model_name = candidate_model
                self.model = genai.GenerativeModel(candidate_model)

            logger.info("gemini request start model=%s", candidate_model)

            try:
                response = self.model.generate_content(
                    prompt,
                    generation_config=config,
                )
                logger.info("gemini response received model=%s", candidate_model)
                return response
            except Exception as error:
                last_error = error
                logger.error("gemini generation error model=%s error=%s", candidate_model, error)

                if self._is_model_resolution_error(error):
                    continue

                raise RuntimeError(f"Gemini generation failed: {error}") from error

        raise RuntimeError(
            "Gemini generation failed. Tried models: "
            f"{', '.join(candidate_models)}. Last error: {last_error}",
        ) from last_error

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

        concept = str(raw.get("concept") or raw.get("sub_topic") or "").strip()
        difficulty = str(raw.get("difficulty") or "").strip().lower()

        return {
            "question": question_text,
            "options": options,
            "correct_answer": correct_answer,
            "concept": concept,
            "difficulty": difficulty if difficulty in ("easy", "medium", "hard") else "",
        }

    @staticmethod
    def _normalize_question_text(value: str) -> str:
        text = str(value or "").lower()
        text = re.sub(r"[^a-z0-9\s]", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    @staticmethod
    def _cosine_similarity(vector_a: Sequence[float], vector_b: Sequence[float]) -> float:
        if not vector_a or not vector_b:
            return 0.0

        dot_value = sum(a * b for a, b in zip(vector_a, vector_b))
        norm_a = math.sqrt(sum(a * a for a in vector_a))
        norm_b = math.sqrt(sum(b * b for b in vector_b))

        if norm_a == 0 or norm_b == 0:
            return 0.0

        return dot_value / (norm_a * norm_b)

    def _embed_text(self, text: str) -> List[float]:
        vector = self.retriever_service.embeddings.model.encode(
            text,
            show_progress_bar=False,
            convert_to_numpy=True,
        )

        if hasattr(vector, "tolist"):
            return vector.tolist()

        return list(vector)

    def _is_duplicate_question(
        self,
        question_text: str,
        normalized_questions: set,
        question_vectors: List[List[float]],
    ) -> Tuple[bool, str, List[float], float]:
        normalized = self._normalize_question_text(question_text)

        if not normalized:
            return True, normalized, [], 1.0

        if normalized in normalized_questions:
            return True, normalized, [], 1.0

        vector = self._embed_text(normalized)

        max_similarity = 0.0
        for previous_vector in question_vectors:
            similarity = self._cosine_similarity(vector, previous_vector)
            if similarity > max_similarity:
                max_similarity = similarity
            if similarity > SIMILARITY_DUPLICATE_THRESHOLD:
                return True, normalized, vector, similarity

        return False, normalized, vector, max_similarity

    @staticmethod
    def _split_semantic_segments(text: str) -> List[str]:
        parts = re.split(r"\n{2,}|(?<=[.!?])\s+", text or "")
        cleaned = [item.strip() for item in parts if len(item.strip()) >= 70]
        return cleaned[:8]

    @staticmethod
    def _extract_keywords(text: str, max_keywords: int = 5) -> List[str]:
        tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9']+", str(text or "").lower())
        filtered = [
            token
            for token in tokens
            if len(token) >= 4 and token not in STOPWORDS and not token.isdigit()
        ]

        if not filtered:
            return []

        counts = Counter(filtered)
        return [token for token, _ in counts.most_common(max_keywords)]

    def _extract_concepts_from_documents(
        self,
        documents: List[Document],
        topic: str,
        rng: random.Random,
    ) -> List[Dict[str, Any]]:
        concepts: List[Dict[str, Any]] = []
        seen: set = set()

        for doc in documents:
            metadata = doc.metadata or {}
            source_file = str(metadata.get("source_file") or metadata.get("source") or "").strip()
            source_page = metadata.get("page")
            if source_page is None:
                source_page = metadata.get("page_number")
            if source_page is None:
                source_page = metadata.get("page_index")

            segments = self._split_semantic_segments(doc.page_content)
            if not segments and doc.page_content:
                segments = [doc.page_content[:1200]]

            for segment in segments:
                keywords = self._extract_keywords(segment)

                if keywords:
                    concept_name = " ".join(keywords[:2])
                else:
                    concept_name = topic.strip().lower() or "core concept"

                concept_name = concept_name.strip() or "core concept"
                concept_key = (concept_name.lower(), source_file, source_page)

                if concept_key in seen:
                    continue

                seen.add(concept_key)
                concepts.append(
                    {
                        "name": concept_name,
                        "keywords": keywords,
                        "snippet": segment[:1200],
                        "source_file": source_file,
                        "source_page": source_page,
                    }
                )

        rng.shuffle(concepts)

        if not concepts:
            concepts.append(
                {
                    "name": topic.strip() or "core concept",
                    "keywords": self._extract_keywords(topic),
                    "snippet": "",
                    "source_file": "",
                    "source_page": None,
                }
            )

        return concepts

    @staticmethod
    def _target_concept_count(question_count: int) -> int:
        if question_count >= 20:
            return min(7, max(5, question_count // 4))
        if question_count >= 10:
            return min(5, max(3, question_count // 3))
        return max(2, min(3, question_count))

    @staticmethod
    def _distribution_to_counts(total: int, distribution: Dict[str, float]) -> Dict[str, int]:
        base_counts: Dict[str, int] = {}
        fractional_parts: List[Tuple[str, float]] = []

        allocated = 0
        for level in ("easy", "medium", "hard"):
            raw_count = total * distribution[level]
            integer_part = int(math.floor(raw_count))
            base_counts[level] = integer_part
            allocated += integer_part
            fractional_parts.append((level, raw_count - integer_part))

        remaining = total - allocated
        fractional_parts.sort(key=lambda item: item[1], reverse=True)

        for index in range(remaining):
            level = fractional_parts[index % len(fractional_parts)][0]
            base_counts[level] += 1

        return base_counts

    def _resolve_difficulty_counts(
        self,
        question_count: int,
        difficulty: str,
        distribution_mode: str,
    ) -> Dict[str, int]:
        if distribution_mode == "full_length":
            distribution = FULL_LENGTH_DIFFICULTY_DISTRIBUTION
        else:
            distribution = TOPIC_DIFFICULTY_DISTRIBUTIONS.get(
                difficulty,
                TOPIC_DIFFICULTY_DISTRIBUTIONS["medium"],
            )

        return self._distribution_to_counts(question_count, distribution)

    @staticmethod
    def _format_recent_questions(questions: List[str], max_items: int = 10) -> str:
        if not questions:
            return "- none"

        recent = questions[-max_items:]
        return "\n".join(f"- {item}" for item in recent)

    def _select_concepts_for_batch(
        self,
        concept_pool: List[Dict[str, Any]],
        concept_usage: Counter,
        batch_size: int,
        last_concept_name: Optional[str],
        rng: random.Random,
    ) -> List[Dict[str, Any]]:
        ranked = sorted(
            concept_pool,
            key=lambda item: (
                concept_usage[item["name"].lower()],
                rng.random(),
            ),
        )

        selected: List[Dict[str, Any]] = []
        for concept in ranked:
            if len(selected) >= batch_size:
                break

            if last_concept_name and concept["name"].lower() == last_concept_name.lower() and len(ranked) > 1:
                continue

            selected.append(concept)

        if not selected:
            selected = [ranked[0]]

        return selected

    @staticmethod
    def _build_context_from_concepts(concepts: List[Dict[str, Any]], rng: random.Random) -> List[str]:
        context_chunks: List[str] = []

        for concept in concepts:
            source_file = concept.get("source_file") or "unknown_source"
            source_page = concept.get("source_page")
            source_page_text = f"{source_page}" if source_page is not None else "unknown"
            snippet = str(concept.get("snippet") or "").strip()

            if not snippet:
                continue

            context_chunks.append(
                f"[Source: {source_file}, Page: {source_page_text}]\n{snippet[:1200]}",
            )

        rng.shuffle(context_chunks)
        return context_chunks[:6]

    def _build_prompt(
        self,
        *,
        subject: str,
        topic: str,
        difficulty: str,
        question_count: int,
        concepts: List[Dict[str, Any]],
        context_chunks: List[str],
        recent_questions: List[str],
        random_seed: int,
    ) -> str:
        concept_names = [item["name"] for item in concepts if item.get("name")]
        concept_line = ", ".join(concept_names) if concept_names else (topic or "core concepts")

        context_text = "\n\n".join(context_chunks)[:15000]
        recent_question_text = self._format_recent_questions(recent_questions)

        return f"""
You are an expert competitive exam question setter.
Generate exactly {question_count} HIGH-QUALITY {difficulty.upper()} level MCQ questions.

Rules you MUST follow:
1. Subject: {subject}
2. Topic: {topic}
3. Focus on concept coverage from this concept pool: {concept_line}
4. Questions must be concept-based, exam-ready, and non-trivial.
5. Use ONLY the provided context. Do not use external knowledge.
6. Each question must have exactly 4 options.
7. Exactly one correct option.
8. Avoid duplicates and paraphrases of prior questions.
9. Keep wording clear and precise.
10. Assign each question to one concept from the concept pool.
11. Randomization nonce: {random_seed}

Previously accepted questions to avoid repeating:
{recent_question_text}

Return ONLY valid JSON in this shape:
{{
  "questions": [
    {{
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correct_answer": "A",
      "difficulty": "{difficulty}",
      "concept": "one concept label from the concept pool"
    }}
  ]
}}

Knowledge Context:
{context_text}
""".strip()

    def _generate_question_batch(
        self,
        *,
        subject: str,
        topic: str,
        difficulty: str,
        question_count: int,
        concepts: List[Dict[str, Any]],
        recent_questions: List[str],
        rng: random.Random,
        random_seed: int,
    ) -> List[Dict[str, Any]]:
        context_chunks = self._build_context_from_concepts(concepts, rng)
        if not context_chunks:
            return []

        prompt = self._build_prompt(
            subject=subject,
            topic=topic,
            difficulty=difficulty,
            question_count=question_count,
            concepts=concepts,
            context_chunks=context_chunks,
            recent_questions=recent_questions,
            random_seed=random_seed,
        )

        response = self._generate_with_gemini(prompt)
        raw_text = getattr(response, "text", "")

        if not raw_text:
            return []

        try:
            json_text = self._extract_json_text(raw_text)
            parsed = json.loads(json_text)
            return self._coerce_question_list(parsed)
        except Exception:
            logger.warning("failed to parse Gemini response as JSON")
            return []

    def _compute_diversity_score(self, questions: List[Dict[str, Any]]) -> float:
        if not questions:
            return 0.0

        total = len(questions)

        concept_values = [str(item.get("concept") or "").strip().lower() for item in questions]
        concept_values = [item for item in concept_values if item]
        unique_concepts = len(set(concept_values)) if concept_values else 0
        concept_uniqueness = unique_concepts / total

        source_values = [
            f"{str(item.get('source_file') or '').strip()}#{str(item.get('source_page'))}"
            for item in questions
            if item.get("source_file") or item.get("source_page") is not None
        ]
        unique_sources = len(set(source_values)) if source_values else 0
        source_diversity = unique_sources / total if source_values else 0.0

        vectors: List[List[float]] = []
        for item in questions:
            normalized = self._normalize_question_text(str(item.get("question") or ""))
            if not normalized:
                continue
            vectors.append(self._embed_text(normalized))

        if len(vectors) <= 1:
            similarity_diversity = 1.0
        else:
            max_similarities: List[float] = []
            for index, vector in enumerate(vectors):
                current_max = 0.0
                for inner_index, other_vector in enumerate(vectors):
                    if index == inner_index:
                        continue
                    similarity = self._cosine_similarity(vector, other_vector)
                    if similarity > current_max:
                        current_max = similarity
                max_similarities.append(current_max)

            average_max_similarity = sum(max_similarities) / len(max_similarities)
            similarity_diversity = max(0.0, 1.0 - average_max_similarity)

        score = (
            0.4 * concept_uniqueness
            + 0.3 * source_diversity
            + 0.3 * similarity_diversity
        )
        return round(score, 4)

    def _rank_low_diversity_indices(self, questions: List[Dict[str, Any]], replace_count: int) -> List[int]:
        if not questions:
            return []

        concept_counter = Counter(str(item.get("concept") or "").strip().lower() for item in questions)

        vectors = [
            self._embed_text(self._normalize_question_text(str(item.get("question") or "")))
            for item in questions
        ]

        penalties: List[Tuple[int, float]] = []

        for index, question in enumerate(questions):
            concept = str(question.get("concept") or "").strip().lower()
            concept_repeat_penalty = 0.0
            if concept:
                concept_repeat_penalty = max(concept_counter[concept] - 1, 0) / max(len(questions), 1)

            similarity_penalty = 0.0
            for inner_index, other in enumerate(vectors):
                if index == inner_index:
                    continue
                similarity = self._cosine_similarity(vectors[index], other)
                if similarity > similarity_penalty:
                    similarity_penalty = similarity

            total_penalty = (0.45 * concept_repeat_penalty) + (0.55 * similarity_penalty)
            penalties.append((index, total_penalty))

        penalties.sort(key=lambda item: item[1], reverse=True)
        return [index for index, _ in penalties[:replace_count]]

    def _attempt_regenerate_portion(
        self,
        *,
        questions: List[Dict[str, Any]],
        concept_pool: List[Dict[str, Any]],
        subject: str,
        topic: str,
        rng: random.Random,
        seed: int,
        normalized_questions: set,
        question_vectors: List[List[float]],
    ) -> List[Dict[str, Any]]:
        if len(questions) < 8:
            return questions

        replace_count = max(1, len(questions) // 6)
        replace_indices = self._rank_low_diversity_indices(questions, replace_count)
        if not replace_indices:
            return questions

        replacement_targets = [questions[index] for index in replace_indices]
        replacement_by_index: Dict[int, Dict[str, Any]] = {}

        concept_usage = Counter(str(item.get("concept") or "").strip().lower() for item in questions)
        last_concept_name = str(questions[-1].get("concept") or "").strip().lower() if questions else None

        for index, target in zip(replace_indices, replacement_targets):
            difficulty = str(target.get("difficulty") or "medium")
            attempts = 0

            while attempts < 5:
                attempts += 1

                selected_concepts = self._select_concepts_for_batch(
                    concept_pool=concept_pool,
                    concept_usage=concept_usage,
                    batch_size=2,
                    last_concept_name=last_concept_name,
                    rng=rng,
                )

                raw_candidates = self._generate_question_batch(
                    subject=subject,
                    topic=topic,
                    difficulty=difficulty,
                    question_count=1,
                    concepts=selected_concepts,
                    recent_questions=[item["question"] for item in questions],
                    rng=rng,
                    random_seed=seed + rng.randint(1, 999999),
                )

                if not raw_candidates:
                    continue

                accepted = None
                for raw_candidate in raw_candidates:
                    try:
                        normalized_candidate = self._normalize_question(raw_candidate)
                    except ValueError:
                        continue

                    is_duplicate, normalized_text, vector, _ = self._is_duplicate_question(
                        normalized_candidate["question"],
                        normalized_questions,
                        question_vectors,
                    )
                    if is_duplicate:
                        continue

                    selected_concept = selected_concepts[0] if selected_concepts else {}
                    concept_name = normalized_candidate.get("concept") or selected_concept.get("name") or topic

                    normalized_candidate["difficulty"] = difficulty
                    normalized_candidate["subject"] = subject
                    normalized_candidate["topic"] = topic
                    normalized_candidate["concept"] = concept_name
                    normalized_candidate["source_file"] = selected_concept.get("source_file")
                    normalized_candidate["source_page"] = selected_concept.get("source_page")

                    normalized_questions.add(normalized_text)
                    question_vectors.append(vector)
                    accepted = normalized_candidate
                    break

                if accepted is not None:
                    replacement_by_index[index] = accepted
                    concept_usage[accepted["concept"].strip().lower()] += 1
                    last_concept_name = accepted["concept"]
                    break

        if not replacement_by_index:
            return questions

        updated_questions = list(questions)
        for index, replacement in replacement_by_index.items():
            updated_questions[index] = replacement

        return updated_questions

    def generate_mcq_bundle(
        self,
        subject: str,
        topic: str,
        question_count: int,
        difficulty: str = "medium",
        marks: int = 4,
        negative_marks: float = 1,
        distribution_mode: str = "topic",
        dedupe_state: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        self._ensure_model()

        query = f"{subject} - {topic}"
        retrieval_k = max(self.retrieval_top_k * 8, 36)
        documents = self.retriever_service.retrieve_documents(
            query=query,
            top_k=retrieval_k,
            subject=subject,
        )

        logger.info(
            "retrieval success subject=%s topic=%s chunks=%s",
            subject,
            topic,
            len(documents),
        )

        if not documents:
            raise RuntimeError(
                f"No relevant context found for subject '{subject}'. "
                "Please ensure material PDFs are uploaded for this subject.",
            )

        rng, seed = self._build_rng()
        rng.shuffle(documents)

        concept_pool = self._extract_concepts_from_documents(documents, topic, rng)
        target_concept_count = self._target_concept_count(question_count)
        if len(concept_pool) > target_concept_count:
            concept_pool = concept_pool[:target_concept_count]

        if dedupe_state is None:
            normalized_questions: set = set()
            question_vectors: List[List[float]] = []
        else:
            normalized_questions = dedupe_state.setdefault("normalized_questions", set())
            question_vectors = dedupe_state.setdefault("question_vectors", [])

        difficulty_counts = self._resolve_difficulty_counts(
            question_count=question_count,
            difficulty=difficulty,
            distribution_mode=distribution_mode,
        )

        generated_questions: List[Dict[str, Any]] = []
        concept_usage = Counter()
        last_concept_name: Optional[str] = None

        for difficulty_level in ("easy", "medium", "hard"):
            required_count = difficulty_counts[difficulty_level]
            attempts = 0

            while required_count > 0 and attempts < max(required_count * 5, 10):
                attempts += 1

                batch_size = min(3, required_count)
                selected_concepts = self._select_concepts_for_batch(
                    concept_pool=concept_pool,
                    concept_usage=concept_usage,
                    batch_size=max(1, min(batch_size, len(concept_pool))),
                    last_concept_name=last_concept_name,
                    rng=rng,
                )

                raw_candidates = self._generate_question_batch(
                    subject=subject,
                    topic=topic,
                    difficulty=difficulty_level,
                    question_count=batch_size,
                    concepts=selected_concepts,
                    recent_questions=[item["question"] for item in generated_questions],
                    rng=rng,
                    random_seed=seed + rng.randint(1, 999999),
                )

                if not raw_candidates:
                    continue

                accepted_count = 0
                for raw_candidate in raw_candidates:
                    try:
                        normalized_candidate = self._normalize_question(raw_candidate)
                    except ValueError:
                        continue

                    is_duplicate, normalized_text, vector, _ = self._is_duplicate_question(
                        normalized_candidate["question"],
                        normalized_questions,
                        question_vectors,
                    )
                    if is_duplicate:
                        continue

                    selected_concept = selected_concepts[accepted_count % len(selected_concepts)]
                    concept_name = normalized_candidate.get("concept") or selected_concept.get("name") or topic

                    normalized_candidate["difficulty"] = difficulty_level
                    normalized_candidate["subject"] = subject
                    normalized_candidate["topic"] = topic
                    normalized_candidate["marks"] = marks
                    normalized_candidate["negative_marks"] = negative_marks
                    normalized_candidate["concept"] = concept_name
                    normalized_candidate["source_file"] = selected_concept.get("source_file")
                    normalized_candidate["source_page"] = selected_concept.get("source_page")

                    normalized_questions.add(normalized_text)
                    question_vectors.append(vector)

                    generated_questions.append(normalized_candidate)
                    concept_usage[concept_name.strip().lower()] += 1
                    last_concept_name = concept_name.strip().lower()

                    required_count -= 1
                    accepted_count += 1

                    if required_count <= 0:
                        break

                if accepted_count == 0:
                    continue

        if len(generated_questions) < question_count:
            raise RuntimeError(
                "Unable to generate the required number of unique questions from the available context",
            )

        generated_questions = generated_questions[:question_count]

        diversity_score = self._compute_diversity_score(generated_questions)
        if diversity_score < MIN_DIVERSITY_SCORE:
            generated_questions = self._attempt_regenerate_portion(
                questions=generated_questions,
                concept_pool=concept_pool,
                subject=subject,
                topic=topic,
                rng=rng,
                seed=seed,
                normalized_questions=normalized_questions,
                question_vectors=question_vectors,
            )
            diversity_score = self._compute_diversity_score(generated_questions)

        response_questions: List[Dict[str, Any]] = []
        for item in generated_questions:
            response_questions.append(
                {
                    "question": item["question"],
                    "options": item["options"],
                    "correct_answer": item["correct_answer"],
                    "difficulty": item["difficulty"],
                    "subject": item["subject"],
                    "topic": item["topic"],
                    "marks": item["marks"],
                    "negative_marks": item["negative_marks"],
                    "concept": item.get("concept"),
                    "source_file": item.get("source_file"),
                    "source_page": item.get("source_page"),
                }
            )

        concept_distribution = Counter(
            str(item.get("concept") or "").strip().lower()
            for item in response_questions
            if str(item.get("concept") or "").strip()
        )

        metadata = {
            "generation_seed": seed,
            "difficulty_distribution": difficulty_counts,
            "concept_coverage_count": len(concept_distribution),
            "concept_distribution": dict(concept_distribution),
            "diversity_score": diversity_score,
            "subject": subject,
            "topic": topic,
        }
        self.last_generation_meta = metadata

        return {
            "questions": response_questions,
            **metadata,
        }

    def generate_mcq(
        self,
        subject: str,
        topic: str,
        question_count: int,
        difficulty: str = "medium",
        marks: int = 4,
        negative_marks: float = 1,
        distribution_mode: str = "topic",
        dedupe_state: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        bundle = self.generate_mcq_bundle(
            subject=subject,
            topic=topic,
            question_count=question_count,
            difficulty=difficulty,
            marks=marks,
            negative_marks=negative_marks,
            distribution_mode=distribution_mode,
            dedupe_state=dedupe_state,
        )
        return bundle["questions"]


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
