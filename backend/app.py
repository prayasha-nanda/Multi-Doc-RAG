import os
import shutil

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel

from rag.guards import (
    validate_api_key,
    validate_uploaded_files,
    validate_file_size,
    validate_query
)

from rag.pdf_processor import extract_pdf_text
from rag.embeddings import GeminiEmbeddings

from rag.vector_store import (
    create_session_id,
    build_vector_store,
    get_session_path,
    save_api_key_to_session,
    load_api_key_from_session

)

from rag.chat import RAGChatService

app = FastAPI(
    title="Multi-Doc RAG API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# os.makedirs("uploads", exist_ok=True) #currently not in use
os.makedirs("indexes", exist_ok=True)


class ChatRequest(BaseModel):
    session_id: str
    message: str


@app.get("/")
def health_check():
    return {
        "status": "running"
    }


@app.post("/upload")
async def upload_documents(
    api_key: str = Form(...),
    files: list[UploadFile] = File(...)
):
    validate_uploaded_files(files)

    session_id = create_session_id()
    save_api_key_to_session(session_id, api_key)

    all_documents = []
    total_files = 0

    for uploaded_file in files:
        file_bytes = await uploaded_file.read()
        uploaded_file.file.seek(0)

        validate_file_size(len(file_bytes))

        docs = extract_pdf_text(
            file_bytes=file_bytes,
            filename=uploaded_file.filename
        )

        all_documents.extend(docs)
        total_files += 1

        try:
            embeddings = GeminiEmbeddings(api_key)
        except Exception:
            raise HTTPException(
                status_code=401,
                detail="Invalid Gemini API key"
            )

    total_chunks = build_vector_store(
        documents=all_documents,
        embeddings=embeddings,
        session_id=session_id
    )

    return {
        "session_id": session_id,
        "documents": total_files,
        "chunks": total_chunks,
        "message": "Documents indexed successfully."
    }


@app.post("/chat")
def chat(request: ChatRequest):
    validate_query(request.message)
    api_key = load_api_key_from_session(request.session_id)

    embeddings = GeminiEmbeddings(api_key)

    chat_service = RAGChatService(
        api_key=api_key,
        embeddings=embeddings
    )

    return chat_service.chat(
        session_id=request.session_id,
        query=request.message
    )


@app.get("/session/{session_id}")
def session_info(session_id: str):
    session_path = get_session_path(session_id)

    if not os.path.exists(session_path):
        raise HTTPException(
            status_code=404,
            detail="Session not found."
        )

    return {
        "session_id": session_id,
        "exists": True
    }


@app.delete("/session/{session_id}")
def delete_session(session_id: str):
    session_path = get_session_path(session_id)

    if not os.path.exists(session_path):
        raise HTTPException(
            status_code=404,
            detail="Session not found."
        )

    shutil.rmtree(session_path)

    return {
        "message": "Session deleted."
    }