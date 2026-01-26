import google.generativeai as genai
import os
from dotenv import load_dotenv

# Environment variables load karo
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ Error: API Key nahi mili! .env file check karo.")
else:
    print(f"✅ API Key Found: {api_key[:5]}...*****")
    
    try:
        genai.configure(api_key=api_key)
        
        print("\n🔍 Checking available models for this Key...")
        available_models = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"- {m.name}")
                available_models.append(m.name)
        
        if not available_models:
            print("\n⚠️ Koi model nahi mila! Shayad API Key mein masla hai.")
        else:
            print("\n✅ Setup OK. Upar walay list mein se koi aik name use karein.")

    except Exception as e:
        print(f"\n❌ CRITICAL ERROR: {str(e)}")