# StudyFlow — merged local prototype

This merge preserves the availability form, recurring-event exceptions, clickable calendar editor, and hidden term selector. It adds the partner's syllabus extraction/review flow and FastAPI backend. Assignment calendar entries now support Mark complete / Mark incomplete, synchronized with Tasks, with completed titles struck through.

## Run
1. Install Python 3.11+ if needed.
2. In the project root: `py -m venv .venv`
3. `.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt`
4. In one terminal: `cd backend` then `..\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000`
5. In a second terminal, from the project root: `.\.venv\Scripts\python.exe -m http.server 5174 --bind 127.0.0.1 --directory frontend`
6. Open http://127.0.0.1:5174

The running preview in this chat uses a separate development Python environment prepared by Codex.

## Uploads
PDF, DOCX, TXT, Markdown, and CSV are supported. Scanned PDFs require OCR, which is not included. Legacy .doc files are not supported. Import first extracts a review list; Confirm saves assignments to SQLite and the current browser account. Keep backend/.env private. Without an Anthropic API key, a local heuristic is used; review all results. No API key was added by this merge.

## Data and scope
Existing browser data and account keys are preserved. Availability and calendar edits remain browser-local. The backend stores confirmed imports, but subsequent task completion/deadline edits currently persist in browser localStorage; they are not synchronized back to SQLite. The original scheduler is preserved; the full deadline-aware scheduling overhaul is still pending. Backend accounts remain a local prototype without user isolation; run locally.
