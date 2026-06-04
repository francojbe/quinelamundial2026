import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { Search, Loader2, Check, ShieldAlert, Award, RefreshCw, Users, ChevronDown } from 'lucide-react';
import { useAlert } from './ui/AlertContext';

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

const ALL_TEAMS = Object.keys(TEAM_ISO_CODES).sort();

// A placeholder is a team name that is NOT a real country name (e.g., "1A", "2B", "Ganador 73")
const isPlaceholder = (teamName) => !TEAM_ISO_CODES[teamName];

// Hardcoded original seed placeholders for every knockout match (by match_number)
// These never change — used to reset back to the blank slot state.
const SEED_PLACEHOLDERS = {
  73:  { home: '2A',        away: '2B'        },
  74:  { home: '1E',        away: '3 ABCDF'   },
  75:  { home: '1F',        away: '2C'        },
  76:  { home: '1C',        away: '2F'        },
  77:  { home: '1I',        away: '3 CDFGH'   },
  78:  { home: '2E',        away: '2I'        },
  79:  { home: '1A',        away: '3 CEFHI'   },
  80:  { home: '1L',        away: '3 EHIJK'   },
  81:  { home: '1D',        away: '3 BEFIJ'   },
  82:  { home: '1G',        away: '3 AEHIJ'   },
  83:  { home: '2K',        away: '2L'        },
  84:  { home: '1H',        away: '2J'        },
  85:  { home: '1B',        away: '3 EFGIJ'   },
  86:  { home: '1J',        away: '2H'        },
  87:  { home: '1K',        away: '3 DEIJL'   },
  88:  { home: '2D',        away: '2G'        },
  89:  { home: 'Ganador 74',away: 'Ganador 77' },
  90:  { home: 'Ganador 73',away: 'Ganador 75' },
  91:  { home: 'Ganador 76',away: 'Ganador 78' },
  92:  { home: 'Ganador 79',away: 'Ganador 80' },
  93:  { home: 'Ganador 83',away: 'Ganador 84' },
  94:  { home: 'Ganador 81',away: 'Ganador 82' },
  95:  { home: 'Ganador 86',away: 'Ganador 88' },
  96:  { home: 'Ganador 85',away: 'Ganador 87' },
  97:  { home: 'Ganador 89',away: 'Ganador 90' },
  98:  { home: 'Ganador 93',away: 'Ganador 94' },
  99:  { home: 'Ganador 91',away: 'Ganador 92' },
  100: { home: 'Ganador 95',away: 'Ganador 96' },
  101: { home: 'Ganador 97',away: 'Ganador 98' },
  102: { home: 'Ganador 99',away: 'Ganador 100'},
  103: { home: 'Perdedor 101', away: 'Perdedor 102' },
  104: { home: 'Ganador 101', away: 'Ganador 102' },
};

const renderAdminFlag = (team, size = 30) => {
  const iso = TEAM_ISO_CODES[team];
  if (iso) {
    return (
      <div style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--border-glass)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <img
          src={`https://flagcdn.com/w80/${iso}.png`}
          alt={team}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          loading="lazy"
        />
      </div>
    );
  }
  if (team && team.startsWith('Ganador')) return <span style={{ fontSize: '1rem' }}>🏆</span>;
  return <span style={{ fontSize: '1rem' }}>⚽</span>;
};

// Searchable team dropdown — uses position:fixed to escape parent overflow:hidden clipping
function TeamSelector({ value, onChange, placeholder = 'Seleccionar equipo...', disabled = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  const filtered = ALL_TEAMS.filter(t => t.toLowerCase().includes(search.toLowerCase()));

  // Calculate dropdown position relative to viewport (fixed positioning)
  const openDropdown = () => {
    if (disabled || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setDropPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width
    });
    setOpen(true);
    setSearch('');
  };

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        panelRef.current && !panelRef.current.contains(e.target)
      ) setOpen(false);
    };
    const handleScroll = () => setOpen(false);
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  const selected = value && TEAM_ISO_CODES[value] ? value : null;
  const iso = selected ? TEAM_ISO_CODES[selected] : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openDropdown}
        disabled={disabled}
        style={{
          width: '100%',
          height: '44px',
          background: disabled ? 'transparent' : 'var(--bg-secondary)',
          border: `1px solid ${disabled ? 'transparent' : 'var(--border-glass)'}`,
          borderRadius: '10px',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: disabled ? 'default' : 'pointer',
          color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: '0.9rem',
          fontWeight: selected ? '600' : '400',
          transition: 'all 0.2s ease',
          textAlign: 'left'
        }}
      >
        {iso && (
          <div style={{ width: '22px', height: '22px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
            <img src={`https://flagcdn.com/w80/${iso}.png`} alt={selected} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        {!iso && !selected && <span style={{ fontSize: '0.9rem' }}>🌍</span>}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected || placeholder}
        </span>
        {!disabled && <ChevronDown size={16} style={{ flexShrink: 0, color: 'var(--text-muted)', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: `${dropPos.top}px`,
            left: `${dropPos.left}px`,
            width: `${dropPos.width}px`,
            zIndex: 9999,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            animation: 'scaleUp 0.15s ease-out'
          }}
        >
          {/* Search box */}
          <div style={{ padding: '10px', borderBottom: '1px solid var(--border-glass)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar selección..."
                style={{
                  width: '100%',
                  height: '34px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  padding: '0 10px 0 30px',
                  fontSize: '0.82rem',
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
          {/* Team list */}
          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Sin resultados</div>
            )}
            {filtered.map(team => {
              const tIso = TEAM_ISO_CODES[team];
              const isActive = team === selected;
              return (
                <button
                  key={team}
                  type="button"
                  onClick={() => { onChange(team); setOpen(false); }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: isActive ? 'rgba(16,185,129,0.12)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: isActive ? 'var(--accent-green)' : 'var(--text-primary)',
                    fontSize: '0.88rem',
                    fontWeight: isActive ? '700' : '400',
                    textAlign: 'left',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = isActive ? 'rgba(16,185,129,0.12)' : 'transparent'}
                >
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                    <img src={`https://flagcdn.com/w80/${tIso}.png`} alt={team} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  {team}
                  {isActive && <Check size={14} style={{ marginLeft: 'auto' }} />}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default function AdminConsole({ onProfileUpdate }) {
  const { showAlert, showConfirm } = useAlert();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Clasificados');

  // Local score edits for match outcomes
  const [editedScores, setEditedScores] = useState({});
  const [updatingIds, setUpdatingIds] = useState({});
  const [successIds, setSuccessIds] = useState({});

  // Team name edits for knockout stage (Clasificados)
  const [editedTeams, setEditedTeams] = useState({}); // { [matchId]: { home: string, away: string } }
  const [savingTeamIds, setSavingTeamIds] = useState({}); // { [matchId]: boolean }
  const [teamSuccessIds, setTeamSuccessIds] = useState({}); // { [matchId]: boolean }
  const [resetTeamIds, setResetTeamIds] = useState({}); // { [matchId]: boolean }

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wc2026_matches')
        .select('*')
        .order('date_time', { ascending: true });

      if (error) throw error;

      const initialEdits = {};
      const initialTeams = {};
      data.forEach(m => {
        initialEdits[m.id] = {
          home: m.home_score !== null ? m.home_score.toString() : '',
          away: m.away_score !== null ? m.away_score.toString() : ''
        };
        initialTeams[m.id] = {
          home: m.home_team,
          away: m.away_team
        };
      });

      setMatches(data || []);
      setEditedScores(initialEdits);
      setEditedTeams(initialTeams);
    } catch (error) {
      console.error('Error cargando partidos en admin:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (matchId, side, value) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    setEditedScores(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [side]: value }
    }));
  };

  const handleFinishMatch = async (matchId) => {
    const homeVal = editedScores[matchId]?.home;
    const awayVal = editedScores[matchId]?.away;

    if (homeVal === '' || awayVal === '') {
      showAlert('Por favor ingresa ambos marcadores antes de finalizar el partido.', 'Atención', 'warning');
      return;
    }

    setUpdatingIds(prev => ({ ...prev, [matchId]: true }));

    try {
      const { error } = await supabase
        .from('wc2026_matches')
        .update({ home_score: parseInt(homeVal), away_score: parseInt(awayVal), status: 'finished' })
        .eq('id', matchId);

      if (error) throw error;

      setMatches(prev => prev.map(m => m.id === matchId ? {
        ...m, home_score: parseInt(homeVal), away_score: parseInt(awayVal), status: 'finished'
      } : m));

      setSuccessIds(prev => ({ ...prev, [matchId]: true }));
      if (onProfileUpdate) onProfileUpdate();

      setTimeout(() => {
        setSuccessIds(prev => ({ ...prev, [matchId]: false }));
      }, 3000);
    } catch (err) {
      console.error('Error al finalizar partido:', err);
      showAlert(`Error al finalizar partido: ${err.message}`, 'Error', 'error');
    } finally {
      setUpdatingIds(prev => ({ ...prev, [matchId]: false }));
    }
  };

  const handleResetMatch = (matchId) => {
    showConfirm('¿Restablecer este partido? El estado volverá a "Programado".', async () => {
      setUpdatingIds(prev => ({ ...prev, [matchId]: true }));

    try {
      const { error } = await supabase
        .from('wc2026_matches')
        .update({ home_score: null, away_score: null, status: 'scheduled' })
        .eq('id', matchId);

      if (error) throw error;

      setMatches(prev => prev.map(m => m.id === matchId ? {
        ...m, home_score: null, away_score: null, status: 'scheduled'
      } : m));
      setEditedScores(prev => ({ ...prev, [matchId]: { home: '', away: '' } }));
        if (onProfileUpdate) onProfileUpdate();
      } catch (err) {
        console.error('Error al restablecer partido:', err);
      } finally {
        setUpdatingIds(prev => ({ ...prev, [matchId]: false }));
      }
    });
  };

  // Save updated team names for a knockout match
  const handleSaveTeams = async (matchId) => {
    const homeTeam = editedTeams[matchId]?.home;
    const awayTeam = editedTeams[matchId]?.away;

    if (!homeTeam || !awayTeam) return;

    setSavingTeamIds(prev => ({ ...prev, [matchId]: true }));

    try {
      const { error } = await supabase
        .from('wc2026_matches')
        .update({ home_team: homeTeam, away_team: awayTeam })
        .eq('id', matchId);

      if (error) throw error;

      // Update local match state
      setMatches(prev => prev.map(m => m.id === matchId ? {
        ...m, home_team: homeTeam, away_team: awayTeam
      } : m));
      // Also update editedTeams to reflect saved state
      setEditedTeams(prev => ({ ...prev, [matchId]: { home: homeTeam, away: awayTeam } }));

      setTeamSuccessIds(prev => ({ ...prev, [matchId]: true }));
      setTimeout(() => {
        setTeamSuccessIds(prev => ({ ...prev, [matchId]: false }));
      }, 3000);
    } catch (err) {
      console.error('Error al guardar equipos:', err);
      showAlert(`Error al guardar: ${err.message}`, 'Error', 'error');
    } finally {
      setSavingTeamIds(prev => ({ ...prev, [matchId]: false }));
    }
  };

  // Reset team names back to the original seed placeholders (hardcoded constant)
  const handleResetTeams = (matchId) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const orig = SEED_PLACEHOLDERS[match.match_number];
    if (!orig) {
      showAlert('No se encontró el placeholder original para este partido.', 'Error', 'error');
      return;
    }

    const confirmMsg = `¿Restablecer los equipos a los valores originales del fixture?\n\nLocal: "${orig.home}"\nVisitante: "${orig.away}"`;
    showConfirm(confirmMsg, async () => {
      setResetTeamIds(prev => ({ ...prev, [matchId]: true }));

    try {
      const { error } = await supabase
        .from('wc2026_matches')
        .update({ home_team: orig.home, away_team: orig.away })
        .eq('id', matchId);

      if (error) throw error;

        setMatches(prev => prev.map(m => m.id === matchId ? {
          ...m, home_team: orig.home, away_team: orig.away
        } : m));
        setEditedTeams(prev => ({ ...prev, [matchId]: { home: orig.home, away: orig.away } }));
      } catch (err) {
        console.error('Error al restablecer equipos:', err);
        showAlert(`Error al restablecer: ${err.message}`, 'Error', 'error');
      } finally {
        setResetTeamIds(prev => ({ ...prev, [matchId]: false }));
      }
    });
  };

  const belongsToTab = (stage, tab) => {
    if (tab === 'Fase de Grupos') return stage === 'Fase de Grupos';
    if (tab === 'Dieciseisavos') return stage === 'Dieciseisavos de Final';
    if (tab === 'Octavos') return stage === 'Octavos de Final';
    if (tab === 'Cuartos') return stage === 'Cuartos de Final';
    if (tab === 'Fase Final') return stage === 'Semifinal' || stage === 'Final de Bronce' || stage === 'Gran Final';
    // "Clasificados" tab: all non-group stage matches with at least one placeholder
    if (tab === 'Clasificados') return stage !== 'Fase de Grupos';
    return false;
  };

  const getFilteredMatches = () => {
    return matches.filter(match => {
      const stageMatches = belongsToTab(match.stage, activeTab);

      const homeSearch = match.home_team.toLowerCase().includes(searchTerm.toLowerCase());
      const awaySearch = match.away_team.toLowerCase().includes(searchTerm.toLowerCase());
      const venueSearch = match.venue.toLowerCase().includes(searchTerm.toLowerCase());
      const citySearch = match.city.toLowerCase().includes(searchTerm.toLowerCase());
      const searchMatches = homeSearch || awaySearch || venueSearch || citySearch || searchTerm === '';

      return stageMatches && searchMatches;
    });
  };

  const filteredMatches = getFilteredMatches();

  // Count how many knockout matches still have placeholders
  const knockoutMatches = matches.filter(m => m.stage !== 'Fase de Grupos');
  const pendingSlots = knockoutMatches.filter(m => isPlaceholder(m.home_team) || isPlaceholder(m.away_team)).length;
  const filledSlots = knockoutMatches.length - pendingSlots;

  const TABS = ['Clasificados', 'Fase de Grupos', 'Dieciseisavos', 'Octavos', 'Cuartos', 'Fase Final'];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title admin-page-title">
          <ShieldAlert className="admin-page-icon" style={{ color: 'var(--accent-red)', flexShrink: 0 }} size={28} />
          Consola del Administrador
        </h1>
        <p className="page-subtitle">Gestiona clasificados y resultados del Mundial 2026 en tiempo real.</p>
      </div>

      {/* Scoring mechanism info */}
      <div className="admin-scoring-info">
        <Award size={22} style={{ color: 'var(--accent-gold)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '6px', fontSize: '0.95rem' }}>Mecanismo de Puntuación Activo</h4>
          <ul className="admin-scoring-list">
            <li><b>3 Puntos:</b> Marcador exacto (goles Home y Away coinciden).</li>
            <li><b>1 Punto:</b> Ganador o empate correcto, sin acertar los goles exactos.</li>
            <li><b>0 Puntos:</b> Ganador incorrecto.</li>
          </ul>
        </div>
      </div>

      {/* Clasificados progress banner */}
      {activeTab === 'Clasificados' && (
        <div style={{
          background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <Users size={22} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '0.95rem', marginBottom: '4px' }}>
              Equipos clasificados: <span style={{ color: 'var(--accent-green)' }}>{filledSlots}</span> / {knockoutMatches.length} partidos completos
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              Asigna los equipos reales que avanzan de cada ronda. Los usuarios podrán pronosticar los siguientes partidos una vez configurados.
            </p>
          </div>
          {pendingSlots > 0 && (
            <span style={{
              background: 'rgba(245,158,11,0.15)',
              color: 'var(--accent-gold)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '0.78rem',
              fontWeight: '700',
              whiteSpace: 'nowrap'
            }}>
              ⏳ {pendingSlots} pendientes
            </span>
          )}
          {pendingSlots === 0 && (
            <span style={{
              background: 'rgba(16,185,129,0.15)',
              color: 'var(--accent-green)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '0.78rem',
              fontWeight: '700'
            }}>
              ✅ Completo
            </span>
          )}
        </div>
      )}

      {/* Filter Tabs + Search */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
        <div className="filter-tabs">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`filter-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
              style={{
                borderColor: activeTab === tab ? 'var(--accent-red)' : 'var(--border-glass)',
                backgroundColor: activeTab === tab ? 'var(--accent-red)' : 'var(--bg-secondary)',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: activeTab === tab ? '0 4px 14px rgba(239, 68, 68, 0.25)' : 'none',
                position: 'relative'
              }}
            >
              {tab === 'Clasificados' && (
                <Users size={13} style={{ marginRight: '5px', display: 'inline', verticalAlign: 'middle' }} />
              )}
              {tab === 'Fase Final' ? '🔥 Semis & Final' : tab}
              {tab === 'Clasificados' && pendingSlots > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  background: 'var(--accent-gold)',
                  color: '#000',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '0.65rem',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {pendingSlots > 9 ? '9+' : pendingSlots}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="admin-search-wrapper">
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por equipo, ciudad o sede..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '48px' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ minHeight: '40vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
          <Loader2 className="animate-spin" size={40} style={{ color: 'var(--accent-red)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Cargando consola de simulación...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredMatches.length === 0 ? (
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No se encontraron partidos.
            </div>
          ) : (

            /* ── CLASIFICADOS TAB ── */
            activeTab === 'Clasificados' ? (
              filteredMatches.map(match => {
                const currentHome = editedTeams[match.id]?.home ?? match.home_team;
                const currentAway = editedTeams[match.id]?.away ?? match.away_team;
                const homeIsPlaceholder = isPlaceholder(currentHome);
                const awayIsPlaceholder = isPlaceholder(currentAway);
                const hasChanges =
                  currentHome !== match.home_team || currentAway !== match.away_team;
                const isSaving = savingTeamIds[match.id];
                const isSuccess = teamSuccessIds[match.id];
                const isFilled = !homeIsPlaceholder && !awayIsPlaceholder;

                return (
                  <div
                    key={match.id}
                    className="glass-card"
                    style={{
                      padding: '20px',
                      borderColor: isFilled
                        ? 'rgba(16,185,129,0.2)'
                        : 'rgba(245,158,11,0.15)',
                      transition: 'border-color 0.3s ease'
                    }}
                  >
                    {/* Card header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                        N° {match.match_number} • {match.stage}
                      </span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>📍 {match.city}</span>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: isFilled ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                          color: isFilled ? 'var(--accent-green)' : 'var(--accent-gold)'
                        }}>
                          {isFilled ? '✓ Completo' : '⏳ Pendiente'}
                        </span>
                      </div>
                    </div>

                    {/* Team selectors */}
                    <div className="classified-selectors">
                      <div className="classified-team-slot">
                        <label className="classified-label">
                          {homeIsPlaceholder ? (
                            <span style={{ color: 'var(--accent-gold)' }}>⚽ Local (slot: <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '4px' }}>{match.home_team}</code>)</span>
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {renderAdminFlag(currentHome, 18)} Local
                            </span>
                          )}
                        </label>
                        <TeamSelector
                          value={currentHome}
                          onChange={(team) => setEditedTeams(prev => ({ ...prev, [match.id]: { ...prev[match.id], home: team } }))}
                          placeholder="Seleccionar equipo local..."
                        />
                      </div>

                      <div className="classified-vs">VS</div>

                      <div className="classified-team-slot">
                        <label className="classified-label">
                          {awayIsPlaceholder ? (
                            <span style={{ color: 'var(--accent-gold)' }}>⚽ Visitante (slot: <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '4px' }}>{match.away_team}</code>)</span>
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {renderAdminFlag(currentAway, 18)} Visitante
                            </span>
                          )}
                        </label>
                        <TeamSelector
                          value={currentAway}
                          onChange={(team) => setEditedTeams(prev => ({ ...prev, [match.id]: { ...prev[match.id], away: team } }))}
                          placeholder="Seleccionar equipo visitante..."
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      {/* Reset button (left side) */}
                      <button
                        onClick={() => handleResetTeams(match.id)}
                        disabled={resetTeamIds[match.id]}
                        className="btn-secondary"
                        style={{
                          padding: '8px 14px',
                          fontSize: '0.82rem',
                          height: '38px',
                          gap: '6px',
                          opacity: resetTeamIds[match.id] ? 0.5 : 1
                        }}
                        title="Restablecer al valor original de la base de datos"
                      >
                        {resetTeamIds[match.id] ? (
                          <><Loader2 className="animate-spin" size={13} /> Restableciendo...</>
                        ) : (
                          <><RefreshCw size={13} /> Restablecer</>
                        )}
                      </button>

                      {/* Right side: feedback + save */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {isSuccess && (
                          <span style={{ color: 'var(--accent-green)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={14} /> ¡Guardado!
                          </span>
                        )}
                        <button
                          onClick={() => handleSaveTeams(match.id)}
                          disabled={isSaving || (!hasChanges && isFilled)}
                          className="btn-premium"
                          style={{
                            padding: '8px 20px',
                            fontSize: '0.88rem',
                            height: '38px',
                            background: 'linear-gradient(135deg, var(--accent-green) 0%, #0d9488 100%)',
                            opacity: (isSaving || (!hasChanges && isFilled)) ? 0.5 : 1
                          }}
                        >
                          {isSaving ? (
                            <><Loader2 className="animate-spin" size={14} /> Guardando...</>
                          ) : (
                            <><Check size={14} /> Confirmar</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (

              /* ── RESULTS TABS (Fase de Grupos, Dieciseisavos, etc.) ── */
              filteredMatches.map(match => {
                const localHome = editedScores[match.id]?.home ?? '';
                const localAway = editedScores[match.id]?.away ?? '';
                const isFinished = match.status === 'finished';
                const isUpdating = updatingIds[match.id];
                const isSuccess = successIds[match.id];

                return (
                  <div key={match.id} className="glass-card admin-match-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>N° {match.match_number} • {match.stage} {match.group_name ? `(Grupo ${match.group_name})` : ''}</span>
                      <span style={{
                        color: isFinished ? 'var(--accent-green)' : 'var(--accent-gold)',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        background: isFinished ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                        padding: '3px 8px',
                        borderRadius: '4px'
                      }}>
                        {isFinished ? '✓ Finalizado' : '⏱ Programado'}
                      </span>
                    </div>

                    <div className="admin-match-body">
                      <div className="admin-teams-row">
                        <div className="admin-team-side home">
                          {renderAdminFlag(match.home_team)}
                          <span className="admin-team-name">{match.home_team}</span>
                        </div>

                        <div className="admin-score-inputs">
                          <input
                            type="text"
                            className="admin-score-input-box"
                            maxLength="2"
                            value={localHome}
                            onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                            disabled={isFinished}
                          />
                          <span className="admin-score-separator">-</span>
                          <input
                            type="text"
                            className="admin-score-input-box"
                            maxLength="2"
                            value={localAway}
                            onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                            disabled={isFinished}
                          />
                        </div>

                        <div className="admin-team-side away">
                          <span className="admin-team-name">{match.away_team}</span>
                          {renderAdminFlag(match.away_team)}
                        </div>
                      </div>

                      <div className="admin-action-side">
                        {isFinished ? (
                          <button
                            onClick={() => handleResetMatch(match.id)}
                            className="btn-secondary admin-action-button"
                            disabled={isUpdating}
                          >
                            <RefreshCw size={14} /> Restablecer
                          </button>
                        ) : (
                          <button
                            onClick={() => handleFinishMatch(match.id)}
                            className="btn-premium admin-action-button"
                            style={{
                              background: 'linear-gradient(135deg, var(--accent-red) 0%, #b91c1c 100%)',
                              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.25)',
                              color: 'var(--text-primary)'
                            }}
                            disabled={isUpdating}
                          >
                            {isUpdating ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : isSuccess ? (
                              <Check size={14} />
                            ) : (
                              'Finalizar Partido'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      )}
    </div>
  );
}
