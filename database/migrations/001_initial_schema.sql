-- Initial Schema for YouTube Commenting Automation
-- Version: 1.0
-- Date: 2025-10-14

-- ============================================
-- 1. CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    table_name VARCHAR(100) UNIQUE NOT NULL,

    -- Notion Integration
    notion_database_id TEXT,
    notion_database_name TEXT,

    -- Statistics
    total_videos INTEGER DEFAULT 0,
    completed_videos INTEGER DEFAULT 0,

    -- Settings
    min_view_threshold BIGINT DEFAULT 100000,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_table_name ON categories(table_name);

-- ============================================
-- 2. EXTENSION SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS extension_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default promo texts
INSERT INTO extension_settings (setting_key, setting_value, description) VALUES
    ('promo_text_1', '📌 This summary was generated with [YourTool]', 'Promo text variant 1'),
    ('promo_text_2', '🎥 Generated chapter breakdown using www.yourtool.com', 'Promo text variant 2'),
    ('promo_text_3', '💡 Want to summarize other videos? Search for [YourTool] on Google', 'Promo text variant 3'),
    ('promo_text_4', '⚡ Auto-summarized with [YourTool] - Try it yourself!', 'Promo text variant 4')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- 3. DAILY PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS daily_progress (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    videos_commented INTEGER DEFAULT 0,
    categories_worked TEXT[],
    last_reset_at TIMESTAMP,
    timezone VARCHAR(20) DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for date lookups
CREATE INDEX IF NOT EXISTS idx_daily_progress_date ON daily_progress(date DESC);

-- Insert today's record if not exists
INSERT INTO daily_progress (date, videos_commented, last_reset_at)
VALUES (CURRENT_DATE, 0, NOW())
ON CONFLICT (date) DO NOTHING;

-- ============================================
-- 4. FUNCTION TO CREATE CATEGORY VIDEO TABLE
-- ============================================
CREATE OR REPLACE FUNCTION create_category_video_table(category_table_name TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            -- Primary Key
            id SERIAL PRIMARY KEY,

            -- Video Identifiers
            video_id VARCHAR(20) UNIQUE NOT NULL,
            url TEXT NOT NULL,

            -- Basic Info
            title TEXT NOT NULL,
            channel_name TEXT,
            channel_url TEXT,
            channel_subscriber_count TEXT,
            view_count BIGINT,
            likes INTEGER,
            duration TEXT,
            thumbnail_url TEXT,
            upload_date TIMESTAMP,

            -- Metadata
            tags TEXT[],
            description TEXT,

            -- Summary Status
            summary_status VARCHAR(20) DEFAULT ''pending'',
            summary_text TEXT,
            summary_generated_at TIMESTAMP,

            -- Comment Status
            commented_status VARCHAR(20) DEFAULT ''pending'',
            commented_at TIMESTAMP,
            comment_type VARCHAR(20),
            comment_text TEXT,
            promo_text TEXT,
            promo_position VARCHAR(10),

            -- Notion Integration
            notion_saved BOOLEAN DEFAULT FALSE,
            notion_page_id TEXT,
            notion_saved_at TIMESTAMP,

            -- Timestamps
            date_added TIMESTAMP DEFAULT NOW(),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_%I_commented_status ON %I(commented_status);
        CREATE INDEX IF NOT EXISTS idx_%I_summary_status ON %I(summary_status);
        CREATE INDEX IF NOT EXISTS idx_%I_date_added ON %I(date_added DESC);
        CREATE INDEX IF NOT EXISTS idx_%I_video_id ON %I(video_id);
    ', category_table_name,
       category_table_name, category_table_name,
       category_table_name, category_table_name,
       category_table_name, category_table_name,
       category_table_name, category_table_name);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. TRIGGER FUNCTION FOR AUTOMATIC TABLE CREATION
-- ============================================
CREATE OR REPLACE FUNCTION create_video_table_on_category_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Create the video table when a new category is inserted
    PERFORM create_category_video_table(NEW.table_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_create_video_table ON categories;
CREATE TRIGGER trigger_create_video_table
AFTER INSERT ON categories
FOR EACH ROW
EXECUTE FUNCTION create_video_table_on_category_insert();

-- ============================================
-- 6. FUNCTION TO UPDATE DAILY PROGRESS
-- ============================================
CREATE OR REPLACE FUNCTION increment_daily_progress(category_name_param TEXT)
RETURNS TABLE(new_count INTEGER, date_val DATE) AS $$
DECLARE
    current_count INTEGER;
    current_date DATE := CURRENT_DATE;
BEGIN
    -- Insert or update today's progress
    INSERT INTO daily_progress (date, videos_commented, categories_worked, last_reset_at)
    VALUES (current_date, 1, ARRAY[category_name_param], NOW())
    ON CONFLICT (date) DO UPDATE
    SET
        videos_commented = daily_progress.videos_commented + 1,
        categories_worked = array_append(daily_progress.categories_worked, category_name_param),
        updated_at = NOW()
    RETURNING daily_progress.videos_commented, daily_progress.date INTO current_count, current_date;

    RETURN QUERY SELECT current_count, current_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. SAMPLE CATEGORIES (Optional - Comment out if not needed)
-- ============================================
-- Insert sample categories
INSERT INTO categories (name, table_name, min_view_threshold) VALUES
    ('AI & Technology', 'videos_ai_technology', 100000),
    ('Marketing', 'videos_marketing', 50000),
    ('Fitness & Health', 'videos_fitness_health', 50000)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- SCHEMA SETUP COMPLETE
-- ============================================
-- The schema is now ready!
--
-- To add a new category programmatically:
-- INSERT INTO categories (name, table_name, min_view_threshold)
-- VALUES ('Your Category', 'videos_your_category', 100000);
--
-- The video table will be created automatically via trigger!
