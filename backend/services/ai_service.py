import google.generativeai as genai
import os
from dotenv import load_dotenv

# Environment variables load kar rahe hain
load_dotenv()

class UMLGeneratorService:
    def __init__(self):
        """
        Constructor: Jab Service start hogi, ye API Key check karega
        aur Model configure karega.
        """
        self.api_key = os.getenv("GEMINI_API_KEY")
        
        if not self.api_key:
            raise ValueError("❌ ERROR: API Key nahi mili! .env file check karo.")
        
        genai.configure(api_key=self.api_key)
        # Model yahan set kar rahe hain taake baad mein change karna asaan ho
        self.model = genai.GenerativeModel('models/gemini-flash-latest')

    def _construct_prompt(self, diagram_type: str, scenario: str) -> str:
        """
        Private Method: Sirf Prompt banane ka logic (Encapsulation).
        Tumhara original prompt logic yahan copy kiya hai.
        """
        system_instruction = f"""
        Act as a Senior Software Architect.
        Create a **PlantUML** diagram code for a **{diagram_type}**.
        Scenario: "{scenario}"

        STRICT RULES:
        1. **MUST start with @startuml and end with @enduml.**
        2. Return ONLY the code string.
        3. Do NOT use markdown code blocks (no backticks ```).
        4. If details are missing, make logical assumptions based on standard software engineering practices.
        5. Keep the syntax simple and correct.
        """

        # Diagram specific syntax guides
        if "Class" in diagram_type:
            system_instruction += "\nUse logical class relationships (extension <|--, composition *--, aggregation o--)."
        elif "Sequence" in diagram_type:
            system_instruction += "\nUse 'participant', 'actor', and '->' syntax."
        elif "Use Case" in diagram_type:
            system_instruction += "\nUse 'actor', 'usecase' and connections (-->)."
        elif "Activity" in diagram_type:
            system_instruction += "\nUse 'start', 'stop', ':', 'if' syntax."
            
        return system_instruction

    def _clean_response(self, text: str) -> str:
        """
        Private Method: Response ko saaf karne ka logic.
        """
        # Markdown backticks hatana
        cleaned_code = text.replace("```plantuml", "").replace("```", "").strip()
        
        # Tags verify karna
        if not cleaned_code.startswith("@startuml"):
            cleaned_code = "@startuml\n" + cleaned_code
        if not cleaned_code.endswith("@enduml"):
            cleaned_code = cleaned_code + "\n@enduml"
            
        return cleaned_code

    def generate_diagram(self, prompt: str, diagram_type: str) -> str:
        """
        Public Method: Main function jo main.py call karega.
        """
        full_prompt = self._construct_prompt(diagram_type, prompt)
        
        try:
            # AI ko call karna
            response = self.model.generate_content(full_prompt)
            # Response clean karke wapis bhejna
            return self._clean_response(response.text)
        except Exception as e:
            # Error ko main file tak pohanchana
            raise Exception(f"AI Generation Error: {str(e)}")