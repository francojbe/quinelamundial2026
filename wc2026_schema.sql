-- 1. Create wc2026_profiles table
CREATE TABLE IF NOT EXISTS public.wc2026_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    avatar_config JSONB DEFAULT '{"color": "#10b981", "jersey": 10, "face": 1}'::jsonb,
    favorite_team TEXT NOT NULL,
    total_points INTEGER DEFAULT 0,
    perfect_hits INTEGER DEFAULT 0,
    correct_results INTEGER DEFAULT 0,
    rank_trend TEXT DEFAULT '=',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE public.wc2026_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for wc2026_profiles
DROP POLICY IF EXISTS "Permitir lectura de perfiles a todos" ON public.wc2026_profiles;
CREATE POLICY "Permitir lectura de perfiles a todos" ON public.wc2026_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir crear propio perfil" ON public.wc2026_profiles;
CREATE POLICY "Permitir crear propio perfil" ON public.wc2026_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Permitir actualizar propio perfil" ON public.wc2026_profiles;
CREATE POLICY "Permitir actualizar propio perfil" ON public.wc2026_profiles
    FOR UPDATE USING (auth.uid() = id);


-- 2. Create wc2026_matches table
CREATE TABLE IF NOT EXISTS public.wc2026_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_number INTEGER UNIQUE NOT NULL,
    stage TEXT NOT NULL,
    group_name TEXT,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    venue TEXT NOT NULL,
    city TEXT NOT NULL,
    home_score INTEGER,
    away_score INTEGER,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for matches
ALTER TABLE public.wc2026_matches ENABLE ROW LEVEL SECURITY;

-- Create policies for wc2026_matches
DROP POLICY IF EXISTS "Permitir lectura de partidos a todos" ON public.wc2026_matches;
CREATE POLICY "Permitir lectura de partidos a todos" ON public.wc2026_matches
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insertar/modificar partidos solo a administradores" ON public.wc2026_matches;
CREATE POLICY "Permitir insertar/modificar partidos solo a administradores" ON public.wc2026_matches
    FOR ALL USING (true); -- We will allow updates from client for testing purposes, but in production we can restrict.


-- 3. Create wc2026_predictions table
CREATE TABLE IF NOT EXISTS public.wc2026_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.wc2026_profiles(id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES public.wc2026_matches(id) ON DELETE CASCADE,
    predicted_home_score INTEGER NOT NULL,
    predicted_away_score INTEGER NOT NULL,
    points_earned INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_match UNIQUE (user_id, match_id)
);

-- Enable RLS for predictions
ALTER TABLE public.wc2026_predictions ENABLE ROW LEVEL SECURITY;

-- Create policies for wc2026_predictions
DROP POLICY IF EXISTS "Permitir lectura de predicciones propias" ON public.wc2026_predictions;
CREATE POLICY "Permitir lectura de predicciones propias" ON public.wc2026_predictions
    FOR SELECT USING (auth.uid() = user_id);

-- Also allow reading other users' predictions ONLY IF the match has started/finished!
DROP POLICY IF EXISTS "Permitir lectura de predicciones ajenas una vez empezado el partido" ON public.wc2026_predictions;
CREATE POLICY "Permitir lectura de predicciones ajenas una vez empezado el partido" ON public.wc2026_predictions
    FOR SELECT USING (
        auth.uid() = user_id OR 
        (SELECT date_time FROM public.wc2026_matches WHERE id = match_id) < NOW()
    );

DROP POLICY IF EXISTS "Permitir insertar/actualizar propia prediccion antes de iniciar el partido" ON public.wc2026_predictions;
CREATE POLICY "Permitir insertar/actualizar propia prediccion antes de iniciar el partido" ON public.wc2026_predictions
    FOR ALL USING (
        auth.uid() = user_id AND
        (SELECT date_time FROM public.wc2026_matches WHERE id = match_id) > NOW()
    );


-- 4. Create trigger to recalculate points when a match is updated to 'finished'
CREATE OR REPLACE FUNCTION public.recalculate_prediction_points()
RETURNS TRIGGER AS $$
DECLARE
    pred_record RECORD;
    pts INTEGER;
    is_perfect BOOLEAN;
    is_correct_result BOOLEAN;
BEGIN
    -- Only run when status changes to 'finished' or when score changes while status is 'finished'
    IF (NEW.status = 'finished' AND (OLD.status IS DISTINCT FROM 'finished' OR OLD.home_score IS DISTINCT FROM NEW.home_score OR OLD.away_score IS DISTINCT FROM NEW.away_score)) THEN
        
        -- Loop through all predictions for this match
        FOR pred_record IN 
            SELECT id, user_id, predicted_home_score, predicted_away_score 
            FROM public.wc2026_predictions 
            WHERE match_id = NEW.id
        LOOP
            pts := 0;
            is_perfect := FALSE;
            is_correct_result := FALSE;
            
            -- Perfect Hit: exact score
            IF (pred_record.predicted_home_score = NEW.home_score AND pred_record.predicted_away_score = NEW.away_score) THEN
                pts := 3;
                is_perfect := TRUE;
            -- Correct Result: winner or draw
            ELSIF (
                (NEW.home_score > NEW.away_score AND pred_record.predicted_home_score > pred_record.predicted_away_score) OR
                (NEW.home_score < NEW.away_score AND pred_record.predicted_home_score < pred_record.predicted_away_score) OR
                (NEW.home_score = NEW.away_score AND pred_record.predicted_home_score = pred_record.predicted_away_score)
            ) THEN
                pts := 1;
                is_correct_result := TRUE;
            END IF;
            
            -- Update points in the prediction record
            UPDATE public.wc2026_predictions 
            SET points_earned = pts, updated_at = NOW()
            WHERE id = pred_record.id;
            
        END LOOP;
        
        -- Recalculate total points, perfect hits, and correct results for ALL profiles
        UPDATE public.wc2026_profiles p
        SET 
            total_points = COALESCE((SELECT SUM(points_earned) FROM public.wc2026_predictions WHERE user_id = p.id), 0),
            perfect_hits = COALESCE((SELECT COUNT(*) FROM public.wc2026_predictions WHERE user_id = p.id AND points_earned = 3), 0),
            correct_results = COALESCE((SELECT COUNT(*) FROM public.wc2026_predictions WHERE user_id = p.id AND points_earned = 1), 0),
            updated_at = NOW()
        WHERE p.id IS NOT NULL;
            
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to wc2026_matches
DROP TRIGGER IF EXISTS trigger_recalculate_points ON public.wc2026_matches;
CREATE TRIGGER trigger_recalculate_points
    AFTER UPDATE ON public.wc2026_matches
    FOR EACH ROW
    EXECUTE FUNCTION public.recalculate_prediction_points();
