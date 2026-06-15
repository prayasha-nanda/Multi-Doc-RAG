# Multi-Document RAG Chatbot

Chat with multiple PDF documents using **Google Gemini 2.5 Flash**, **FAISS vector search**, and a modern web interface.

Upload one or more PDFs, build a semantic search index, and ask natural-language questions about the contents. The system retrieves relevant document chunks and uses Retrieval-Augmented Generation (RAG) to produce grounded answers with source citations.

---

## Project Structure

```text
basic-rag/
│
├── backend/
│   ├── app.py
│   │
│   └── rag/
│       ├── chat.py
│       ├── embeddings.py
│       ├── guards.py
│       ├── pdf_processor.py
│       └── vector_store.py
│
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── chat.js
│
├── indexes/                    # This is in .gitignore
│
└── README.md
```

---
This is my backlog:
- tweaking prompts
- wrap the text inside the speech bubbles
- the UI, especially the copy button
- showing OG content
- invalid API key crashes the app, so need to make an error message

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/prayasha-nanda/Multi-Doc-RAG.git

cd Multi-doc-RAG
```

---

### 2. Create a Virtual Environment

```bash
python -m venv venv
```

Activate it:

#### Windows

```bash
venv\Scripts\activate
```

#### Linux / macOS

```bash
source venv/bin/activate
```

---

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

---

### 4. Start the Backend

```bash
uvicorn app:app --reload
```

Backend will run on:

```text
http://127.0.0.1:8000
```

---

### 5. Start the Frontend

Using Python:

```bash
python -m http.server 3000
```

Then open:

```text
http://localhost:3000
```

---

## Usage

### Step 1

Enter your Gemini API key.

### Step 2

Upload one or more PDF documents.

### Step 3

Click **Index Documents**.

The system will:

* Extract PDF text
* Create embeddings
* Build a FAISS vector index

### Step 4

Ask questions about the uploaded documents.

Examples:

* Summarize the report.
* What are the key findings?
* Explain chapter 4.
* Compare the conclusions of both papers.
* What evidence supports this claim?

---

## Source Attribution

Every response includes supporting document chunks with:

* File name
* Page number
* Original retrieved content

Users can inspect retrieved chunks directly through the interface.

This helps reduce hallucinations and improves transparency.

---

## Session Management

Each upload creates a unique session.

Sessions store:

* Vector index
* Metadata
* API key reference

Users can:

* Continue previous sessions
* Start a new session
* Delete existing sessions

---

## Limitations

* Supports PDF documents only
* Requires a valid Gemini API key
* Does not browse the internet
* Answers are limited to uploaded documents and model knowledge
* Large collections may require additional optimization

---

## Future Improvements

* Multi-user authentication
* Streaming responses
* Hybrid search (Keyword + Vector)
* Web search integration
* OCR support for scanned PDFs
* Conversation memory
* Citation highlighting inside documents
* Docker deployment
* Cloud storage support

---

## Why RAG?

Large Language Models can hallucinate or lack access to private information.

Retrieval-Augmented Generation improves reliability by retrieving relevant document context before generating a response.

Instead of relying solely on the model's training data, answers are grounded in the user's uploaded documents.

---

## License

MIT License

---

## Acknowledgements

Built using:

* Google Gemini
* FastAPI
* LangChain
* FAISS

A lightweight implementation of Retrieval-Augmented Generation designed for document exploration, research assistance, and knowledge retrieval.
