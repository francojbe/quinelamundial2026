import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { JerseySVG } from './Auth';
import { Trophy, Award, Target, X, Calendar, Eye, Lock, MapPin, Loader2 } from 'lucide-react';

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

const renderModalFlag = (team) => {
  const iso = TEAM_ISO_CODES[team];
  if (iso) {
    return (
      <div style={{ width: '22px', height: '22px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border-glass)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <img 
          src={`https://flagcdn.com/w80/${iso}.png`} 
          alt={team} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      </div>
    );
  }
  if (team.startsWith('Ganador')) {
    return <span style={{ fontSize: '0.9rem' }}>🏆</span>;
  }
  return <span style={{ fontSize: '0.9rem' }}>⚽</span>;
};

export default function Leaderboard({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Details Modal state
  const [userPredictions, setUserPredictions] = useState({});
  const [allMatches, setAllMatches] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wc2026_profiles')
        .select('*')
        .order('total_points', { ascending: false })
        .order('perfect_hits', { ascending: false })
        .order('correct_results', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error cargando leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (profile) => {
    setSelectedUser(profile);
    setLoadingDetails(true);
    setUserPredictions({});

    try {
      // 1. Fetch matches to build the baseline list
      const { data: matches, error: matchesError } = await supabase
        .from('wc2026_matches')
        .select('*')
        .order('match_number', { ascending: true });

      if (matchesError) throw matchesError;
      setAllMatches(matches || []);

      // 2. Fetch the predictions of this specific clicked user.
      // Note: Supabase RLS will filter out unstarted match forecasts automatically!
      const { data: predictions, error: predsError } = await supabase
        .from('wc2026_predictions')
        .select('*')
        .eq('user_id', profile.id);

      if (predsError) throw predsError;

      const predsMap = {};
      (predictions || []).forEach(p => {
        predsMap[p.match_id] = p;
      });

      setUserPredictions(predsMap);
    } catch (err) {
      console.error('Error al cargar predicciones del usuario:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getRankBadge = (index) => {
    if (index === 0) return <span className="rank-medal" title="1er Lugar">🥇</span>;
    if (index === 1) return <span className="rank-medal" title="2do Lugar">🥈</span>;
    if (index === 2) return <span className="rank-medal" title="3er Lugar">🥉</span>;
    return `${index + 1}.`;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tabla de Posiciones</h1>
        <p className="page-subtitle">Mira quién va liderando el tablero de la Copa del Mundo. Haz clic en un jugador para chismosear sus pronósticos.</p>
      </div>

      {loading ? (
        <div style={{ minHeight: '50vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
          <Loader2 className="animate-spin" size={40} style={{ color: 'var(--accent-green)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Cargando ranking global...</p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '8px' }}>
          <div className="leaderboard-wrapper">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th className="leaderboard-th sticky" style={{ width: '48px', textAlign: 'center' }}>Pos</th>
                  <th className="leaderboard-th sticky">Competidor</th>
                  <th className="leaderboard-th sticky hide-mobile" style={{ textAlign: 'center' }}>🎯 Exactos</th>
                  <th className="leaderboard-th sticky hide-mobile" style={{ textAlign: 'center' }}>⚽ Resultados</th>
                  <th className="leaderboard-th sticky" style={{ textAlign: 'center', minWidth: '80px' }}>Puntos</th>
                </tr>
              </thead>
              <tbody>
                {users.map((profile, index) => {
                  const isMe = currentUser && currentUser.id === profile.id;
                  const avatar = profile.avatar_config || { color: '#22c55e', jersey: 10 };
                  
                  let rankClass = '';
                  if (index === 0) rankClass = 'rank-gold';
                  else if (index === 1) rankClass = 'rank-silver';
                  else if (index === 2) rankClass = 'rank-bronze';

                  return (
                    <tr 
                      key={profile.id} 
                      className={`leaderboard-row ${rankClass}`}
                      onClick={() => handleRowClick(profile)}
                      style={{
                        backgroundColor: isMe ? 'var(--accent-green-glow)' : 'transparent',
                      }}
                    >
                      <td className="leaderboard-td">
                        {getRankBadge(index)}
                      </td>
                      <td className="leaderboard-td">
                        <div className="leaderboard-user-cell">
                          <div className="leaderboard-jersey">
                            <JerseySVG color={avatar.color} number={avatar.jersey} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="leaderboard-user-name" style={{ fontWeight: isMe ? '700' : '500' }}>
                              {profile.username} {isMe && <span style={{ color: 'var(--accent-gold)', fontSize: '0.7rem' }}>(Tú)</span>}
                            </div>
                            <div className="leaderboard-user-fav">
                              Le va a: {profile.favorite_team}
                            </div>
                            {/* Mobile-only mini stats row */}
                            <div className="leaderboard-mini-stats">
                              <span>🎯 {profile.perfect_hits}</span>
                              <span>⚽ {profile.correct_results}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="leaderboard-td hide-mobile" style={{ textAlign: 'center', color: 'var(--accent-gold)', fontWeight: '600' }}>
                        {profile.perfect_hits}
                      </td>
                      <td className="leaderboard-td hide-mobile" style={{ textAlign: 'center', color: 'var(--text-primary)' }}>
                        {profile.correct_results}
                      </td>
                      <td className="leaderboard-td" style={{ textAlign: 'center' }}>
                        {profile.total_points} pts
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Details / Predictions Modal Overlay */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="glass-card modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Mobile drag handle */}
            <div style={{ width: '40px', height: '4px', background: 'var(--border-glass)', borderRadius: '2px', margin: '0 auto 20px', display: 'block' }} />

            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                <div style={{ width: '52px', height: '52px', flexShrink: 0 }}>
                  <JerseySVG 
                    color={selectedUser.avatar_config?.color || '#22c55e'} 
                    number={selectedUser.avatar_config?.jersey || 10} 
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', fontFamily: 'var(--font-title)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Pronósticos de {selectedUser.username}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: '1.4' }}>
                    {selectedUser.favorite_team} &nbsp;&bull;&nbsp; <b style={{ color: 'var(--accent-green)' }}>{selectedUser.total_points} pts</b> &nbsp;&bull;&nbsp; 🎯 {selectedUser.perfect_hits} exactos
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '50%', width: '36px', height: '36px', minWidth: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Predictions List */}
            {loadingDetails ? (
              <div style={{ height: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
                <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-green)' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Cargando pronósticos de competidor...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '55vh', overflowY: 'auto', paddingRight: '4px' }}>
                {allMatches.map(match => {
                  const pred = userPredictions[match.id];
                  const matchTime = new Date(match.date_time);
                  const hasStarted = new Date() >= matchTime;
                  const isFinished = match.status === 'finished';

                  // Obscured flag: If game hasn't started and it's NOT the currentUser's profile, hide it.
                  const isOwnProfile = currentUser && currentUser.id === selectedUser.id;
                  const isObscured = !hasStarted && !isOwnProfile;

                  return (
                    <div 
                      key={match.id} 
                      style={{ 
                        background: 'var(--bg-secondary)', 
                        border: '1px solid var(--border-glass)', 
                        borderRadius: '12px', 
                        padding: '12px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      {/* Sub-header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                        <span>N° {match.match_number} • {match.stage}</span>
                        <span>{match.city}</span>
                      </div>

                      {/* Main Teams Match Line */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ width: '40%', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {renderModalFlag(match.home_team)}
                          <span style={{ fontSize: '0.88rem', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {match.home_team}
                          </span>
                        </div>

                        {/* Forecast box */}
                        <div style={{ 
                          width: '20%', 
                          textAlign: 'center', 
                          fontWeight: '700', 
                          fontSize: '1rem',
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: '8px',
                          padding: '6px',
                          border: '1px solid rgba(255,255,255,0.04)',
                          color: isObscured ? 'var(--text-muted)' : 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}>
                          {isObscured ? (
                            <span title="Bloqueado hasta el pitazo inicial" style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem', color: 'var(--accent-gold)' }}>
                              <Lock size={10} /> Oculto
                            </span>
                          ) : (
                            pred ? (
                              <span>{pred.predicted_home_score} - {pred.predicted_away_score}</span>
                            ) : (
                              <span style={{ fontWeight: '400', color: 'var(--text-muted)', fontSize: '0.78rem' }}>Sin pronóstico</span>
                            )
                          )}
                        </div>

                        <div style={{ width: '40%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', textAlign: 'right' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {match.away_team}
                          </span>
                          {renderModalFlag(match.away_team)}
                        </div>
                      </div>

                      {/* Actual Result & Points badges */}
                      {(isFinished || (pred && pred.points_earned !== null)) && (
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          borderTop: '1px solid rgba(255,255,255,0.03)', 
                          paddingTop: '6px',
                          fontSize: '0.75rem'
                        }}>
                          <span style={{ color: 'var(--text-muted)' }}>
                            Resultado Real: <b style={{ color: 'var(--text-secondary)' }}>{match.home_score} - {match.away_score}</b>
                          </span>

                          {pred && pred.points_earned !== null && (
                            <span className={`points-earned-badge ${
                              pred.points_earned === 3 ? 'perfect' : (pred.points_earned === 1 ? 'correct' : 'zero')
                            }`} style={{ padding: '3px 8px', fontSize: '0.72rem' }}>
                              {pred.points_earned === 3 ? '🏆 +3 pts' : (pred.points_earned === 1 ? '✅ +1 pt' : '❌ 0 pts')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
