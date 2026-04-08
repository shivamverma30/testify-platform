"""Retriever service for loading and querying FAISS knowledge base."""

from __future__ import annotations

import logging
import math
from pathlib import Path
import re
from typing import Dict, Iterable, List, Optional

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class LocalEmbeddings(Embeddings):
    """Local embedding adapter backed by sentence-transformers."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        self.model = SentenceTransformer(model_name)

    @staticmethod
    def _normalize_text(text: str) -> str:
        normalized = (text or "").replace("\x00", " ").strip()
        if not normalized:
            normalized = "N/A"
        return normalized

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        normalized_texts = [self._normalize_text(text) for text in texts]
        vectors = self.model.encode(
            normalized_texts,
            batch_size=32,
            show_progress_bar=False,
            convert_to_numpy=True,
        )
        return vectors.tolist()

    def embed_query(self, text: str) -> List[float]:
        normalized_text = self._normalize_text(text)
        vector = self.model.encode(
            normalized_text,
            show_progress_bar=False,
            convert_to_numpy=True,
        )
        return vector.tolist()


class RetrieverService:
    """Loads a persisted FAISS index and retrieves top-k context chunks."""

    SUBJECT_ALIASES = {
        "mathematics": "Mathematics",
        "math": "Mathematics",
        "quantitative aptitude": "Mathematics",
        "quant": "Mathematics",
        "analytical ability & logical reasoning": "Analytical Ability & Logical Reasoning",
        "analytical ability": "Analytical Ability & Logical Reasoning",
        "logical reasoning": "Analytical Ability & Logical Reasoning",
        "reasoning": "Analytical Ability & Logical Reasoning",
        "computer awareness & general english": "Computer Awareness & General English",
        "computer awareness": "Computer Awareness & General English",
        "computer": "Computer Awareness & General English",
        "general english": "Computer Awareness & General English",
        "english": "Computer Awareness & General English",
    }

    def __init__(self, index_path: Path, top_k: int = 5, model_name: str = "all-MiniLM-L6-v2") -> None:
        self.index_path = Path(index_path)
        self.top_k = top_k
        self.embeddings = LocalEmbeddings(model_name=model_name)
        self.vector_store: Optional[FAISS] = None
        self._doc_by_index: Dict[int, Document] = {}
        self._subject_index_cache: Dict[str, List[int]] = {}

    def load_index(self) -> None:
        index_faiss = self.index_path / "index.faiss"
        index_pkl = self.index_path / "index.pkl"

        if not self.index_path.exists():
            raise FileNotFoundError(f"FAISS index directory not found: {self.index_path}")

        if not index_faiss.exists() or not index_pkl.exists():
            raise FileNotFoundError(
                f"FAISS index files missing in {self.index_path}. Expected index.faiss and index.pkl",
            )

        self.vector_store = FAISS.load_local(
            str(self.index_path),
            self.embeddings,
            allow_dangerous_deserialization=True,
        )
        self._warm_metadata_cache()
        logger.info("FAISS index loaded from %s", self.index_path)

    def _iter_index_documents(self) -> Iterable[tuple[int, Document]]:
        if self.vector_store is None:
            return

        docstore = getattr(self.vector_store, "docstore", None)
        index_to_docstore_id = getattr(self.vector_store, "index_to_docstore_id", None)

        if docstore is None or not index_to_docstore_id:
            return

        for raw_index, docstore_id in index_to_docstore_id.items():
            document = None

            if hasattr(docstore, "search"):
                document = docstore.search(docstore_id)
            elif hasattr(docstore, "_dict"):
                document = docstore._dict.get(docstore_id)  # pragma: no cover

            if isinstance(document, Document):
                yield int(raw_index), document

    def _warm_metadata_cache(self) -> None:
        self._doc_by_index = {}
        self._subject_index_cache = {}

        for index_id, document in self._iter_index_documents() or []:
            self._doc_by_index[index_id] = document

            metadata = document.metadata or {}
            canonical_subject = self._canonicalize_subject(str(metadata.get("subject") or ""))
            if not canonical_subject:
                continue

            bucket = self._subject_index_cache.setdefault(canonical_subject, [])
            bucket.append(index_id)

    @classmethod
    def _canonicalize_subject(cls, value: Optional[str]) -> Optional[str]:
        if not value:
            return None

        normalized = " ".join(str(value).strip().lower().split())
        return cls.SUBJECT_ALIASES.get(normalized)

    @staticmethod
    def _extract_topic_terms(topic: Optional[str], query: str) -> List[str]:
        candidate = f"{topic or ''} {query or ''}".strip().lower()
        terms = re.findall(r"[a-zA-Z][a-zA-Z0-9]+", candidate)
        deduped: List[str] = []

        for term in terms:
            if len(term) < 3:
                continue
            if term not in deduped:
                deduped.append(term)

        return deduped[:8]

    @staticmethod
    def _cosine_similarity(vector_a: List[float], vector_b: List[float]) -> float:
        if not vector_a or not vector_b:
            return 0.0

        dot_value = sum(a * b for a, b in zip(vector_a, vector_b))
        norm_a = math.sqrt(sum(a * a for a in vector_a))
        norm_b = math.sqrt(sum(b * b for b in vector_b))

        if norm_a == 0 or norm_b == 0:
            return 0.0

        return dot_value / (norm_a * norm_b)

    @staticmethod
    def _topic_bonus(document: Document, topic_terms: List[str]) -> float:
        if not topic_terms:
            return 0.0

        metadata = document.metadata or {}
        topic_hint = str(metadata.get("topic_hint") or "").lower()
        page_text = str(document.page_content or "")[:700].lower()

        bonus = 0.0
        for term in topic_terms:
            if topic_hint and term in topic_hint:
                bonus += 0.08
            elif term in page_text:
                bonus += 0.03

        return min(bonus, 0.3)

    def _rank_subject_documents(
        self,
        *,
        query: str,
        subject: str,
        topic: Optional[str],
        top_k: int,
    ) -> List[Document]:
        if self.vector_store is None:
            return []

        canonical_subject = self._canonicalize_subject(subject)
        if not canonical_subject:
            return []

        candidate_indices = self._subject_index_cache.get(canonical_subject, [])
        if not candidate_indices:
            logger.warning("No documents found for canonical subject '%s'", canonical_subject)
            return []

        query_vector = self.embeddings.embed_query(query)
        topic_terms = self._extract_topic_terms(topic, query)

        ranked: List[tuple[float, Document]] = []

        for index_id in candidate_indices:
            document = self._doc_by_index.get(index_id)
            if document is None:
                continue

            try:
                raw_vector = self.vector_store.index.reconstruct(index_id)
                doc_vector = raw_vector.tolist() if hasattr(raw_vector, "tolist") else list(raw_vector)
                score = self._cosine_similarity(query_vector, doc_vector)
            except Exception:
                score = 0.0

            score += self._topic_bonus(document, topic_terms)
            ranked.append((score, document))

        ranked.sort(key=lambda item: item[0], reverse=True)
        return [document for _, document in ranked[:top_k]]

    def retrieve_documents(
        self,
        query: str,
        top_k: Optional[int] = None,
        subject: Optional[str] = None,
        topic: Optional[str] = None,
    ) -> List[Document]:
        if not self.vector_store:
            raise RuntimeError("FAISS index is not loaded")

        k = top_k if top_k is not None else self.top_k

        # Enforce strict subject-scoped retrieval before semantic ranking.
        if subject:
            docs = self._rank_subject_documents(
                query=query,
                subject=subject,
                topic=topic,
                top_k=k,
            )
            logger.info(
                "retrieved subject-scoped documents subject=%s topic=%s count=%s",
                subject,
                topic,
                len(docs),
            )
            return docs

        docs = self.vector_store.similarity_search(query, k=k)
        return docs[:k]

    def retrieve_context(
        self,
        query: str,
        top_k: Optional[int] = None,
        subject: Optional[str] = None,
        topic: Optional[str] = None,
    ) -> List[str]:
        docs = self.retrieve_documents(query=query, top_k=top_k, subject=subject, topic=topic)

        contexts: List[str] = []
        for doc in docs:
            content = (doc.page_content or "").strip()
            if content:
                contexts.append(content)

        return contexts


_default_retriever: Optional[RetrieverService] = None


def set_default_retriever(service: RetrieverService) -> None:
    global _default_retriever
    _default_retriever = service


def retrieve_context(
    query: str,
    top_k: int = 5,
    subject: Optional[str] = None,
    topic: Optional[str] = None,
) -> List[str]:
    if _default_retriever is None:
        raise RuntimeError("RetrieverService has not been initialized")

    return _default_retriever.retrieve_context(
        query=query,
        top_k=top_k,
        subject=subject,
        topic=topic,
    )
