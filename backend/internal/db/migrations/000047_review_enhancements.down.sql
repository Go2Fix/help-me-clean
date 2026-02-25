DROP TABLE IF EXISTS review_photos;
ALTER TABLE reviews DROP COLUMN IF EXISTS status;
ALTER TABLE reviews DROP COLUMN IF EXISTS rating_value;
ALTER TABLE reviews DROP COLUMN IF EXISTS rating_communication;
ALTER TABLE reviews DROP COLUMN IF EXISTS rating_quality;
ALTER TABLE reviews DROP COLUMN IF EXISTS rating_punctuality;
