from datetime import date
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from config import MAX_UPLOAD_BYTES
from models.assignment import AssignmentImportResult
from services.document_parser import extract_text
from services.ai_service import extract_assignments, analyze_assignment

router = APIRouter(tags=["syllabus"])

@router.post("/syllabus/upload", response_model=AssignmentImportResult)
async def upload_syllabus(file: UploadFile = File(...), term_start: str | None = Form(default=None)):
    """Parse and analyze a syllabus. Results are NOT saved until student confirms them."""
    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"File too large. Maximum upload is {MAX_UPLOAD_BYTES // (1024*1024)} MB.")
    text = extract_text(raw, file.filename or "upload.txt")
    try:
        assignments = extract_assignments(text, term_start)
        analyzed = [analyze_assignment(item) for item in assignments]
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Assignment analysis failed: {exc}") from exc
    warnings = []
    if not assignments:
        warnings.append("No assignment deadlines were confidently detected. Try a text-based PDF/DOCX, or check the document text and date formatting.")
    if not __import__("config").ANTHROPIC_API_KEY:
        warnings.append("ANTHROPIC_API_KEY is not configured: local rule-based extraction and estimates were used, not AI. Review all results carefully.")
    if any(x.needsReview for x in analyzed):
        warnings.append("Some fields are missing or uncertain. Review highlighted rows before confirming.")
    return AssignmentImportResult(assignments=analyzed, warnings=warnings, aiEnabled=bool(__import__("config").ANTHROPIC_API_KEY))
