-- Create email_captures table for email capture banner (FIX 5)
CREATE TABLE email_captures (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'landing_deadline_calendar',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_email_captures_email ON email_captures(email);
CREATE INDEX idx_email_captures_created_at ON email_captures(created_at);

-- Allow anonymous users (guests) to insert emails
GRANT INSERT ON email_captures TO anon;
