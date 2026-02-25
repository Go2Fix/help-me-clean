-- Add rating category columns (nullable for backward compatibility with existing reviews)
ALTER TABLE reviews ADD COLUMN rating_punctuality INTEGER CHECK (rating_punctuality BETWEEN 1 AND 5);
ALTER TABLE reviews ADD COLUMN rating_quality INTEGER CHECK (rating_quality BETWEEN 1 AND 5);
ALTER TABLE reviews ADD COLUMN rating_communication INTEGER CHECK (rating_communication BETWEEN 1 AND 5);
ALTER TABLE reviews ADD COLUMN rating_value INTEGER CHECK (rating_value BETWEEN 1 AND 5);

-- Add review status for moderation (default 'published' for existing reviews)
ALTER TABLE reviews ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'published';

-- Add review photos support
CREATE TABLE review_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_review_photos_review_id ON review_photos(review_id);
