from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
from fastapi_app.routes import auth, items

app = FastAPI()

# Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict to "http://localhost:5500" or your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ REGISTER API ROUTES FIRST (before static files)
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(items.router, prefix="/items", tags=["Items"])

# ✅ Path setup
root_path = os.path.join(os.path.dirname(__file__), "..", "..")
frontend_path = os.path.join(root_path, "frontend")
uploads_path = os.path.join(root_path, "uploads")

# ✅ Serve specific static directories (NOT root)
app.mount("/css", StaticFiles(directory=os.path.join(frontend_path, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(frontend_path, "js")), name="js")
app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")
app.mount("/images", StaticFiles(directory=uploads_path), name="images")

# ✅ Serve HTML pages with explicit routes
@app.get("/", response_class=HTMLResponse)
def serve_login():
    with open(os.path.join(frontend_path, "index.html")) as f:
        return f.read()

@app.get("/signup", response_class=HTMLResponse)
def serve_signup():
    with open(os.path.join(frontend_path, "signup.html")) as f:
        return f.read()

# ✅ Mount static files at /static instead of root to avoid conflicts
app.mount("/static", StaticFiles(directory=frontend_path, html=True), name="static_files")