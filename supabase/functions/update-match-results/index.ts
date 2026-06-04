import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Team name dictionary mapping English API names to our Spanish DB names
const TEAM_NAME_MAP: Record<string, string> = {
  "Mexico": "México",
  "USA": "Estados Unidos",
  "Canada": "Canadá",
  "Argentina": "Argentina",
  "Brazil": "Brasil",
  "France": "Francia",
  "England": "Inglaterra",
  "Spain": "España",
  "Germany": "Alemania",
  "Netherlands": "Países Bajos",
  "Portugal": "Portugal",
  "Uruguay": "Uruguay",
  "Croatia": "Croacia",
  "Senegal": "Senegal",
  "Japan": "Japón",
  "South Africa": "Sudáfrica",
  "South Korea": "República de Corea",
  "Czech Republic": "Chequia",
  "Bosnia": "Bosnia y Herzegovina",
  "Qatar": "Catar",
  "Switzerland": "Suiza",
  "Haiti": "Haití",
  "Scotland": "Escocia",
  "Morocco": "Marruecos",
  "Paraguay": "Paraguay",
  "Australia": "Australia",
  "Turkey": "Turquía",
  "Ivory Coast": "Costa de Marfil",
  "Ecuador": "Ecuador",
  "Curacao": "Curasao",
  "Sweden": "Suecia",
  "Tunisia": "Túnez",
  "Iran": "RI de Irán",
  "New Zealand": "Nueva Zelanda",
  "Belgium": "Bélgica",
  "Egypt": "Egipto",
  "Saudi Arabia": "Arabia Saudí",
  "Cape Verde": "Cabo Verde",
  "Iraq": "Irak",
  "Norway": "Noruega",
  "Algeria": "Argelia",
  "Austria": "Austria",
  "Jordan": "Jordania",
  "DR Congo": "RD Congo",
  "Uzbekistan": "Uzbekistán",
  "Colombia": "Colombia",
  "Ghana": "Ghana",
  "Panama": "Panamá"
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Check for API-Football Key in environment secrets
    const apiFootballKey = Deno.env.get("API_FOOTBALL_KEY");
    if (!apiFootballKey) {
      throw new Error("Missing API_FOOTBALL_KEY in environment variables.");
    }

    // 2. Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Fetch today's fixtures from API-Football
    // League 1 = World Cup. Season 2026.
    const today = new Date().toISOString().split('T')[0];
    const apiUrl = `https://v3.football.api-sports.io/fixtures?league=1&season=2026&date=${today}`;
    
    const apiResponse = await fetch(apiUrl, {
      headers: {
        "x-rapidapi-key": apiFootballKey,
        "x-rapidapi-host": "v3.football.api-sports.io"
      }
    });

    const data = await apiResponse.json();

    if (!data.response || data.response.length === 0) {
      return new Response(JSON.stringify({ message: "No matches found today." }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 200 
      });
    }

    const fixtures = data.response;
    let updatedCount = 0;

    // 4. Process each fixture
    for (const fixture of fixtures) {
      const matchStatus = fixture.fixture.status.short;
      
      // Match Finished statuses (FT = Full Time, AET = After Extra Time, PEN = Penalties)
      if (['FT', 'AET', 'PEN'].includes(matchStatus)) {
        const homeApiName = fixture.teams.home.name;
        const awayApiName = fixture.teams.away.name;
        const homeScore = fixture.goals.home;
        const awayScore = fixture.goals.away;
        const fixtureId = fixture.fixture.id;

        // Map English names to Spanish names in our DB
        const homeDbName = TEAM_NAME_MAP[homeApiName] || homeApiName;
        const awayDbName = TEAM_NAME_MAP[awayApiName] || awayApiName;

        // Find the match in our DB by teams or fixture ID
        const { data: dbMatch, error: findError } = await supabase
          .from("wc2026_matches")
          .select("id, status")
          .or(`api_fixture_id.eq.${fixtureId},and(home_team.eq."${homeDbName}",away_team.eq."${awayDbName}")`)
          .single();

        if (findError || !dbMatch) {
          console.warn(`Match not found in DB: ${homeDbName} vs ${awayDbName}`);
          continue;
        }

        // 5. Update only if not already finished to avoid redundant trigger executions
        if (dbMatch.status !== "finished") {
          const { error: updateError } = await supabase
            .from("wc2026_matches")
            .update({
              home_score: homeScore,
              away_score: awayScore,
              status: "finished",
              api_fixture_id: fixtureId // Save the ID for future reference
            })
            .eq("id", dbMatch.id);

          if (updateError) {
            console.error(`Error updating match ${dbMatch.id}:`, updateError);
          } else {
            console.log(`Updated match ${dbMatch.id}: ${homeDbName} ${homeScore} - ${awayScore} ${awayDbName}`);
            updatedCount++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Match results updated successfully.",
        processedMatches: fixtures.length,
        updatedMatches: updatedCount
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
