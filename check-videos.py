import psycopg2
import sys

# Force UTF-8 encoding for console output
sys.stdout.reconfigure(encoding='utf-8')

# Database connection
DATABASE_URL = "postgresql://postgres:bBjscYLBdysIrAdwahrNtFnJfnZyXAql@ballast.proxy.rlwy.net:32467/railway"

try:
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    print("=" * 80)
    print("VIDEO DATABASE INSPECTION")
    print("=" * 80)

    # Check AI & Technology videos
    cursor.execute("""
        SELECT id, video_id, title, channel_name, view_count,
               summary_status, commented_status, date_added
        FROM videos_ai_technology
        ORDER BY view_count DESC
        LIMIT 5;
    """)

    videos = cursor.fetchall()
    print(f"\nAI & Technology Videos (Top 5 by views):\n")

    for video in videos:
        vid_id, yt_id, title, channel, views, sum_status, com_status, date_added = video
        print(f"  ID: {vid_id}")
        print(f"  Video ID: {yt_id}")
        print(f"  Title: {title[:70]}...")
        print(f"  Channel: {channel}")
        print(f"  Views: {views:,}")
        print(f"  Summary Status: {sum_status}")
        print(f"  Comment Status: {com_status}")
        print(f"  Added: {date_added}")
        print(f"  URL: https://www.youtube.com/watch?v={yt_id}")
        print("-" * 80)

    # Get category stats
    cursor.execute("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN summary_status = 'pending' THEN 1 ELSE 0 END) as pending_summary,
            SUM(CASE WHEN summary_status = 'completed' THEN 1 ELSE 0 END) as completed_summary,
            SUM(CASE WHEN commented_status = 'pending' THEN 1 ELSE 0 END) as pending_comment,
            SUM(CASE WHEN commented_status = 'completed' THEN 1 ELSE 0 END) as completed_comment,
            AVG(view_count) as avg_views,
            MAX(view_count) as max_views
        FROM videos_ai_technology;
    """)

    stats = cursor.fetchone()
    total, pend_sum, comp_sum, pend_com, comp_com, avg_v, max_v = stats

    print(f"\nCATEGORY STATISTICS:")
    print(f"  Total Videos: {total}")
    print(f"  Pending Summary: {pend_sum}")
    print(f"  Completed Summary: {comp_sum}")
    print(f"  Pending Comments: {pend_com}")
    print(f"  Completed Comments: {comp_com}")
    print(f"  Average Views: {int(avg_v):,}" if avg_v else "  Average Views: 0")
    print(f"  Max Views: {int(max_v):,}" if max_v else "  Max Views: 0")

    print("\n" + "=" * 80)

    cursor.close()
    conn.close()

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
