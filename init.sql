-- TransitOps Database Initialization
-- Run on first container startup

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Indexes for common queries (created after tables exist via migrations)
-- This file runs before migrations, so tables don't exist yet

-- Set timezone
SET timezone = 'UTC';