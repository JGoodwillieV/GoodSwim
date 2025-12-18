-- Add link and file attachment support to announcements table

-- Add columns for link
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS link_url TEXT,
ADD COLUMN IF NOT EXISTS link_title TEXT;

-- Add columns for file attachment
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_filename TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT; -- mime type or file extension

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_announcements_has_link ON announcements(link_url) WHERE link_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_has_attachment ON announcements(attachment_url) WHERE attachment_url IS NOT NULL;

-- Create storage bucket for announcement attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-attachments', 'announcement-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for announcement attachments
CREATE POLICY "Anyone can view announcement attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcement-attachments');

CREATE POLICY "Authenticated users can upload announcement attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'announcement-attachments' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own announcement attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'announcement-attachments'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own announcement attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'announcement-attachments'
  AND auth.role() = 'authenticated'
);

