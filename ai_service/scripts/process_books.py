"""Build a global RAG knowledge base from local study materials.

Run:
    python scripts/process_books.py
"""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Iterable, List

import tiktoken
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from sentence_transformers import SentenceTransformer


class LocalEmbeddings(Embeddings):
    """LangChain-compatible local embedding adapter using sentence-transformers."""

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


def discover_pdf_files(materials_dir: Path) -> List[Path]:
    return sorted(path for path in materials_dir.rglob("*.pdf") if path.is_file())


def load_documents(pdf_files: Iterable[Path], materials_dir: Path) -> List[Document]:
    documents: List[Document] = []

    for pdf_path in pdf_files:
        subject = pdf_path.parent.relative_to(materials_dir).parts[0]
        loader = PyPDFLoader(str(pdf_path))
        loaded_pages = loader.load()

        for page in loaded_pages:
            content = (page.page_content or "").strip()
            if not content:
                continue

            metadata = dict(page.metadata)
            metadata.update(
                {
                    "subject": subject,
                    "source_file": pdf_path.name,
                    "source_path": str(pdf_path),
                }
            )
            documents.append(Document(page_content=content, metadata=metadata))

    return documents


def build_splitter(chunk_size: int = 800, chunk_overlap: int = 150) -> RecursiveCharacterTextSplitter:
    encoding = tiktoken.get_encoding("cl100k_base")

    def token_length(text: str) -> int:
        return len(encoding.encode(text, disallowed_special=()))

    return RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=token_length,
        separators=["\n\n", "\n", ". ", " ", ""],
    )


def build_knowledge_base() -> None:
    root_dir = Path(__file__).resolve().parents[1]
    materials_dir = root_dir / "materials"
    index_dir = root_dir / "vector_store" / "faiss_index"

    if not materials_dir.exists():
        raise FileNotFoundError(f"Materials directory not found: {materials_dir}")

    pdf_files = discover_pdf_files(materials_dir)
    if not pdf_files:
        raise FileNotFoundError(f"No PDF files found in: {materials_dir}")

    documents = load_documents(pdf_files, materials_dir)
    if not documents:
        raise ValueError("No extractable text found in the materials PDFs.")

    splitter = build_splitter(chunk_size=800, chunk_overlap=150)
    chunks = splitter.split_documents(documents)
    if not chunks:
        raise ValueError("Document chunking produced zero chunks.")

    embeddings = LocalEmbeddings()
    vector_store = FAISS.from_documents(chunks, embeddings)

    if index_dir.exists():
        shutil.rmtree(index_dir)
    index_dir.mkdir(parents=True, exist_ok=True)

    vector_store.save_local(str(index_dir))

    print("Knowledge base built successfully.")


if __name__ == "__main__":
    build_knowledge_base()
