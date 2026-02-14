"""
MASTER UML DIAGRAM SERVICE
Integrates three specialized generators for perfect diagram generation
"""
import google.generativeai as genai
import os
from dotenv import load_dotenv

# Import specialized generators
import sys
sys.path.append(os.path.dirname(__file__))

from activity_diagram_generator import ActivityDiagramGenerator
from class_diagram_generator import ClassDiagramGenerator
from usecase_diagram_generator import UseCaseDiagramGenerator

load_dotenv()


class UMLGeneratorService:
    """
    Master service that routes to specialized diagram generators.
    Each diagram type has its own dedicated generator for perfect results.
    """
    
    def __init__(self):
        """Initialize all specialized generators."""
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("❌ ERROR: GEMINI_API_KEY not found in environment variables.")
        
        print("🔧 Initializing specialized diagram generators...")
        
        try:
            self.activity_generator = ActivityDiagramGenerator()
            print("  ✅ Activity Diagram Generator ready")
        except Exception as e:
            print(f"  ❌ Activity Generator failed: {e}")
            self.activity_generator = None
        
        try:
            self.class_generator = ClassDiagramGenerator()
            print("  ✅ Class Diagram Generator ready")
        except Exception as e:
            print(f"  ❌ Class Generator failed: {e}")
            self.class_generator = None
        
        try:
            self.usecase_generator = UseCaseDiagramGenerator()
            print("  ✅ Use Case Diagram Generator ready")
        except Exception as e:
            print(f"  ❌ Use Case Generator failed: {e}")
            self.usecase_generator = None
        
        print("🎯 Master UML Service initialized successfully!")
    
    def generate_diagram(self, prompt: str, diagram_type: str) -> str:
        """
        Main entry point: Route to appropriate specialized generator.
        
        Args:
            prompt: User's natural language description
            diagram_type: "Use Case Diagram", "Class Diagram", or "Activity Diagram"
        
        Returns:
            Draw.io compatible XML string
        
        Raises:
            ValueError: If diagram generation fails
        """
        print(f"\n{'='*70}")
        print(f"🚀 GENERATING: {diagram_type}")
        print(f"📝 PROMPT: {prompt[:100]}...")
        print(f"{'='*70}")
        
        try:
            if "Activity" in diagram_type:
                if not self.activity_generator:
                    raise ValueError("Activity Diagram Generator not available")
                return self.activity_generator.generate_diagram(prompt)
            
            elif "Class" in diagram_type:
                if not self.class_generator:
                    raise ValueError("Class Diagram Generator not available")
                return self.class_generator.generate_diagram(prompt)
            
            elif "Use Case" in diagram_type:
                if not self.usecase_generator:
                    raise ValueError("Use Case Diagram Generator not available")
                return self.usecase_generator.generate_diagram(prompt)
            
            else:
                raise ValueError(f"Unsupported diagram type: {diagram_type}")
        
        except Exception as e:
            error_msg = f"Failed to generate {diagram_type}: {str(e)}"
            print(f"❌ {error_msg}")
            raise ValueError(error_msg)


# For standalone testing
if __name__ == "__main__":
    print("\n" + "="*70)
    print("🧪 TESTING MASTER UML SERVICE")
    print("="*70)
    
    service = UMLGeneratorService()
    
    # Test Activity Diagram
    print("\n\n" + "="*70)
    print("TEST 1: Activity Diagram")
    print("="*70)
    try:
        result = service.generate_diagram(
            "Create an activity diagram for order fulfillment with parallel processing",
            "Activity Diagram"
        )
        print(f"✅ Generated {len(result)} characters of XML")
    except Exception as e:
        print(f"❌ Test failed: {e}")
    
    # Test Class Diagram
    print("\n\n" + "="*70)
    print("TEST 2: Class Diagram")
    print("="*70)
    try:
        result = service.generate_diagram(
            "Create a class diagram for library management system",
            "Class Diagram"
        )
        print(f"✅ Generated {len(result)} characters of XML")
    except Exception as e:
        print(f"❌ Test failed: {e}")
    
    # Test Use Case Diagram
    print("\n\n" + "="*70)
    print("TEST 3: Use Case Diagram")
    print("="*70)
    try:
        result = service.generate_diagram(
            "Create a use case diagram for ATM system",
            "Use Case Diagram"
        )
        print(f"✅ Generated {len(result)} characters of XML")
    except Exception as e:
        print(f"❌ Test failed: {e}")
    
    print("\n\n" + "="*70)
    print("🎉 ALL TESTS COMPLETE")
    print("="*70)