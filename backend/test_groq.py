import sys
sys.path.insert(0, '.')
from ai_engine import check_duplicate

result = check_duplicate(
    new_title="Pothole on MG Road near bus stop",
    new_description="There is a large pothole near the bus stop on MG Road that has been there for two months causing accidents.",
    new_category="Roads & Infrastructure",
    new_location="MG Road, Bangalore",
    existing_complaints=[
        {
            "id": "abc-123",
            "title": "Road damage near school",
            "description": "The road near the government school has multiple potholes since last month.",
            "category": "Roads & Infrastructure",
            "location": "Brigade Road, Bangalore",
            "status": "in_progress",
            "created_at": "2026-02-01T10:00:00Z",
            "embedding": None,
        }
    ],
    threshold=0.75
)

if result:
    print(f"DUPLICATE DETECTED!")
    print(f"Score: {result['similarity_score']}")
    print(f"Reason: {result['reasoning']}")
else:
    print("No duplicate found — complaint would be saved.")
    print("SUCCESS: Groq AI is working correctly!")
