import os
from google import genai
from config import get_settings

def test():
    try:
        s = get_settings()
        client = genai.Client(api_key=s.gemini_api_key)
        print("Calling embed_content with text-embedding-004...")
        result = client.models.embed_content(
            model="text-embedding-004",
            contents="This is a test document."
        )
        print("Success!")
        print(len(result.embeddings[0].values), "dimensions")
    except Exception as e:
        print(type(e).__name__)
        print(f"Error: {e}")

if __name__ == "__main__":
    test()
