-- Create email_captures table for email capture banner (FIX 5)
CREATE TABLE email_captures (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  source TEXT DEFAULT 'landing_page' -- where the email was captured from
);

-- Index for fast lookups
CREATE INDEX idx_email_captures_email ON email_captures(email);
CREATE INDEX idx_email_captures_created_at ON email_captures(created_at);
