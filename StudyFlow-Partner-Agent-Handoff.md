# StudyFlow — Working Handoff for Partner’s Development Agent

**Checkpoint:** October 24, 2026  
**Project:** Adaptive AI Student Planner  
**Status:** Local prototype; frontend and FastAPI backend merged  
**Use with:** `StudyFlow-checkpoint-2026-10-24.zip`

## Start here

Inspect the supplied checkpoint before editing. It contains the current UI and parser fixes, not just the earlier upload prototype. Preserve the existing features and data contracts. Make focused changes rather than replacing the entire frontend with an older version.

The user paused additional AI integration work to save this checkpoint. The partner reports having configured OpenAI in a separate version. **Reconcile that version with this checkpoint before implementing another provider integration.** Do not assume that the OpenAI configuration is present in this ZIP.

## 1. Responsibilities and intended product flow

**Partner / this receiving agent:** syllabus and assignment-document uploads, AI extraction, assignment summaries, deliverables, effort/difficulty estimates, and recommended subtasks.

**Sarah’s agent:** availability, scheduling, calendar interactions, and frontend presentation. The full automatic scheduler remains unfinished.

Intended flow:

1. Upload a syllabus; extract assignments and deadlines.
2. Review and correct results before adding them to the planner.
3. Open an individual assignment and upload its instructions, rubric, or supporting documents.
4. AI returns a summary, deliverables, recommended steps, estimated minutes, difficulty, and uncertainties.
5. The scheduling system uses the reviewed analysis to place study sessions around commitments.

The per-assignment upload/analysis interface belongs to the partner and is **not implemented in this checkpoint**. The home chatbot remains rules-based.

## 2. Project layout and local runtime

```text
StudyFlow/
  frontend/
    index.html
    styles.css
    app.js
    availability.js
    availability-ui.js
    scheduler.js
  backend/
    main.py
    config.py
    db.py
    requirements.txt
    models/
    routers/
    services/
    tests/
    studyflow.db
  frontend - Copy/       # Older copy; not the active frontend
  MERGE-README.md
  CHECKPOINT.txt
```

Active project on Sarah’s computer: `C:\Users\sarah\OneDrive\Desktop\Hackathon`.

Local frontend: `http://127.0.0.1:5174/`  
Local backend: `http://127.0.0.1:8000/`  
Health endpoint: `GET /health`

Install `backend/requirements.txt` into a Python 3.11+ virtual environment. Run the API from `backend/` with `python -m uvicorn main:app --host 127.0.0.1 --port 8000`. Serve `frontend/` on port 5174. Backend CORS includes the 5174 localhost origins. The frontend supports `window.STUDYFLOW_API_BASE`, defaulting to port 8000.

Private `.env` files and virtual environments are excluded from the checkpoint. Browser localStorage is **not** included. The SQLite database is included as a consistent backup; its records are not a substitute for browser-local state.

## 3. AI/provider status — verify before changing

The checkpoint’s actual backend still contains:

- `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` in `config.py`.
- Claude API calls in `services/ai_service.py` when that key is configured.
- Local heuristic extraction when the key is absent.
- An `aiEnabled` response flag and a warning indicating fallback mode.

No working OpenAI call was verified in Sarah’s running version. An OpenAI integration was partially prepared in the chat workspace, then paused. Those staged files were **not applied to this checkpoint**.

Required reconciliation:

1. Identify the partner’s actual OpenAI implementation and configuration.
2. Merge that implementation into this checkpoint without discarding the UI/parser changes.
3. Keep credentials server-side in environment variables or a private `.env`.
4. Never put a key into frontend JavaScript, localStorage, logs, shared ZIPs, or chat.
5. Prove that the real upload endpoint calls OpenAI. A successful heuristic import does not prove AI is enabled.
6. Report AI success, missing configuration, authentication failure, rate limits, and fallback mode truthfully. Do not silently substitute heuristic results while labeling them AI results.

Use structured, validated output; treat document text as untrusted source material, never as instructions to the model. Missing deadlines must remain unknown rather than being invented. Preserve source evidence and review warnings.

## 4. Existing upload contract

`POST /syllabus/upload` accepts multipart `file` and optional `term_start`.

```json
{
  "assignments": [],
  "warnings": [],
  "aiEnabled": false
}
```

Extraction does not save assignments. The student reviews an editable table, then **Add to calendar** calls `POST /assignments/bulk`:

```json
{
  "termId": "existing-term-id",
  "assignments": [
    {
      "id": null,
      "courseName": "IST 196",
      "title": "Discussion 8",
      "instructions": "Requirements and explicit due-time information",
      "assignmentType": "discussion",
      "dueDate": "2026-10-25",
      "weightPercent": null,
      "sourceQuote": "Short evidence from the document",
      "confidence": 0.8,
      "difficulty": 2,
      "estimatedMinutes": 60,
      "subtasks": [
        {"id": null, "title": "Review instructions", "estimatedMinutes": 15, "done": false},
        {"id": null, "title": "Draft and review the response", "estimatedMinutes": 45, "done": false}
      ],
      "needsReview": true,
      "status": "not_started"
    }
  ]
}
```

Current backend validation forbids extra fields. **`dueDate` currently accepts date-only `YYYY-MM-DD`, not a timestamp.** Coordinate a schema migration before adding summaries, deliverables, attachments, or timezone-aware deadlines to this model. Preserve explicit deadline times in instructions until a dedicated field is agreed.

The frontend maps returned fields to its existing format:

| Backend | Frontend |
|---|---|
| `id` | `externalId`; frontend also has its own `id` |
| `courseName` | Internal `course` ID |
| `dueDate` | `due` |
| `estimatedMinutes` | `min` |
| `difficulty` 1–5 | `diff` 1–3, currently rounded upward proportionally |
| `subtasks` | `suggestedSubtasks` |
| `status` | Currently initialized through `done` and `progress` |

Use stable assignment IDs for document-analysis updates. Do not create a second assignment every time a student uploads another attachment. Do not overwrite a student’s completion/progress state when refreshing analysis.

## 5. Features that must survive the merge

- Polished Weekly Availability page with visibly selected weekdays and day shortcuts.
- Saved commitments shown above the form, newest/most recently edited first.
- Editable time dropdowns supporting both typed times and 30-minute suggestions. Stored times remain local `HH:MM`.
- Calendar Add event button: title, date, category, all-day or start/end times.
- Clickable calendar events supporting editing, rescheduling, and removal.
- Recurring commitment changes apply to either one occurrence or the entire weekly commitment.
- Single-occurrence moves/removals stored in availability `exceptions`.
- Assignment calendar entries support Mark complete / Mark incomplete instead of removing the deadline. Completion synchronizes with Tasks and survives refresh.
- Completed tasks remain checked, struck through, and grouped at the top.
- Toast notifications at the top of the screen.
- Term selector hidden, but internal term storage preserved for compatibility.
- Each confirmed upload has a stable source ID and color index. Imported tasks carry `sourceId`.
- Matching document colors and numbered labels in Calendar and Tasks, plus a compact calendar key for documents, Work, Personal time, and Class.
- Concise course labels such as CPT 242 / IST 271 instead of repeated extracted headings.
- Review dialog has a visible fixed footer with Add to calendar; the table scrolls separately.
- Upcoming chatbot replies use date groups and assignment cards.

**Current-date rule:** chatbot recommendations consider incomplete assignments due today or later. Upcoming replies default to the next seven days. Past work is not included in recommendations or overdue reminders. Do not generate a backlog from the beginning of an imported semester.

## 6. Document parsing fixes and regression coverage

`services/document_parser.py` handles text-based PDF, DOCX, TXT, Markdown, and CSV. Scanned PDFs still require OCR, which is not implemented.

Important changes:

- `ParsedDocument`, a string subclass, retains reconstructed schedule records in `schedule_rows`.
- PDF table extraction associates task columns with the actual deadline column.
- Word tables support programming problems, discussions, numeric dates, and multiple questions in one cell.
- A borderless weekly-PDF fallback handles separate title/date lines and wrapped titles.
- Word tables must be detected by their actual `docx.table.Table` type. Checking only for a `.rows` attribute caused the PDF crash: `'tuple' object has no attribute 'text'`.
- Preserve `schedule_rows` until the fallback consumes it; slicing/casting the text first loses that metadata.
- Exclude holidays and breaks. Do not assign a date to an exam labeled “schedule to be announced.”

Verified local heuristic results, **not AI accuracy guarantees**:

| Supplied document | Candidate items |
|---|---:|
| CPT242 Fall 2026 Schedule PDF | 36 |
| IST 271 course-information addendum DOCX | 26 |
| IST 196 Schedule PDF | 76 |

The backend regression suite reached 10 passing test cases. These candidate counts can include overlapping attendance/deliverable descriptions; human review remains necessary. Broader AI tests should assess correctness, not force these exact counts.

## 7. Remaining work and integration risks

- Full deadline-aware automatic scheduling is still pending. The old scheduler uses a shared final deadline and can shorten work under capacity pressure. Do not present it as the completed scheduling MVP.
- The future scheduler must respect each assignment’s deadline, commitments and exceptions, sleep, daily limits, and session lengths; preserve workload and report unscheduled minutes.
- Browser-local availability/completion/calendar edits do not synchronize back to backend SQLite. Backend storage currently covers confirmed imports and API records.
- Authentication and backend user isolation are prototypes. Run locally; do not deploy publicly as-is.
- Reimport deduplication currently relies on backend assignment IDs. Reuploading a document can create duplicate assignments when new IDs are generated. Preserve completion states and agree on an import identity strategy.
- Existing ambiguous historical uploads cannot always be linked to their original document with certainty. Do not guess ownership or delete records to tidy the UI.

## 8. Acceptance checks for the partner’s next merge

1. Upload a previously unseen syllabus and verify a real OpenAI request using a configured server-side key.
2. Review extracted results before any save; Cancel must save nothing.
3. Confirm that assignments, dates, course labels, and source colors are correct.
4. Verify missing/ambiguous dates and unsupported/scanned documents produce useful messages.
5. Test invalid keys, unavailable models, rate limits, timeouts, and malformed/incomplete AI output; the upload button must become usable again.
6. Reupload a file without duplicating assignments or resetting completion.
7. Attach assignment details to the correct existing assignment and return analysis without changing its identity.
8. Recheck availability, one-occurrence exceptions, time entry, calendar editing, completion, and current-date chatbot filtering.
9. Run backend tests and relevant frontend checks.
10. Return the changed files, setup instructions, a concise change summary, test results, and known limitations. Exclude credentials and virtual environments from shared packages.

## 9. Questions to resolve between agents

- Where is the partner’s verified OpenAI implementation, and what server configuration does it expect?
- What model is configured, and what timeout/cost limits are intended?
- Will deadline time/timezone be a separate field or a versioned timestamp contract?
- What fields will carry assignment summaries, deliverables, document references, and analysis warnings?
- Will backend assignment records or browser storage become the source of truth?

**Immediate next action:** compare the partner’s OpenAI-enabled version against this checkpoint, merge the provider implementation carefully, and verify an end-to-end upload without regressing the current UI.
