# StudyFlow — Integrated Partner Merge

Checkpoint: October 24, 2026.

## Included
- Existing availability UI, time dropdowns, calendar editing, recurring exceptions, Add event, document colors, compact course labels, completion tracking, and formatted upcoming-assignment replies.
- Partner's OpenAI backend: syllabus extraction, main assistant, per-assignment document analysis, editable work sections, and grounded assignment Q&A.
- Work on assignment button in Tasks. Scheduled sections are persisted and displayed on the calendar.
- Work-section scheduling now checks saved recurring commitments, their exceptions, and one-time calendar events. It reports insufficient capacity instead of reducing section estimates.
- Tested parser fixes retained for PDF tables, Word tables, and borderless weekly PDF schedules.

## Setup
1. Install Python 3.11+ and create a virtual environment: `py -m venv .venv`.
2. Install dependencies: `.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt`.
3. Copy `backend/.env.example` to `backend/.env`; enter your OpenAI API key locally and confirm the model is available to that account. Never share the populated file.
4. Start backend from the project root: `.\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000`.
5. In another terminal: `.\.venv\Scripts\python.exe -m http.server 5174 --bind 127.0.0.1 --directory frontend`.
6. Open http://127.0.0.1:5174.

`GET /syllabus/status` reports provider/model and whether a key is configured; it never returns the key. Configuration presence is not proof the key is valid. The existing prototype defaults to gpt-5.4-mini, as supplied by the partner; override OPENAI_MODEL to an account-accessible model if necessary.

## Verification
- 12 backend tests passed, including simulated OpenAI syllabus extraction, analysis, chat, Q&A, missing-key errors, and unsupported-file rejection.
- 4 scheduler tests passed, including workload preservation, non-overlap, busy-time avoidance, and insufficient-capacity reporting.
- Actual provided syllabi with local fallback: CPT242 PDF 36 candidates; IST 271 DOCX 26; IST 196 PDF 76.
- Browser checks: assignment document upload, editable sections, schedule persistence after refresh, part progress, calendar completion/restoration, temporary task cleanup, event add/remove, preserved availability dropdowns, empty-upload failure followed by a successful retry, and current-date assignment cards.

## AI status at delivery
The partner ZIP's OPENAI_API_KEY setting was empty. No real OpenAI request could be tested. The running app reports local/fallback mode; assignment Q&A reports missing configuration. Simulated provider tests do not establish live model quality, account access, billing, or latency.

## Data and remaining limits
- Existing database and browser data were preserved on Sarah's machine; the partner database was not imported.
- This shareable ZIP excludes credentials, databases, runtime caches, and virtual environments. It does not include browser localStorage.
- Assignment documents and analysis are stored on the existing browser task. They do not create replacement assignments or reset completion.
- Authentication/user isolation and cross-device synchronization remain prototype limitations.
- The original basic chatbot study-plan generator remains in the local fallback. A complete automatic scheduler across all assignment deadlines and automatic recalculation is still pending.
- Detailed section estimates can be edited; completed sections are retained when rescheduling. Review partial-capacity notices.
- A syllabus currently makes an extraction call followed by effort-analysis calls per assignment when AI is configured. Large syllabi may be slow; this should be batched in a later optimization.
- Reupload deduplication still depends on backend IDs and can duplicate a syllabus uploaded with new IDs. Do not reimport an already-saved document solely to test the service.
- Scanned PDFs still require OCR, which is not included.
