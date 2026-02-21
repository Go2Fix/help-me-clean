-- ============================================
-- Migration 000024: Remove duplicate attributes from cleaners table
-- Consolidates full_name, email, phone to users table
-- ============================================

-- Step 1: For existing cleaners with NULL user_id, create corresponding User records
-- These are invited cleaners who haven't accepted yet
INSERT INTO users (email, full_name, phone, role, status, created_at, updated_at)
SELECT
    c.email,
    c.full_name,
    c.phone,
    'cleaner'::user_role,
    CASE
        WHEN c.status = 'invited' THEN 'pending'::user_status
        ELSE 'active'::user_status
    END,
    c.created_at,
    NOW()
FROM cleaners c
WHERE c.user_id IS NULL
  AND c.email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

-- Step 2: Link cleaners to their newly created users
UPDATE cleaners c
SET user_id = u.id
FROM users u
WHERE c.user_id IS NULL
  AND c.email IS NOT NULL
  AND u.email = c.email
  AND u.role = 'cleaner';

-- Step 3: For any remaining cleaners with NULL user_id and no email (edge case),
-- create placeholder users with generated emails
DO $$
DECLARE
    cleaner_record RECORD;
    generated_email VARCHAR(255);
BEGIN
    FOR cleaner_record IN
        SELECT id, full_name, phone, created_at
        FROM cleaners
        WHERE user_id IS NULL
    LOOP
        -- Generate unique email from cleaner ID
        generated_email := 'cleaner-' || cleaner_record.id::text || '@pending.go2fix.ro';

        -- Create user
        INSERT INTO users (email, full_name, phone, role, status, created_at, updated_at)
        VALUES (
            generated_email,
            cleaner_record.full_name,
            cleaner_record.phone,
            'cleaner',
            'pending',
            cleaner_record.created_at,
            NOW()
        )
        ON CONFLICT (email) DO NOTHING;

        -- Link cleaner to user
        UPDATE cleaners
        SET user_id = (SELECT id FROM users WHERE email = generated_email)
        WHERE id = cleaner_record.id;
    END LOOP;
END $$;

-- Step 4: Verify all cleaners now have user_id (this will fail migration if any don't)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cleaners WHERE user_id IS NULL) THEN
        RAISE EXCEPTION 'Migration failed: Some cleaners still have NULL user_id';
    END IF;
END $$;

-- Step 5: Make user_id NOT NULL
ALTER TABLE cleaners ALTER COLUMN user_id SET NOT NULL;

-- Step 6: Drop duplicate columns from cleaners table
ALTER TABLE cleaners DROP COLUMN IF EXISTS full_name;
ALTER TABLE cleaners DROP COLUMN IF EXISTS email;
ALTER TABLE cleaners DROP COLUMN IF EXISTS phone;

-- Step 7: Add index for cleaner->user lookups (should already exist, but ensure it)
CREATE INDEX IF NOT EXISTS idx_cleaners_user_id ON cleaners(user_id);

-- Step 8: Add unique constraint - one cleaner record per user
ALTER TABLE cleaners ADD CONSTRAINT cleaners_user_id_unique UNIQUE (user_id);
