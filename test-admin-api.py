import requests
import json

BASE_URL = "https://youtube-commenting-automation-production.up.railway.app"

print("Testing Admin API Endpoints...\n")

# Test 1: Small search
print("1. Testing search endpoint (10 results)...")
response = requests.post(
    f"{BASE_URL}/api/admin/search",
    json={
        "keywords": "AI tutorial",
        "maxResults": 10,
        "order": "relevance"
    },
    timeout=30
)

if response.status_code == 200:
    data = response.json()
    print(f"   SUCCESS: Found {data['count']} videos")
    if data['videos']:
        first_video = data['videos'][0]
        print(f"   First video: {first_video['title']}")
        print(f"   Channel: {first_video['channel_name']}")
        print(f"   Views: {first_video['view_count']:,}")
        print(f"   Subscribers: {first_video.get('channel_subscriber_count', 'N/A')}")
else:
    print(f"   FAILED: {response.status_code}")
    print(f"   Error: {response.text}")

print("\n2. All tests complete!")
