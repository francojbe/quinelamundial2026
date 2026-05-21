import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nncjrgfeoynznmmpcuni.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uY2pyZ2Zlb3luem5tbXBjdW5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NjQ4NTksImV4cCI6MjA4NDI0MDg1OX0.PqwQJtwL_pk7k58hUm2hiDRWo_9Z45UUwknsp64u9Dw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
