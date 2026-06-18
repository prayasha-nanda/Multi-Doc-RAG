# Multi-Document RAG Chatbot

Upload one or more PDFs, build a semantic search index using FAISS and Gemini embeddings, and ask natural-language questions about the contents.

The system retrieves the most relevant document chunks, filters low-relevance matches using a similarity threshold, and generates grounded answers using Retrieval-Augmented Generation (RAG). Retrieved source chunks are exposed to the user for transparency and verification.

![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75C2?style=flat-square&logo=googlegemini&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat-square&logo=fastapi&logoColor=009688)
![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=flat-square&logo=langchain&logoColor=white)
![FAISS](https://img.shields.io/badge/FAISS-044F88?style=flat-square&logo=meta&logoColor=white)

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
- tweaking prompts / changing number of chunks sent / temperature etc. - all scenario-based
- wrap the text inside the speech bubbles on the user side
- the UI, especially the copy button (also change png font awesome icon to pdf)
- showing OG content - mostly implemented
- invalid API key crashes the app, so need to make an error message (also resource exhausted error)
- LLM fallback - i will not be going forward with this as i'd like a close book LLM

disclaimer:
0.80 can have tiny bleeds.
temperature 0.0

---

## Architecture

```text
User Question
      │
      ▼
FAISS Similarity Search
      │
      ▼
Top-k Retrieved Chunks
      │
      ▼
Similarity Threshold Filtering
      │
      ▼
Context Construction
      │
      ▼
Gemini 2.5 Flash
      │
      ▼
Grounded Response + Source Chunks
```

Documents are chunked using a RecursiveCharacterTextSplitter and embedded using Gemini embeddings before being indexed in FAISS.
---

## Evaluation Results

The system was evaluated using 15 manually curated queries covering:

- Direct factual retrieval
- Multi-chunk synthesis
- Unsupported-information queries
- Hallucination resistance scenarios

| Metric | Result |
|----------|----------:|
| Total Queries Tested | **15** |
| Pass | **11** |
| Partial | **3** |
| Fail | **1** |
| Pass Rate | **73.30%** |
| Pass + Partial Rate | **93.30%** |
| Weighted Success Rate = (Pass + 0.5 × Partial) / Total | **83.30%** |
| Average Chunks Retrieved | **3.73 / 5** |
| Average Chunks Used | **2.07 / 5** |

### Key Findings

- Achieved a **73.3% full-pass rate** across benchmark queries.
- Achieved a **93.3% pass-or-partial rate**.
- Retrieved an average of **3.73 chunks** per query.
- Generated responses using an average of **2.07 chunks**, indicating successful filtering of irrelevant context.
- Only **1 query resulted in a complete failure**.

Find the entire analysis in the [excel sheet](samples/evaluation_of_my_RAG.xlsx): `samples/evaluation_of_my_RAG.xlsx`

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

The terminal will output the chunks (with the source pdf and the page number used), the chunks that are retained after filtering, the similarity scores (Euclidean distance), and the latency.

This helps improve transparency for users and help with debugging.

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
* Delete existing sessions (by themselves, it will be stored locally in a folder `backend/indexes`)

---

## Limitations

* Supports PDF documents only
* Answers are intended to be grounded in uploaded documents only
* The system does not perform web searches
* Scanned/image-only PDFs are not currently supported
* Similarity threshold tuning may affect recall and precision
* Large collections may require additional optimization

---

## Future Improvements

* OCR support for scanned PDFs
* Hybrid search (Keyword + Vector)
* Web search integration
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
## Built by yours truly...

Prayasha Nanda, in my hunt to learn more and create more.

---

## License

MIT License
