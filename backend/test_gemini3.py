import os
from google import genai
from config import get_settings

def test():
    try:
        s = get_settings()
        client = genai.Client(api_key=s.gemini_api_key)
        
        print("Listing available models...")
        for m in client.models.list():
            if 'embed' in m.name.lower() or 'text-embedding' in m.name.lower():
                print(m.name)
    except Exception as e:
        print(type(e).__name__)
        print(f"Error: {e}")

if __name__ == "__main__":
    test()
