from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os

# 👇 Humari nayi OOP Service import kar rahe hain
from services.ai_service import UMLGeneratorService

app = FastAPI()

# --- 1. CORS PERMISSIONS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. INITIALIZE SERVICE ---
# Application start hotay hi hum Service ka Object bana lenge
try:
    uml_service = UMLGeneratorService()
    print("✅ AI Service Initialized via OOP Architecture")
except Exception as e:
    print(f"❌ Service Start Error: {e}")
    uml_service = None

# --- 3. DATA STRUCTURE ---
class DiagramRequest(BaseModel):
    prompt: str
    diagram_type: str

# --- 4. ROUTES ---

@app.get("/")
def read_root():
    return {"message": "✅ SmartUML Backend (OOP Version) is Running!"}

@app.post("/generate-diagram")
async def generate_uml(request: DiagramRequest):
    print(f"📩 Request Aayi: {request.diagram_type} - {request.prompt}")
    
    # Safety Check: Agar API Key masla kar rahi thi to service None hogi
    if not uml_service:
        return {
            "status": "error", 
            "message": "Backend Service initialization failed. Check server logs."
        }

    try:
        # 👇 Ab hum Class ka method use kar rahe hain (Clean Code)
        # Humain nahi fikar ke prompt kaise bana, wo service ka kaam hai.
        cleaned_code = uml_service.generate_diagram(request.prompt, request.diagram_type)
        
        print("✅ PlantUML Code Generated Successfully via OOP Service!")
        
        return {
            "status": "success",
            "diagram_code": cleaned_code,
            "message": "Generated via Gemini Flash (OOP)"
        }

    except Exception as e:
        print(f"❌ Error aaya: {str(e)}")
        return {
            "status": "error", 
            "message": str(e)
        }