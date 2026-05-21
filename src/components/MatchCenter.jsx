import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Loader2, Check, AlertCircle, Calendar, MapPin, Trophy } from 'lucide-react';

const TEAM_ISO_CODES = {
  'México': 'mx', 'Estados Unidos': 'us', 'Canadá': 'ca', 'Argentina': 'ar', 'Brasil': 'br',
  'Francia': 'fr', 'Inglaterra': 'gb-eng', 'España': 'es', 'Alemania': 'de', 'Países Bajos': 'nl',
  'Portugal': 'pt', 'Uruguay': 'uy', 'Croacia': 'hr', 'Senegal': 'sn', 'Japón': 'jp',
  'Sudáfrica': 'za', 'República de Corea': 'kr', 'Chequia': 'cz', 'Bosnia y Herzegovina': 'ba',
  'Catar': 'qa', 'Suiza': 'ch', 'Haití': 'ht', 'Escocia': 'gb-sct', 'Marruecos': 'ma',
  'Paraguay': 'py', 'Australia': 'au', 'Turquía': 'tr', 'Costa de Marfil': 'ci', 'Ecuador': 'ec',
  'Curasao': 'cw', 'Suecia': 'se', 'Túnez': 'tn', 'RI de Irán': 'ir', 'Nueva Zelanda': 'nz',
  'Bélgica': 'be', 'Egipto': 'eg', 'Arabia Saudí': 'sa', 'Cabo Verde': 'cv', 'Irak': 'iq',
  'Noruega': 'no', 'Argelia': 'dz', 'Austria': 'at', 'Jordania': 'jo', 'RD Congo': 'cd',
  'Uzbekistán': 'uz', 'Colombia': 'co', 'Ghana': 'gh', 'Panamá': 'pa'
};

const getTeamLabel = (team) => {
  const iso = TEAM_ISO_CODES[team];
  if (iso) {
    return `${team}`;
  }
  return team;
};

const renderFlagElement = (team, size = 160) => {
  const iso = TEAM_ISO_CODES[team];
  if (iso) {
    return (
      <img 
        src={`https://flagcdn.com/w${size}/${iso}.png`} 
        alt={team} 
        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        loading="lazy"
      />
    );
  }
  // Safe fallbacks for placeholder text or generic placeholders
  if (team.startsWith('Ganador')) {
    return <span style={{ fontSize: '1.2rem' }}>🏆</span>;
  }
  return <span style={{ fontSize: '1.2rem' }}>⚽</span>;
};

export default function MatchCenter({ user }) {
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Fase de Grupos');
  
  // Track local input values to avoid continuous database calls on every keystroke
  const [localScores, setLocalScores] = useState({}); // { [matchId]: { home: string, away: string } }
  const [savingStates, setSavingStates] = useState({}); // { [matchId]: 'saving' | 'saved' | 'error' | null }
  
  // Keep track of timeouts for debouncing saving per match
  const saveTimeouts = useRef({});

  useEffect(() => {
    fetchMatchesAndPredictions();

    // Clean up timeouts on unmount
    return () => {
      Object.values(saveTimeouts.current).forEach(clearTimeout);
    };
  }, [user]);

  const fetchMatchesAndPredictions = async () => {
    setLoading(true);
    try {
      // 1. Fetch matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('wc2026_matches')
        .select('*')
        .order('match_number', { ascending: true });

      if (matchesError) throw matchesError;

      // 2. Fetch predictions
      const { data: predictionsData, error: predictionsError } = await supabase
        .from('wc2026_predictions')
        .select('*')
        .eq('user_id', user.id);

      if (predictionsError) throw predictionsError;

      // Map predictions by match_id for rapid O(1) lookup
      const predsMap = {};
      const localInputMap = {};
      predictionsData.forEach(p => {
        predsMap[p.match_id] = p;
        localInputMap[p.match_id] = {
          home: p.predicted_home_score.toString(),
          away: p.predicted_away_score.toString()
        };
      });

      setMatches(matchesData);
      setPredictions(predsMap);
      setLocalScores(localInputMap);
    } catch (error) {
      console.error('Error cargando partidos/predicciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (matchId, side, value) => {
    // Only accept positive digits or empty string
    if (value !== '' && !/^\d+$/.test(value)) return;
    
    // Check if match has already started (block updates)
    const match = matches.find(m => m.id === matchId);
    if (!match || new Date() >= new Date(match.date_time)) return;

    const newLocal = {
      ...localScores[matchId],
      [side]: value
    };

    setLocalScores(prev => ({
      ...prev,
      [matchId]: newLocal
    }));

    // Trigger auto-save only if both inputs have valid values
    if (newLocal.home !== '' && newLocal.away !== '') {
      triggerAutoUpsert(matchId, parseInt(newLocal.home), parseInt(newLocal.away));
    }
  };

  const triggerAutoUpsert = (matchId, homeScore, awayScore) => {
    // Clear existing timeout for this match
    if (saveTimeouts.current[matchId]) {
      clearTimeout(saveTimeouts.current[matchId]);
    }

    setSavingStates(prev => ({ ...prev, [matchId]: 'saving' }));

    // Debounce actual Supabase writing by 600ms
    saveTimeouts.current[matchId] = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('wc2026_predictions')
          .upsert({
            user_id: user.id,
            match_id: matchId,
            predicted_home_score: homeScore,
            predicted_away_score: awayScore,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,match_id'
          })
          .select();

        if (error) throw error;

        // Update prediction list state
        if (data && data[0]) {
          setPredictions(prev => ({
            ...prev,
            [matchId]: data[0]
          }));
        }

        setSavingStates(prev => ({ ...prev, [matchId]: 'saved' }));
        // Clear saved indicator after 2 seconds
        setTimeout(() => {
          setSavingStates(prev => (prev[matchId] === 'saved' ? { ...prev, [matchId]: null } : prev));
        }, 2000);
      } catch (err) {
        console.error('Error al guardar pronóstico:', err);
        setSavingStates(prev => ({ ...prev, [matchId]: 'error' }));
      }
    }, 600);
  };

  // Helper to check if a match stage matches our active tab
  const belongsToTab = (stage, tab) => {
    if (tab === 'Fase de Grupos') return stage === 'Fase de Grupos';
    if (tab === 'Dieciseisavos') return stage === 'Dieciseisavos de Final';
    if (tab === 'Octavos') return stage === 'Octavos de Final';
    if (tab === 'Cuartos') return stage === 'Cuartos de Final';
    if (tab === 'Fase Final') {
      return stage === 'Semifinal' || stage === 'Final de Bronce' || stage === 'Gran Final';
    }
    return false;
  };

  const getFilteredMatches = () => {
    return matches.filter(match => {
      const matchStageMatches = belongsToTab(match.stage, activeTab);
      
      const homeSearch = match.home_team.toLowerCase().includes(searchTerm.toLowerCase());
      const awaySearch = match.away_team.toLowerCase().includes(searchTerm.toLowerCase());
      const venueSearch = match.venue.toLowerCase().includes(searchTerm.toLowerCase());
      const citySearch = match.city.toLowerCase().includes(searchTerm.toLowerCase());
      const searchMatches = homeSearch || awaySearch || venueSearch || citySearch || searchTerm === '';

      return matchStageMatches && searchMatches;
    });
  };

  // Progress metrics
  const totalMatchesCount = matches.length;
  const predictedCount = Object.keys(predictions).filter(matchId => {
    const p = predictions[matchId];
    return p && p.predicted_home_score !== null && p.predicted_away_score !== null;
  }).length;
  const completionPercentage = totalMatchesCount > 0 ? Math.round((predictedCount / totalMatchesCount) * 100) : 0;

  // Format date helper
  const formatMatchTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--accent-green)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Cargando calendario mundialista...</p>
      </div>
    );
  }

  const renderFavoriteTeamBanner = () => {
    const favTeam = user?.favorite_team || 'México';
    const iso = TEAM_ISO_CODES[favTeam];
    if (!iso) return null;

    const flagUrl = `https://flagcdn.com/w640/${iso}.png`;

    return (
      <div className="fav-team-banner">
        {/* Flag background overlay for depth */}
        <div 
          className="fav-team-banner-overlay"
          style={{ backgroundImage: `url(${flagUrl})` }}
        />

        {/* Circular Flag Emblem */}
        <div className="fav-team-flag-badge">
          <img 
            src={`https://flagcdn.com/w160/${iso}.png`} 
            alt={favTeam} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        </div>

        {/* Banner content */}
        <div className="fav-team-info">
          <span 
            style={{ 
              fontSize: '0.75rem', 
              fontWeight: '700', 
              color: 'var(--accent-gold)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em',
              display: 'block',
              marginBottom: '4px'
            }}
          >
            Mi Selección Favorita
          </span>
          <h2 
            style={{ 
              fontSize: '1.4rem', 
              fontWeight: '800', 
              fontFamily: 'var(--font-title)', 
              color: 'var(--text-primary)',
              margin: 0
            }}
          >
            ¡Vamos {favTeam}!
          </h2>
          <p 
            style={{ 
              fontSize: '0.82rem', 
              color: 'var(--text-secondary)',
              marginTop: '4px',
              maxWidth: '80%',
              lineHeight: '1.4'
            }}
          >
            Has elegido a {favTeam} como tu equipo preferido. ¡Alienta a tu selección y acierta sus marcadores para liderar el ranking!
          </p>
        </div>
      </div>
    );
  };

  const filteredMatches = getFilteredMatches();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Centro de Partidos</h1>
        <p className="page-subtitle">Registra tus pronósticos antes del pitazo inicial. Se guardan automáticamente.</p>
      </div>

      {/* Favorite Team Banner */}
      {renderFavoriteTeamBanner()}

      {/* Progress Card */}
      <div className="glass-card progress-card">
        <div className="progress-header">
          <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={18} style={{ color: 'var(--accent-gold)' }} />
            Tu Progreso de Quinela
          </span>
          <span style={{ color: 'var(--accent-green)' }}>
            {predictedCount} de {totalMatchesCount} Partidos ({completionPercentage}%)
          </span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${completionPercentage}%` }} />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
        {/* Phase Pill Tabs */}
        <div className="filter-tabs">
          {['Fase de Grupos', 'Dieciseisavos', 'Octavos', 'Cuartos', 'Fase Final'].map(tab => (
            <button
              key={tab}
              className={`filter-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'Fase Final' ? '🔥 Semis & Final' : tab}
            </button>
          ))}
        </div>

        {/* Search Input Box */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '480px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por equipo, estadio o ciudad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '48px' }}
          />
        </div>
      </div>

      {/* Matches Grid List */}
      {filteredMatches.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No se encontraron partidos para tu búsqueda o fase seleccionada.
        </div>
      ) : (
        <div className="matches-grid">
          {filteredMatches.map(match => {
            const pred = predictions[match.id];
            const localHome = localScores[match.id]?.home ?? '';
            const localAway = localScores[match.id]?.away ?? '';
            
            const matchTime = new Date(match.date_time);
            const hasStarted = new Date() >= matchTime;
            const isFinished = match.status === 'finished';

            const savingStatus = savingStates[match.id];

            return (
              <div key={match.id} className="glass-card match-card" style={{
                borderColor: hasStarted ? 'rgba(255,255,255,0.03)' : (savingStatus === 'saved' ? 'var(--border-glass-glow)' : 'var(--border-glass)'),
                opacity: hasStarted ? 0.9 : 1
              }}>
                {/* Match Header */}
                <div className="match-header">
                  <span className="match-stage">
                    No. {match.match_number} | {match.stage} {match.group_name ? `• Grupo ${match.group_name}` : ''}
                  </span>
                  <span className="match-venue" title={`${match.venue}, ${match.city}`}>
                    <MapPin size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                    {match.city}
                  </span>
                </div>

                {/* Match Body */}
                <div className="match-body">
                  {/* Home Team */}
                  <div className="team-container">
                    <div className="team-flag-emblem" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {renderFlagElement(match.home_team)}
                    </div>
                    <span className="team-name">{match.home_team}</span>
                  </div>

                  {/* Score Prediction Inputs / Live Score */}
                  <div className="score-inputs-container">
                    <input
                      type="text"
                      className="score-input"
                      maxLength="2"
                      inputMode="numeric"
                      value={localHome}
                      onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                      disabled={hasStarted}
                      placeholder={hasStarted ? "-" : "?"}
                    />
                    <span className="score-separator">:</span>
                    <input
                      type="text"
                      className="score-input"
                      maxLength="2"
                      inputMode="numeric"
                      value={localAway}
                      onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                      disabled={hasStarted}
                      placeholder={hasStarted ? "-" : "?"}
                    />
                  </div>

                  {/* Away Team */}
                  <div className="team-container">
                    <div className="team-flag-emblem" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {renderFlagElement(match.away_team)}
                    </div>
                    <span className="team-name">{match.away_team}</span>
                  </div>
                </div>

                {/* Match Footer */}
                <div className="match-footer">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                    {formatMatchTime(match.date_time)}
                  </span>

                  {/* Save Status Indicators */}
                  {!hasStarted && (
                    <div style={{ height: '20px', display: 'flex', alignItems: 'center' }}>
                      {savingStatus === 'saving' && (
                        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                          <Loader2 size={12} className="animate-spin" style={{ color: 'var(--accent-green)' }} /> Guardando...
                        </span>
                      )}
                      {savingStatus === 'saved' && (
                        <span style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                          <Check size={12} /> ¡Guardado!
                        </span>
                      )}
                      {savingStatus === 'error' && (
                        <span style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                          <AlertCircle size={12} /> Error
                        </span>
                      )}
                      {!savingStatus && localHome !== '' && localAway !== '' && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Pronóstico guardado</span>
                      )}
                      {!savingStatus && (localHome === '' || localAway === '') && (
                        <span style={{ color: 'var(--accent-gold)', fontSize: '0.72rem', fontWeight: '500' }}>Pronóstico incompleto</span>
                      )}
                    </div>
                  )}

                  {/* Points Earned badges if Started/Finished */}
                  {hasStarted && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isFinished ? (
                        <>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '500' }}>
                            Resultado Real: <b>{match.home_score} - {match.away_score}</b>
                          </span>
                          {pred && pred.points_earned !== null && (
                            <span className={`points-earned-badge ${
                              pred.points_earned === 3 ? 'perfect' : (pred.points_earned === 1 ? 'correct' : 'zero')
                            }`}>
                              {pred.points_earned === 3 ? '🏆 +3 pts' : (pred.points_earned === 1 ? '✅ +1 pt' : '❌ 0 pts')}
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                          ⏱️ Partido en juego / cerrado
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
