# 🌍 GlobeX AI — Intelligent Export-Import Assistant (AI Agent Service)

> Production-ready AI Agent microservice for Indian manufacturers, exporters, and MSMEs seeking global expansion.  
> Powered by **Gemini 2.5 Flash · LangChain · ChromaDB · FastAPI**

---

## 🏛️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        GlobeX AI Agent                          │
│                                                                  │
│  User Message → Intent Classifier → Decision Router              │
│                        ↓               ↓                         │
│                    RAG Pipeline    Tool Calling                  │
│                  (ChromaDB +      (HS Code / Duty /             │
│                  Gemini Embed)     Invoice / Packing)            │
│                        ↓               ↓                         │
│                    Context Injection + Tool Results              │
│                        ↓                                         │
│                  Gemini 2.5 Flash (Final Response)               │
│                        ↓                                         │
│               Memory Storage (SQLite) → Session Context          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```
backend/ai-agent/
├── app.py                        # FastAPI entrypoint
├── requirements.txt              # Python dependencies
├── .env.example                  # Environment variable template
├── agents/
│   └── globex_agent.py           # Core AI agent orchestrator
├── rag/
│   ├── pipeline.py               # ChromaDB + Gemini embeddings RAG
│   └── knowledge_base.py         # Seed trade knowledge documents
├── tools/
│   └── trade_tools.py            # LangChain tools (HS code, duty, invoice, etc.)
├── memory/
│   └── memory_manager.py         # SQLAlchemy session & conversation memory
├── database/
│   └── models.py                 # SQLAlchemy ORM models (Session, Message)
├── routes/
│   └── api.py                    # FastAPI route handlers
├── prompts/
│   └── system_prompts.py         # Gemini system & tool prompts
└── utils/
    ├── config.py                 # Pydantic settings management
    └── logger.py                 # Structured logging (structlog)
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.10+
- Google AI Studio API key (`GOOGLE_API_KEY`)

### 2. Setup
```bash
cd backend/ai-agent

# Create virtual environment
python -m venv venv
# Linux / macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and supply GOOGLE_API_KEY
```

### 3. Run the Service
```bash
python app.py
# Or with uvicorn:
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

- API live at: `http://localhost:8000`
- Interactive OpenAPI docs: `http://localhost:8000/docs`

---

## 📡 API Reference

### Core Chat Endpoints

- `POST /api/v1/chat`: Synchronous multi-agent conversational endpoint with automated RAG and tool routing.
- `POST /api/v1/chat/stream`: Real-time streaming response using Server-Sent Events (SSE).

### Specialized Trade Tools

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/tools/hs-code` | POST | HS Code identification and classification |
| `/api/v1/tools/duty-calculator` | POST | Tariff and customs duty estimation |
| `/api/v1/tools/country-rules` | POST | Country-specific trade regulations |
| `/api/v1/tools/invoice` | POST | Commercial invoice document drafting |
| `/api/v1/tools/packing-list` | POST | Packing list generation |

### Sessions & Memory

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/sessions/{id}` | GET | Fetch session metadata |
| `/api/v1/sessions/{id}/history` | GET | Retrieve conversation history |
| `/api/v1/sessions/{id}` | DELETE | Terminate and purge session |

### RAG Knowledge Base

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/rag/query` | POST | Direct query against trade knowledge base |
| `/api/v1/rag/status` | GET | Check ChromaDB collection status |

---

## 🧠 Memory & Context System

The AI Agent automatically maintains conversational context across sessions in a local SQLite database (`globex_memory.db`):
- Exporter company name and profile
- Product category and specifications
- Target export markets
- Recent conversation turns for coherent multi-turn reasoning
