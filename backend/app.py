import os
import shutil

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from pydantic import BaseModel
from tenacity import RetryError

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
    get_session_path

)

from rag.chat import RAGChatService

app = FastAPI(
    title="Multi-Doc RAG API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# os.makedirs("uploads", exist_ok=True) #currently not in use
os.makedirs("indexes", exist_ok=True)

def get_session_path(session_id):
    return os.path.join("indexes", session_id)

class ChatRequest(BaseModel):
    session_id: str
    message: str
    api_key: str
    selected_context: str | None = None
    temperature: float = 0.7


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

    session_path = get_session_path(session_id)

    pdf_dir = os.path.join(session_path, "pdfs")
    os.makedirs(pdf_dir, exist_ok=True)

    all_documents = []
    total_files = 0

    for uploaded_file in files:
        file_bytes = await uploaded_file.read()

        validate_file_size(len(file_bytes))

        # SAVE PDF LOCALLY
        file_path = os.path.join(pdf_dir, uploaded_file.filename)

        with open(file_path, "wb") as f:
            f.write(file_bytes)

        # reset pointer
        uploaded_file.file.seek(0)

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
    try:
        validate_query(request.message)
        api_key = request.api_key
        validate_api_key(api_key)

        embeddings = GeminiEmbeddings(api_key)

        chat_service = RAGChatService(
            api_key=api_key,
            embeddings=embeddings
        )

        return chat_service.chat(
            session_id=request.session_id,
            query=request.message,
            selected_context=request.selected_context,
            temperature=request.temperature
        )

    except RetryError as e:
        print(e)

        if e.last_attempt:
            print("Underlying error:", e.last_attempt.exception())
        raise HTTPException(
            status_code=429,
            detail="Something went wrong. Try again later or use another API key."
        )
    except Exception:
        print(e)
        raise HTTPException(
            status_code=400,
            detail="Something went wrong. Check your API key and try again."
        )


@app.get("/session/{session_id}")
def session_info(session_id: str):
    session_path = get_session_path(session_id)

    if not os.path.exists(session_path):
        raise HTTPException(status_code=404, detail="Session not found.")

    pdf_dir = os.path.join(session_path, "pdfs")

    pdfs = []
    if os.path.exists(pdf_dir):
        pdfs = os.listdir(pdf_dir)

    return {
        "session_id": session_id,
        "exists": True,
        "pdfs": pdfs
    }

@app.get("/session/{session_id}/pdf/{filename}")
def get_pdf(session_id: str, filename: str):
    session_path = get_session_path(session_id)
    pdf_path = os.path.join(session_path, "pdfs", filename)

    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF not found")

    return FileResponse(pdf_path, media_type="application/pdf", filename=filename)

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