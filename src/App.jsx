import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth, { JerseySVG } from './components/Auth';
import MatchCenter from './components/MatchCenter';
import Leaderboard from './components/Leaderboard';
import AdminConsole from './components/AdminConsole';
import Profile from './components/Profile';
import { useAlert } from './components/ui/AlertContext';
import { Trophy, Calendar, ShieldAlert, User, LogOut, Loader2, Award, Star, Zap, Menu, X } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [currentTab, setCurrentTab] = useState('matches'); // 'matches' | 'leaderboard' | 'admin' | 'profile'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { showConfirm } = useAlert();

  // Fetch profile when tab changes to keep scores/stats in sync
  useEffect(() => {
    if (user) {
      fetchUserProfile(user);
    }
  }, [currentTab]);

  const refreshProfile = () => {
    if (user) {
      fetchUserProfile(user);
    }
  };

  useEffect(() => {
    // 1. Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setLoadingAuth(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setUser(null);
        setProfile(null);
        setLoadingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (authUser) => {
    try {
      const { data, error } = await supabase
        .from('wc2026_profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle(); // maybeSingle returns null instead of throwing on 0 rows

      if (error) throw error;

      if (data) {
        setUser(authUser);
        setProfile(data);
      } else {
        // Fallback: If auth user exists but profile does not, create a fallback profile
        const { data: newProfile, error: insertError } = await supabase
          .from('wc2026_profiles')
          .insert({
            id: authUser.id,
            username: authUser.email.split('@')[0],
            favorite_team: 'México',
            avatar_config: { color: '#ef4444', jersey: 10 }
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setUser(authUser);
        setProfile(newProfile);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleSignOut = () => {
    showConfirm('¿Seguro que quieres cerrar sesión?', async () => {
      await supabase.auth.signOut();
    }, 'Cerrar Sesión', 'warning');
  };

  if (loadingAuth) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px', background: 'var(--bg-primary)' }}>
        <Loader2 className="animate-spin" size={48} style={{ color: 'var(--accent-green)' }} />
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-title)', fontWeight: '600' }}>Iniciando Quinela 2026...</p>
      </div>
    );
  }

  // If not authenticated, render Auth components
  if (!user || !profile) {
    return (
      <div style={{ minHeight: '100vh', padding: '24px 16px', background: 'var(--bg-primary)' }}>
        <Auth onAuthSuccess={(authUser) => fetchUserProfile(authUser)} />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation (Desktop and Mobile sliding drawer) */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        {/* Close Button (Mobile Only) */}
        <button 
          className="sidebar-close-btn"
          onClick={() => setMobileMenuOpen(false)}
          title="Cerrar menú"
        >
          <X size={20} />
        </button>

        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '36px' }}>
          <img 
            src="/logo.png" 
            alt="FIFA World Cup 2026" 
            style={{ height: '68px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.4))' }} 
          />
          <span className="sidebar-logo-text" style={{ fontSize: '1.6rem', lineHeight: '1.2' }}>Quinela FWC26</span>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`sidebar-link ${currentTab === 'matches' ? 'active' : ''}`}
            onClick={() => {
              setCurrentTab('matches');
              setMobileMenuOpen(false);
            }}
          >
            <Calendar size={20} />
            Centro Partidos
          </button>
          
          <button 
            className={`sidebar-link ${currentTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => {
              setCurrentTab('leaderboard');
              setMobileMenuOpen(false);
            }}
          >
            <Trophy size={20} />
            Leaderboard
          </button>

          {profile?.is_admin && (
            <button 
              className={`sidebar-link ${currentTab === 'admin' ? 'active' : ''}`}
              onClick={() => {
                setCurrentTab('admin');
                setMobileMenuOpen(false);
              }}
              style={{ borderLeftColor: currentTab === 'admin' ? 'var(--accent-red)' : 'transparent' }}
            >
              <ShieldAlert size={20} />
              Consola Admin
            </button>
          )}

          <button 
            className={`sidebar-link ${currentTab === 'profile' ? 'active' : ''}`}
            onClick={() => {
              setCurrentTab('profile');
              setMobileMenuOpen(false);
            }}
          >
            <User size={20} />
            Mi Perfil
          </button>
        </nav>

        {/* User Mini Profile Badge (Bottom Sidebar) */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-glass)', paddingTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', flexShrink: 0 }}>
            <JerseySVG 
              color={profile.avatar_config?.color || '#ef4444'} 
              number={profile.avatar_config?.jersey || 10} 
            />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile.username}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--accent-green)', fontWeight: '600' }}>
              {profile.total_points} pts
            </div>
          </div>
          <button 
            onClick={() => {
              setMobileMenuOpen(false);
              handleSignOut();
            }} 
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '4px' }}
            title="Cerrar Sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Backdrop overlay for mobile drawer */}
      {mobileMenuOpen && (
        <div 
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Header Banner (Mobile Only) */}
      <header className="header-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(true)}
            title="Abrir menú"
          >
            <Menu size={24} />
          </button>
          <div className="brand-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src="/logo.png" 
              alt="FIFA World Cup 2026" 
              style={{ height: '52px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))' }} 
            />
            <span className="brand-name" style={{ fontSize: '1.35rem', lineHeight: '1.2' }}>Quinela FWC26</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--accent-green)', background: 'var(--accent-green-glow)', padding: '4px 10px', borderRadius: '12px', border: '1px solid var(--border-glass-glow)' }}>
            {profile.total_points} pts
          </div>
        </div>
      </header>

      {/* Mobile Navigation Bottom Bar (Mobile Only) */}
      <nav className="mobile-nav">
        <button 
          className={`mobile-nav-item ${currentTab === 'matches' ? 'active' : ''}`}
          onClick={() => setCurrentTab('matches')}
        >
          <Calendar />
          <span>Partidos</span>
        </button>

        <button 
          className={`mobile-nav-item ${currentTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setCurrentTab('leaderboard')}
        >
          <Trophy />
          <span>Ranking</span>
        </button>

        {profile?.is_admin && (
          <button 
            className={`mobile-nav-item ${currentTab === 'admin' ? 'active' : ''}`}
            onClick={() => setCurrentTab('admin')}
          >
            <ShieldAlert style={{ color: currentTab === 'admin' ? 'var(--accent-red)' : 'inherit' }} />
            <span>Admin</span>
          </button>
        )}

        <button 
          className={`mobile-nav-item ${currentTab === 'profile' ? 'active' : ''}`}
          onClick={() => setCurrentTab('profile')}
        >
          <User />
          <span>Perfil</span>
        </button>
      </nav>

      {/* Main View Render Area */}
      <main className="main-content">
        {currentTab === 'matches' && <MatchCenter user={profile} />}
        {currentTab === 'leaderboard' && <Leaderboard currentUser={profile} />}
        {currentTab === 'admin' && profile?.is_admin && <AdminConsole onProfileUpdate={refreshProfile} />}
        {currentTab === 'profile' && (
          <Profile 
            profile={profile} 
            onProfileUpdate={refreshProfile} 
            onSignOut={handleSignOut} 
          />
        )}
      </main>
    </div>
  );
}
