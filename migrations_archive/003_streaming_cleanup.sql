ALTER TABLE galleries ADD COLUMN processing_bytes bigint NOT NULL DEFAULT 0 CHECK(processing_bytes>=0);
ALTER TABLE jobs DROP CONSTRAINT jobs_kind_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_kind_check CHECK(kind IN ('gallery','cleanup','asset-cleanup','object-cleanup','telegram'));
