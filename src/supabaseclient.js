import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'sb_publishable_WM8mI1HT1YjSXkwoeKJWIw_J54Swunu'
const supabaseAnonKey = 'sb_publishable_WM8mI1HT1YjSXkwoeKJWIw_J54Swunu'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
