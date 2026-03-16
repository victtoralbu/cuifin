import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial session check
    const checkSession = async () => {
      // DEV MODE BYPASS: If on localhost, we can auto-login a mock user if desired
      // For now, let's keep it manual but allow the login button to bypass
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata.full_name || session.user.email,
          email: session.user.email,
          avatar: session.user.user_metadata.avatar_url,
        });
      } else if (window.location.hostname === 'localhost' && localStorage.getItem('dev_mode_login') === 'true') {
        // Auto-restore mock session if it was active
        setUser({
          id: 'dev-user-id',
          name: 'Desenvolvedor Local',
          email: 'dev@cuifin.local',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dev',
        });
      }
      setLoading(false);
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata.full_name || session.user.email,
          email: session.user.email,
          avatar: session.user.user_metadata.avatar_url,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLoginSuccess = async (credentialResponse) => {
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credentialResponse.credential,
      });
      if (error) throw error;
      console.log('Supabase login success:', data);
    } catch (error) {
      console.error('Error syncing auth with Supabase:', error);
      
      // DEV MODE BYPASS
      if (window.location.hostname === 'localhost') {
        console.warn('Dev Mode: Bypassing auth error and logging in as mock user.');
        localStorage.setItem('dev_mode_login', 'true');
        setUser({
          id: 'dev-user-id',
          name: 'Desenvolvedor Local',
          email: 'dev@cuifin.local',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dev',
        });
        return;
      }
      
      alert(`Erro ao sincronizar login: ${error.message}. Verifique as configurações no implementation_plan.md`);
    }
  };

  const logout = async () => {
    localStorage.removeItem('dev_mode_login');
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, handleLoginSuccess, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
