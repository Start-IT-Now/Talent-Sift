// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lhrzsycchfcgbhaikzpt.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocnpzeWNjaGZjZ2JoYWlrenB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMTk4ODYsImV4cCI6MjA3Nzg5NTg4Nn0.9-u5_w69skI1B3BBSH5XfTVjMZ1mrw_sPZtxeUnKUZM'

export const supabase = createClient(supabaseUrl, supabaseKey)
