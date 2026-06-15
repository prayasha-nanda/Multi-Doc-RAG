from fastapi import HTTPException

MAX_FILES = 10
MAX_FILE_SIZE_MB = 25
MAX_TOTAL_PAGES = 1000
MAX_QUERY_LENGTH = 2000
MAX_CHUNKS = 5000


def validate_api_key(api_key: str):
    if not api_key or not api_key.strip():
        raise HTTPException(
            status_code=400,
            detail="Gemini API key is required."
        )


def validate_uploaded_files(files):
    if not files:
        raise HTTPException(
            status_code=400,
            detail="No files uploaded."
        )

    if len(files) > MAX_FILES:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_FILES} PDFs allowed."
        )


def validate_file_size(file_size_bytes: int):
    size_mb = file_size_bytes / (1024 * 1024)

    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds {MAX_FILE_SIZE_MB} MB limit."
        )


def validate_query(query: str):
    if not query or not query.strip():
        raise HTTPException(
            status_code=400,
            detail="Query cannot be empty."
        )

    if len(query) > MAX_QUERY_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Query exceeds {MAX_QUERY_LENGTH} characters."
        )