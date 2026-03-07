import os
from pathlib import Path
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from authentication import initialize_database, router as authentication_router
from execution_routes import router as execution_router
from interview_routes import router as interview_router

ENV_PATH = Path(__file__).resolve().with_name(".env")
load_dotenv(ENV_PATH)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await initialize_database()
    yield
    # Shutdown (if needed)

app = FastAPI(title=os.getenv("APP_NAME", "CIA Backend"), lifespan=lifespan)

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
allowed_origins = [origin.strip() for origin in frontend_origin.split(",") if origin.strip()]
if not allowed_origins:
    allowed_origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(authentication_router)
app.include_router(execution_router)
app.include_router(interview_router)
