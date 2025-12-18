-- Add support for multiple custom links in calendar events
-- Replaces single external_link with array of link objects

-- Add new column for multiple links (stored as JSONB array)
ALTER TABLE team_events 
ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]';

-- Migrate existing external_link data to new links format
UPDATE team_events 
SET links = jsonb_build_array(
  jsonb_build_object(
    'title', 'More Information',
    'url', external_link
  )
)
WHERE external_link IS NOT NULL AND external_link != '';

-- Optional: Keep external_link column for backwards compatibility
-- Or drop it if you want to fully migrate:
-- ALTER TABLE team_events DROP COLUMN external_link;

-- Example of links format:
-- [
--   {"title": "RSVP", "url": "https://signupgenius.com/..."},
--   {"title": "Chaperone Sign Up", "url": "https://forms.google.com/..."},
--   {"title": "Directions", "url": "https://maps.google.com/..."}
-- ]

