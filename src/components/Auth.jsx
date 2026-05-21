import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, User, Shield, Trophy } from 'lucide-react';

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', 
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#f43f5e'
];

const TEAMS = [
  'México', 'Estados Unidos', 'Canadá', 'Argentina', 'Brasil', 
  'Francia', 'Inglaterra', 'España', 'Alemania', 'Países Bajos',
  'Portugal', 'Uruguay', 'Croacia', 'Senegal', 'Japón', 'Otro'
];

export function JerseySVG({ color, number = 10, className = "w-full h-full" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Jersey body */}
      <path 
        d="M20,25 L35,12 L65,12 L80,25 L75,48 L68,48 L68,88 L32,88 L32,48 L25,48 Z" 
        fill={color} 
        stroke="#ffffff" 
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Trim lines */}
      <path d="M35,12 L32,88" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
      <path d="M65,12 L68,88" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
      {/* Sleeve stripes */}
      <path d="M22,21 L28,38" stroke="#ffffff" strokeWidth="2.5" />
      <path d="M78,21 L72,38" stroke="#ffffff" strokeWidth="2.5" />
      {/* Collar V-neck */}
      <path d="M42,12 Q50,25 58,12" fill="none" stroke="#ffffff" strokeWidth="3" />
      {/* Number on chest */}
      <text 
        x="50" 
        y="62" 
        fontSize="26" 
        fontFamily="'Outfit', sans-serif" 
        fontWeight="900" 
        fill="#ffffff" 
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ userSelect: 'none', filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.4))' }}
      >
        {number}
      </text>
    </svg>
  );
}

export default function Auth({ onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [favoriteTeam, setFavoriteTeam] = useState('México');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Jersey Customizer State
  const [jerseyColor, setJerseyColor] = useState(COLORS[3]); // Default green
  const [jerseyNumber, setJerseyNumber] = useState(10);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isRegister) {
        if (!username.trim()) throw new Error('Por favor ingresa un nombre de usuario.');
        
        // 1. Sign up user in Supabase Auth
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;
        
        const user = signUpData.user;
        if (!user) throw new Error('El registro falló. Inténtalo de nuevo.');

        // 2. Create the custom profile in wc2026_profiles
        const { error: profileError } = await supabase
          .from('wc2026_profiles')
          .insert({
            id: user.id,
            username: username.trim(),
            favorite_team: favoriteTeam,
            avatar_config: { color: jerseyColor, jersey: jerseyNumber }
          });

        if (profileError) {
          // If inserting profile fails, delete user or warn
          throw new Error(`Error al crear perfil: ${profileError.message}`);
        }

        // Successfully registered
        onAuthSuccess(user);
      } else {
        // Sign in user
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        onAuthSuccess(data.user);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] display-flex flex-direction-column align-items-center justify-content-center" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', marginBottom: '20px' }}>
            <img 
              src="/logo.png" 
              alt="FIFA World Cup 2026" 
              style={{ height: '160px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))' }} 
            />
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: '8px', fontFamily: 'var(--font-title)' }}>
            {isRegister ? 'Crear Cuenta' : 'Quinela Mundial 2026'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {isRegister ? 'Diseña tu camiseta y únete a la competencia' : 'Registra tus pronósticos y compite con amigos'}
          </p>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px 16px', borderRadius: '12px', color: 'var(--accent-red)', fontSize: '0.85rem', marginBottom: '20px', fontWeight: '500' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth}>
          {isRegister && (
            <>
              {/* Jersey Customizer */}
              <div className="jersey-customizer">
                <div className="jersey-svg-container">
                  <JerseySVG color={jerseyColor} number={jerseyNumber} />
                </div>
                <div className="jersey-controls">
                  <div className="jersey-color-picker">
                    {COLORS.map(c => (
                      <div 
                        key={c}
                        className={`color-dot ${jerseyColor === c ? 'active' : ''}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setJerseyColor(c)}
                      />
                    ))}
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ textAlign: 'center' }}>Número en Camiseta ({jerseyNumber})</label>
                    <input 
                      type="range" 
                      min="1" 
                      max="99" 
                      value={jerseyNumber} 
                      onChange={(e) => setJerseyNumber(parseInt(e.target.value))}
                      style={{ accentColor: 'var(--accent-green)', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              </div>

              {/* Username Input */}
              <div className="form-group">
                <label className="form-label">Nombre de Usuario (Nickname)</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Tu apodo de juego"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{ paddingLeft: '48px' }}
                  />
                </div>
              </div>

              {/* Favorite Team Input */}
              <div className="form-group">
                <label className="form-label">¿A quién le vas en el Mundial?</label>
                <select 
                  className="form-select"
                  value={favoriteTeam}
                  onChange={(e) => setFavoriteTeam(e.target.value)}
                >
                  {TEAMS.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Email Input */}
          <div className="form-group">
            <label className="form-label">Correo Electrónico</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
              <input 
                type="email" 
                className="form-input" 
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '48px' }}
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                className="form-input" 
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '48px' }}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-premium" 
            style={{ width: '100%', height: '50px', fontSize: '1.05rem', marginBottom: '16px' }}
            disabled={loading}
          >
            {loading ? 'Procesando...' : (isRegister ? 'Registrarse e Ingresar' : 'Iniciar Sesión')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <button 
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg('');
            }}
            style={{ background: 'none', border: 'none', color: 'var(--accent-green)', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            {isRegister ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate gratis'}
          </button>
        </div>
      </div>
    </div>
  );
}
