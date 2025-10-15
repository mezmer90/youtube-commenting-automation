import psycopg2
from datetime import datetime

# Railway PostgreSQL connection
DATABASE_URL = "postgresql://postgres:bBjscYLBdysIrAdwahrNtFnJfnZyXAql@ballast.proxy.rlwy.net:32467/railway"

def init_processed_videos_table():
    try:
        print("Connecting to Railway PostgreSQL...")
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("Creating processed_videos table...")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS processed_videos (
                id SERIAL PRIMARY KEY,
                video_id VARCHAR(20) NOT NULL UNIQUE,
                categories TEXT[] DEFAULT '{}',
                first_added_to_category VARCHAR(100),
                date_added TIMESTAMP DEFAULT NOW(),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_processed_videos_video_id
            ON processed_videos(video_id);
        """)

        conn.commit()

        print("[SUCCESS] processed_videos table created successfully!")

        # Check table structure
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'processed_videos'
            ORDER BY ordinal_position;
        """)

        columns = cursor.fetchall()
        print("\nTable structure:")
        for col in columns:
            print(f"  - {col[0]}: {col[1]}")

        cursor.close()
        conn.close()

        print("\n[SUCCESS] Initialization complete!")

    except Exception as e:
        print(f"[ERROR] {e}")
        raise

if __name__ == "__main__":
    init_processed_videos_table()
