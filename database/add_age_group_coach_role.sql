-- Add "age_group_coach" to the staff_members role check constraint
-- This allows the role to be used when creating/updating staff members

-- Drop the existing constraint
ALTER TABLE staff_members 
DROP CONSTRAINT IF EXISTS staff_members_role_check;

-- Add the updated constraint with age_group_coach
ALTER TABLE staff_members 
ADD CONSTRAINT staff_members_role_check 
CHECK (role IN ('head_coach', 'age_group_coach', 'assistant', 'volunteer', 'admin'));

