"""Retriever service for loading and querying FAISS knowledge base."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Callable, List, Optional

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
        logger.info("FAISS index loaded from %s", self.index_path)

    @classmethod
    def _canonicalize_subject(cls, value: Optional[str]) -> Optional[str]:
        if not value:
            return None

        normalized = " ".join(str(value).strip().lower().split())
        return cls.SUBJECT_ALIASES.get(normalized)

    def _build_subject_filter(self, subject: Optional[str]) -> Optional[Callable[[dict], bool]]:
        canonical_subject = self._canonicalize_subject(subject)
        if not canonical_subject:
            return None

        def _filter(metadata: dict) -> bool:
            metadata_subject = metadata.get("subject")
            metadata_canonical = self._canonicalize_subject(str(metadata_subject or ""))
            return metadata_canonical == canonical_subject

        return _filter

    def retrieve_documents(
        self,
        query: str,
        top_k: Optional[int] = None,
        subject: Optional[str] = None,
    ) -> List[Document]:
        if not self.vector_store:
            raise RuntimeError("FAISS index is not loaded")

        k = top_k if top_k is not None else self.top_k

        subject_filter = self._build_subject_filter(subject)
        fetch_k = max(k * 6, 24)

        try:
            docs = self.vector_store.similarity_search(
                query,
                k=k,
                fetch_k=fetch_k,
                filter=subject_filter,
            )

            if subject_filter and not docs:
                logger.warning(
                    "No context matched subject filter '%s'; retrying retrieval without subject filter",
                    subject,
                )
                docs = self.vector_store.similarity_search(
                    query,
                    k=k,
                    fetch_k=fetch_k,
                )
        except TypeError:
            docs = self.vector_store.similarity_search(query, k=fetch_k)
            if subject_filter:
                docs = [doc for doc in docs if subject_filter(doc.metadata)]

            if subject_filter and not docs:
                logger.warning(
                    "No context matched subject filter '%s'; retrying retrieval without subject filter",
                    subject,
                )
                docs = self.vector_store.similarity_search(query, k=fetch_k)

            docs = docs[:k]

        return docs

    def retrieve_context(
        self,
        query: str,
        top_k: Optional[int] = None,
        subject: Optional[str] = None,
    ) -> List[str]:
        docs = self.retrieve_documents(query=query, top_k=top_k, subject=subject)

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


def retrieve_context(query: str, top_k: int = 5, subject: Optional[str] = None) -> List[str]:
    if _default_retriever is None:
        raise RuntimeError("RetrieverService has not been initialized")

    return _default_retriever.retrieve_context(query=query, top_k=top_k, subject=subject)
