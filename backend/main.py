import os
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# --- 1. SETUP & CONFIGURATION ---
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ ERROR: API Key nahi mili! .env file check karo.")
else:
    print("✅ API Key Loaded Successfully")
    genai.configure(api_key=api_key)

# Model Selection: 'gemini-flash-latest' sab se stable aur tez hai
model = genai.GenerativeModel('models/gemini-flash-latest')

app = FastAPI()

# --- 2. CORS PERMISSIONS (Frontend Connection ke liye) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Development ke liye sab allow hai
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. DATA STRUCTURE ---
class DiagramRequest(BaseModel):
    prompt: str
    diagram_type: str  # e.g., "Class Diagram", "Use Case Diagram"

# --- 4. ROUTES (API Endpoints) ---

@app.get("/")
def read_root():
    return {"message": "✅ SmartUML Backend is Running (PlantUML Mode)!"}

@app.post("/generate-diagram")
async def generate_uml(request: DiagramRequest):
    print(f"📩 Request Aayi: {request.diagram_type} - {request.prompt}")
    
    try:
        # --- SMART PROMPT FOR PLANTUML ---
        # Hum AI ko specifically PlantUML syntax use karne ka bolenge
        system_instruction = f"""
        Act as a Senior Software Architect.
        Create a **PlantUML** diagram code for a **{request.diagram_type}**.
        Scenario: "{request.prompt}"

        STRICT RULES:
        1. **MUST start with @startuml and end with @enduml.**
        2. Return ONLY the code string.
        3. Do NOT use markdown code blocks (no backticks ```).
        4. If details are missing, make logical assumptions based on standard software engineering practices.
        5. Keep the syntax simple and correct.
        """

        # Diagram specific syntax guides (Taake diagram achi banay)
        if "Class" in request.diagram_type:
            system_instruction += "\nUse logical class relationships (extension <|--, composition *--, aggregation o--)."
        elif "Sequence" in request.diagram_type:
            system_instruction += "\nUse 'participant', 'actor', and '->' syntax."
        elif "Use Case" in request.diagram_type:
            system_instruction += "\nUse 'actor', 'usecase' and connections (-->)."
        elif "Activity" in request.diagram_type:
            system_instruction += "\nUse 'start', 'stop', ':', 'if' syntax."
        
        # --- CALLING GOOGLE GEMINI ---
        response = model.generate_content(system_instruction)
        
        # --- CLEANING RESPONSE ---
        # AI kabhi kabhi markdown laga deta hai, usay saaf karna zaroori hai
        cleaned_code = response.text.replace("```plantuml", "").replace("```", "").strip()
        
        # Double check: Agar @startuml nahi hai to khud laga do
        if not cleaned_code.startswith("@startuml"):
            cleaned_code = "@startuml\n" + cleaned_code
        if not cleaned_code.endswith("@enduml"):
            cleaned_code = cleaned_code + "\n@enduml"

        print("✅ PlantUML Code Generated Successfully!")
        
        return {
            "status": "success",
            "diagram_code": cleaned_code,
            "message": "Generated via Gemini Flash (PlantUML)"
        }

    except Exception as e:
        print(f"❌ Error aaya: {str(e)}")
        return {
            "status": "error", 
            "message": str(e)
        }

# Server chalane ke liye: uvicorn main:app --reload