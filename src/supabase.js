// src/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cwribodiexjmnialapgr.supabase.co'
const supabaseKey = 'sb_publishable_7p1-mblJiDxMfQGlrnaH7w_9-J8jIre'

export const supabase = createClient(supabaseUrl, supabaseKey)
