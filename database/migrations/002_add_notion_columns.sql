-- Add Notion Integration Columns to Categories Table
-- This migration is safe to run multiple times (idempotent)
-- Date: 2025-10-15

-- Add notion_database_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'categories'
        AND column_name = 'notion_database_id'
    ) THEN
        ALTER TABLE categories ADD COLUMN notion_database_id TEXT;
        RAISE NOTICE 'Added notion_database_id column to categories table';
    ELSE
        RAISE NOTICE 'notion_database_id column already exists';
    END IF;
END $$;

-- Add notion_database_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'categories'
        AND column_name = 'notion_database_name'
    ) THEN
        ALTER TABLE categories ADD COLUMN notion_database_name TEXT;
        RAISE NOTICE 'Added notion_database_name column to categories table';
    ELSE
        RAISE NOTICE 'notion_database_name column already exists';
    END IF;
END $$;

-- Migration complete
