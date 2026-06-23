import os
import uuid

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from fastapi import HTTPException
from rag.guards import MAX_CHUNKS

import json

INDEX_ROOT = "indexes"

def create_session_id():
    return str(uuid.uuid4())

def get_session_path(session_id: str):
    return os.path.join(INDEX_ROOT, session_id)

def build_vector_store(documents, embeddings, session_id):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=700,
        chunk_overlap=100
    )

    langchain_docs = []
    for item in documents:
        chunks = splitter.split_text(item["text"])
        for chunk in chunks:
            langchain_docs.append(
                Document(
                    page_content=chunk,
                    metadata={
                        "file": item["file"],
                        "page": item["page"]
                    }
                )
            )

    if len(langchain_docs) > MAX_CHUNKS:
        raise HTTPException(
            status_code=400,
            detail=f"Document exceeds chunk limit ({MAX_CHUNKS})"
        )

    vector_store = FAISS.from_documents(
        langchain_docs,
        embeddings
    )

    save_path = get_session_path(session_id)
    os.makedirs(save_path, exist_ok=True)
    vector_store.save_local(save_path)

    return len(langchain_docs)

def load_vector_store(session_id, embeddings):
    save_path = get_session_path(session_id)

    if not os.path.exists(save_path):
        raise HTTPException(
            status_code=404,
            detail="Session not found."
        )

    # Standard syntax ensuring embeddings engine maps correctly
    return FAISS.load_local(
        folder_path=save_path,
        embeddings=embeddings,
        allow_dangerous_deserialization=True
    )