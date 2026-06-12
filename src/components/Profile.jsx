import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { JerseySVG } from './Auth';
import { Zap, Award, Star, LogOut, Edit2, Save, X, Loader2, BarChart2 } from 'lucide-react';
import { useAlert } from './ui/AlertContext';

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', 
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#f43f5e'
];

const TEAMS = [
  'México', 'Estados Unidos', 'Canadá', 'Argentina', 'Brasil', 
  'Francia', 'Inglaterra', 'España', 'Alemania', 'Italia', 'Países Bajos',
  'Portugal', 'Uruguay', 'Croacia', 'Senegal', 'Japón', 'Otro'
];

export default function Profile({ profile, onProfileUpdate, onSignOut }) {
  const { showAlert } = useAlert();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // History states
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [editForm, setEditForm] = useState({
    username: profile.username || '',
    favorite_team: profile.favorite_team || 'México',
    color: profile.avatar_config?.color || '#ef4444',
    jersey: profile.avatar_config?.jersey || 10
  });

  useEffect(() => {
    fetchHistory();
  }, [profile.id]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('wc2026_predictions')
        .select(`
          points_earned,
          wc2026_matches!inner (
            date_time,
            status
          )
        `)
        .eq('user_id', profile.id)
        .eq('wc2026_matches.status', 'finished');

      if (error) throw error;

      // Group points by date
      const grouped = {};
      data.forEach(pred => {
        // Only sum points if they exist
        const pts = pred.points_earned || 0;
        if (pts > 0) {
          const matchDate = new Date(pred.wc2026_matches.date_time);
          // Format as localized short date, e.g. "Jun 11"
          const dateStr = matchDate.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
          grouped[dateStr] = (grouped[dateStr] || 0) + pts;
        }
      });

      // Convert to array and sort (assuming chronological string insertion is roughly correct for a month tournament, 
      // but better to sort by actual date. For simplicity, we just rely on Supabase match_number ordering implicitly if we sorted, 
      // but let's parse back or sort properly).
      // Since it's a short period, we can just display the keys as they appear if we parse them from date objects.
      
      // Let's do a proper chronological sort
      const groupedByIso = {};
      data.forEach(pred => {
        const pts = pred.points_earned || 0;
        if (pts > 0) {
          const isoDate = pred.wc2026_matches.date_time.split('T')[0]; // YYYY-MM-DD
          groupedByIso[isoDate] = (groupedByIso[isoDate] || 0) + pts;
        }
      });

      const sortedKeys = Object.keys(groupedByIso).sort();
      const chartData = sortedKeys.map(iso => {
        const d = new Date(iso + 'T12:00:00Z');
        return {
          label: d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
          points: groupedByIso[iso]
        };
      });

      setHistoryData(chartData.slice(-10)); // Show last 10 active days
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (editForm.username.trim().length < 3) {
      showAlert('El nombre de usuario debe tener al menos 3 caracteres.', 'Atención', 'warning');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('wc2026_profiles')
        .update({
          username: editForm.username.trim(),
          favorite_team: editForm.favorite_team,
          avatar_config: {
            color: editForm.color,
            jersey: parseInt(editForm.jersey) || 10
          }
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      showAlert('Perfil actualizado correctamente.', '¡Éxito!', 'success');
      setIsEditing(false);
      if (onProfileUpdate) onProfileUpdate();
    } catch (err) {
      console.error('Error actualizando perfil:', err);
      showAlert(`No se pudo actualizar el perfil: ${err.message}`, 'Error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      username: profile.username || '',
      favorite_team: profile.favorite_team || 'México',
      color: profile.avatar_config?.color || '#ef4444',
      jersey: profile.avatar_config?.jersey || 10
    });
    setIsEditing(false);
  };

  const maxPoints = Math.max(...historyData.map(d => d.points), 1);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Mi Perfil</h1>
        <p className="page-subtitle">Visualiza tus estadísticas generales y gestiona tu cuenta.</p>
      </div>

      <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
        
        {/* Toggle Edit Button */}
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="btn-secondary"
            style={{ position: 'absolute', top: '24px', right: '24px', padding: '8px 16px', display: 'flex', gap: '6px' }}
          >
            <Edit2 size={16} />
            Editar
          </button>
        )}

        <div style={{ width: '120px', height: '120px', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))' }}>
          <JerseySVG 
            color={isEditing ? editForm.color : (profile.avatar_config?.color || '#ef4444')} 
            number={isEditing ? editForm.jersey : (profile.avatar_config?.jersey || 10)} 
          />
        </div>

        {!isEditing ? (
          // VIEW MODE
          <>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '4px', fontFamily: 'var(--font-title)' }}>{profile.username}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Hincha de: <b style={{ color: 'var(--text-primary)' }}>{profile.favorite_team}</b></p>
            </div>

            {/* Stats Panel */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', width: '100%', marginTop: '12px' }}>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <Zap size={20} style={{ color: 'var(--accent-green)', margin: '0 auto 8px' }} />
                <div style={{ fontSize: '1.4rem', fontWeight: '800', fontFamily: 'var(--font-title)' }}>{profile.total_points}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '500', textTransform: 'uppercase', marginTop: '2px' }}>Puntos</div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <Award size={20} style={{ color: 'var(--accent-gold)', margin: '0 auto 8px' }} />
                <div style={{ fontSize: '1.4rem', fontWeight: '800', fontFamily: 'var(--font-title)' }}>{profile.perfect_hits}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '500', textTransform: 'uppercase', marginTop: '2px' }}>Aciertos 3P</div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <Star size={20} style={{ color: 'var(--accent-blue)', margin: '0 auto 8px' }} />
                <div style={{ fontSize: '1.4rem', fontWeight: '800', fontFamily: 'var(--font-title)' }}>{profile.correct_results}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '500', textTransform: 'uppercase', marginTop: '2px' }}>Resultados 1P</div>
              </div>
            </div>

            {/* History Chart */}
            <div style={{ width: '100%', marginTop: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-primary)' }}>
                <BarChart2 size={18} style={{ color: 'var(--accent-blue)' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>Historial de Puntos</h3>
              </div>
              
              {loadingHistory ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                  <Loader2 className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                </div>
              ) : historyData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Aún no hay puntos registrados. ¡Espera a que finalicen los primeros partidos!
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '120px', gap: '8px', paddingTop: '20px' }}>
                  {historyData.map((item, i) => {
                    const heightPct = Math.max((item.points / maxPoints) * 100, 5); // min 5% height for visibility
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '8px' }}>
                        {/* Bar container */}
                        <div style={{ width: '100%', height: '100px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', position: 'relative' }}>
                          <span style={{ position: 'absolute', top: `calc(${100 - heightPct}% - 20px)`, fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {item.points}
                          </span>
                          <div style={{ 
                            width: '100%', 
                            maxWidth: '24px', 
                            height: `${heightPct}%`, 
                            background: 'linear-gradient(to top, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.8))',
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.5s ease-out'
                          }} />
                        </div>
                        {/* Label */}
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
              <button 
                onClick={onSignOut} 
                className="btn-secondary" 
                style={{ width: '100%', display: 'flex', gap: '8px', justifyContent: 'center', color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
              >
                <LogOut size={18} />
                Cerrar Sesión
              </button>
            </div>
          </>
        ) : (
          // EDIT MODE
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="input-group">
              <label>Nombre de Usuario</label>
              <input 
                type="text" 
                placeholder="Tu apodo"
                value={editForm.username}
                onChange={(e) => handleEditChange('username', e.target.value)}
                maxLength={20}
              />
            </div>
            
            <div className="input-group">
              <label>Equipo Favorito</label>
              <select 
                value={editForm.favorite_team} 
                onChange={(e) => handleEditChange('favorite_team', e.target.value)}
              >
                {TEAMS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Color de Camiseta</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                {COLORS.map(c => (
                  <button 
                    key={c}
                    onClick={() => handleEditChange('color', c)}
                    style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', background: c, 
                      border: editForm.color === c ? '3px solid white' : 'none',
                      cursor: 'pointer', transition: 'all 0.2s',
                      boxShadow: editForm.color === c ? '0 0 10px rgba(255,255,255,0.5)' : 'none'
                    }}
                    type="button"
                    aria-label={`Seleccionar color ${c}`}
                  />
                ))}
              </div>
            </div>

            <div className="input-group">
              <label>Número (1-99)</label>
              <input 
                type="number" 
                min="1" max="99"
                value={editForm.jersey}
                onChange={(e) => handleEditChange('jersey', e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button 
                className="btn-secondary" 
                style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px' }}
                onClick={handleCancel}
                disabled={loading}
              >
                <X size={18} />
                Cancelar
              </button>
              <button 
                className="btn-primary" 
                style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px' }}
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Guardar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
