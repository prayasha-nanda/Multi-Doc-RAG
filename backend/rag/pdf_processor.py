from io import BytesIO

from pypdf import PdfReader
from fastapi import HTTPException

def extract_pdf_text(file_bytes: bytes, filename: str):
    try:
        reader = PdfReader(BytesIO(file_bytes))


    except Exception:
        raise HTTPException(
            status_code=400,
            detail=f"{filename} is not a valid PDF."
        )

    documents = []

    for page_num, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text()

            if text and text.strip():
                documents.append(
                    {
                        "text": text,
                        "page": page_num,
                        "file": filename
                    }
                )

        except Exception:
            continue

    if not documents:
        raise HTTPException(
            status_code=400,
            detail=f"No extractable text found in {filename}"
        )

    return documents
