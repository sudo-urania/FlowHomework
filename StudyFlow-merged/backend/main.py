from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import syllabus, assignments, availability, brightspace
from db import init_db

app = FastAPI(title="StudyFlow API", version="0.1.0", description="Syllabus extraction and student planning API")
# For local development. In production, restrict origins to your deployed frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5174", "http://localhost:5174", "http://127.0.0.1:5500", "http://localhost:5500", "http://127.0.0.1:8000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

@app.get("/health")
def health():
    return {"status": "ok", "service": "StudyFlow API"}

app.include_router(syllabus.router)
app.include_router(assignments.router)
app.include_router(availability.router)
app.include_router(brightspace.router)
