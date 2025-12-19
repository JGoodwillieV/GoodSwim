// src/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ozznaspwqcfxulgqovro.supabase.co'
const supabaseKey = 'sb_publishable_FyV_MhkMyID0XOedUURkvw_ATcCQZHA'

export const supabase = createClient(supabaseUrl, supabaseKey)
