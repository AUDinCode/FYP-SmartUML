from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import logging
import os

# Import our OOP Service
from services.ai_service_MASTER import UMLGeneratorService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SmartUML API",
    description="AI-powered UML diagram generator using Gemini Flash",
    version="2.0.0"
)

# --- 1. CORS PERMISSIONS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. INITIALIZE SERVICE ---
uml_service: Optional[UMLGeneratorService] = None

@app.on_event("startup")
async def startup_event():
    """Initialize the UML service on application startup."""
    global uml_service
    try:
        uml_service = UMLGeneratorService()
        logger.info("✅ AI Service Initialized Successfully")
    except ValueError as e:
        logger.error(f"❌ Service Initialization Failed: {e}")
        logger.error("⚠️  API will run but diagram generation will be unavailable")
        uml_service = None
    except Exception as e:
        logger.error(f"❌ Unexpected Error During Initialization: {e}")
        uml_service = None

# --- 3. DATA MODELS ---
class DiagramRequest(BaseModel):
    prompt: str = Field(
        ..., 
        min_length=3, 
        max_length=2000,
        description="Natural language description of the diagram to generate",
        example="Create a use case diagram for a library management system with librarian and student actors"
    )
    diagram_type: str = Field(
        ...,
        description="Type of UML diagram to generate",
        example="Use Case Diagram"
    )

class DiagramResponse(BaseModel):
    status: str
    diagram_code: Optional[str] = None
    message: str

class ErrorResponse(BaseModel):
    status: str = "error"
    message: str
    detail: Optional[str] = None

# --- 4. ROUTES ---

@app.get("/")
async def read_root():
    """Health check endpoint."""
    return {
        "message": "✅ SmartUML Backend v2.0 is Running!",
        "service_status": "operational" if uml_service else "degraded",
        "supported_diagrams": ["Use Case Diagram", "Class Diagram", "Activity Diagram"]
    }

@app.get("/health")
async def health_check():
    """Detailed health check endpoint."""
    return {
        "status": "healthy" if uml_service else "unhealthy",
        "ai_service": "initialized" if uml_service else "not initialized",
        "api_key": "configured" if os.getenv("GEMINI_API_KEY") else "missing"
    }

@app.post(
    "/generate-diagram",
    response_model=DiagramResponse,
    responses={
        200: {"description": "Diagram generated successfully"},
        400: {"description": "Invalid request parameters"},
        500: {"description": "Internal server error"},
        503: {"description": "Service unavailable"}
    }
)
async def generate_uml(request: DiagramRequest):
    """
    Generate a UML diagram from a natural language prompt.
    
    **Supported Diagram Types:**
    - Use Case Diagram
    - Class Diagram
    - Activity Diagram
    
    **Example Request:**
    ```json
    {
        "prompt": "Create a use case diagram for an ATM system",
        "diagram_type": "Use Case Diagram"
    }
    ```
    """
    logger.info(f"📩 Received Request: {request.diagram_type}")
    logger.debug(f"Prompt: {request.prompt[:100]}...")
    
    # Check if service is initialized
    if not uml_service:
        logger.error("🚫 Service not available - API key might be missing")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI Service is not initialized. Please check server configuration and ensure GEMINI_API_KEY is set."
        )
    
    # Validate diagram type
    valid_types = ["Use Case Diagram", "Class Diagram", "Activity Diagram"]
    if request.diagram_type not in valid_types:
        logger.warning(f"⚠️  Invalid diagram type requested: {request.diagram_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid diagram type. Supported types: {', '.join(valid_types)}"
        )
    
    try:
        # Generate the diagram
        logger.info(f"🔄 Generating {request.diagram_type}...")
        diagram_xml = uml_service.generate_diagram(
            prompt=request.prompt,
            diagram_type=request.diagram_type
        )
        
        logger.info(f"✅ Diagram Generated Successfully ({len(diagram_xml)} characters)")
        
        return DiagramResponse(
            status="success",
            diagram_code=diagram_xml,
            message=f"{request.diagram_type} generated successfully using Gemini Flash"
        )
    
    except ValueError as e:
        # Client error (bad prompt, invalid format, etc.)
        logger.error(f"❌ Value Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    except Exception as e:
        # Server error (AI service failure, etc.)
        logger.error(f"❌ Unexpected Error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate diagram: {str(e)}"
        )

@app.get("/supported-diagrams")
async def get_supported_diagrams():
    """Get list of supported diagram types with descriptions."""
    return {
        "diagrams": [
            {
                "type": "Use Case Diagram",
                "description": "Shows actors and their interactions with the system",
                "example": "Create a use case diagram for an e-commerce platform"
            },
            {
                "type": "Class Diagram",
                "description": "Shows classes, attributes, methods, and relationships",
                "example": "Create a class diagram for a university system with Student and Course classes"
            },
            {
                "type": "Activity Diagram",
                "description": "Shows workflow and decision points in a process",
                "example": "Create an activity diagram for user login process"
            }
        ]
    }

# --- 5. ERROR HANDLERS ---

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "message": exc.detail,
            "status_code": exc.status_code
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Catch-all exception handler."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "An unexpected error occurred",
            "detail": str(exc) if app.debug else None
        }
    )