import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nncjrgfeoynznmmpcuni.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uY2pyZ2Zlb3luem5tbXBjdW5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NjQ4NTksImV4cCI6MjA4NDI0MDg1OX0.PqwQJtwL_pk7k58hUm2hiDRWo_9Z45UUwknsp64u9Dw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    const { data, error } = await supabase.auth.signUp({
        email: 'admin@quinela2026.com',
        password: 'AdminPassword2026!'
    });
    if (error) { 
        console.error('Auth error:', error); 
        return; 
    }
    
    const { error: profileError } = await supabase.from('wc2026_profiles').insert({
        id: data.user.id,
        username: 'AdminSystem',
        favorite_team: 'México',
        avatar_config: { color: '#0d9488', jersey: 99 }
    });
    
    if (profileError) { 
        console.error('Profile error:', profileError); 
    } else {
        console.log('USER_ID=' + data.user.id);
    }
}
main();
