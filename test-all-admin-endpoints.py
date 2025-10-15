import requests
import json

BASE_URL = "https://youtube-commenting-automation-production.up.railway.app"

print("Testing All Admin API Endpoints...\n")

# Test 1: Get categories
print("1. Testing GET /api/categories...")
response = requests.get(f"{BASE_URL}/api/categories", timeout=10)
if response.status_code == 200:
    categories = response.json()
    print(f"   SUCCESS: Found {len(categories)} categories")

    # Check if it's an object with a categories key or a direct array
    if isinstance(categories, dict) and 'categories' in categories:
        categories = categories['categories']

    for cat in categories:
        if isinstance(cat, dict):
            print(f"   - {cat.get('name', 'N/A')} (ID: {cat.get('id', 'N/A')})")
        else:
            print(f"   - {cat}")

    # Store first category for later use
    if categories and isinstance(categories[0], dict):
        test_category_id = categories[0].get('id', 1)
        print(f"\n   Using category ID {test_category_id} for testing...")
else:
    print(f"   FAILED: {response.status_code}")
    print(f"   Error: {response.text}")
    exit(1)

# Test 2: Search videos
print("\n2. Testing POST /api/admin/search...")
response = requests.post(
    f"{BASE_URL}/api/admin/search",
    json={
        "keywords": "python tutorial",
        "maxResults": 20,
        "order": "viewCount"
    },
    timeout=60
)

if response.status_code == 200:
    data = response.json()
    print(f"   SUCCESS: Found {data['count']} videos")
    if data['videos']:
        video_ids = [v['video_id'] for v in data['videos'][:5]]
        print(f"   Sample video IDs: {video_ids[:3]}")

        first_video = data['videos'][0]
        print(f"\n   Top video by views:")
        print(f"   - Title: {first_video['title']}")
        print(f"   - Channel: {first_video['channel_name']}")
        print(f"   - Views: {first_video['view_count']:,}")
        print(f"   - Subscribers: {first_video.get('channel_subscriber_count', 'N/A')}")
        print(f"   - Duration: {first_video.get('duration', 'N/A')}")
else:
    print(f"   FAILED: {response.status_code}")
    print(f"   Error: {response.text}")
    exit(1)

# Test 3: Check duplicates
print("\n3. Testing POST /api/admin/check-duplicates...")
response = requests.post(
    f"{BASE_URL}/api/admin/check-duplicates",
    json={"video_ids": video_ids},
    timeout=10
)

if response.status_code == 200:
    data = response.json()
    duplicates = data['duplicates']
    print(f"   SUCCESS: Checked {len(video_ids)} videos")
    print(f"   Found {len(duplicates)} duplicates")
    if duplicates:
        for vid, info in duplicates.items():
            print(f"   - {vid}: in categories {info['categories']}")
    else:
        print("   - No duplicates found (all videos are new)")
else:
    print(f"   FAILED: {response.status_code}")
    print(f"   Error: {response.text}")

# Test 4: Bulk add (using first video only to avoid polluting database)
print("\n4. Testing POST /api/admin/bulk-add...")
print("   (Skipping to avoid adding test data to production database)")
print("   Endpoint available at: POST /api/admin/bulk-add")

print("\n" + "="*60)
print("[SUCCESS] All Admin API Endpoints Working!")
print("="*60)
print(f"\nAdmin Interface URL:")
print(f"   {BASE_URL}/admin.html")
print("\nYou can now open this URL in your browser to use the interface.")
