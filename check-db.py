import psycopg2
import json
import sys

# Force UTF-8 encoding for console output
sys.stdout.reconfigure(encoding='utf-8')

# Database connection
DATABASE_URL = "postgresql://postgres:bBjscYLBdysIrAdwahrNtFnJfnZyXAql@ballast.proxy.rlwy.net:32467/railway"

try:
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    print("=" * 80)
    print("Connected to Railway PostgreSQL Database")
    print("=" * 80)
    print()

    # Get all tables
    cursor.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """)

    tables = cursor.fetchall()
    print(f"Found {len(tables)} tables:\n")

    for table in tables:
        table_name = table[0]
        print(f"\nTable: {table_name}")
        print("-" * 80)

        # Get column information
        cursor.execute(f"""
            SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = '{table_name}'
            ORDER BY ordinal_position;
        """)

        columns = cursor.fetchall()
        print(f"   Columns ({len(columns)}):")
        for col in columns:
            col_name, data_type, max_length, nullable, default = col
            length_str = f"({max_length})" if max_length else ""
            nullable_str = "NULL" if nullable == "YES" else "NOT NULL"
            default_str = f"DEFAULT {default}" if default else ""
            print(f"   - {col_name}: {data_type}{length_str} {nullable_str} {default_str}")

        # Get row count
        cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
        count = cursor.fetchone()[0]
        print(f"   Row count: {count}")

        # Show sample data if exists
        if count > 0:
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 3;")
            rows = cursor.fetchall()
            print(f"   Sample data (first 3 rows):")
            for i, row in enumerate(rows, 1):
                print(f"      Row {i}: {row}")

    print("\n" + "=" * 80)
    print("Database inspection complete!")
    print("=" * 80)

    cursor.close()
    conn.close()

except Exception as e:
    print(f"Error connecting to database: {e}")
    import traceback
    traceback.print_exc()
