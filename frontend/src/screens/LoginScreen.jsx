import { useState } from 'react';
import { supabase } from '../lib/supabase';
import './LoginScreen.css';

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // ← Asegúrate de tener este estado
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Attempting registration...');
      
      if (isLogin) {
        // Lógica de login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
      } else {
        // ✅ REGISTRO CORREGIDO - username está definido
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },  // ← Ahora username sí está definido
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password
            });
            if (signInError) throw signInError;
            alert('¡Bienvenido de vuelta! Tu cuenta ya existía.');
            return;
          }
          throw signUpError;
        }

        alert('¡Registro exitoso! Por favor verifica tu email.');
        
        // Crear perfil manualmente
        try {
          await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              username: username,  // ← username definido
              wallet_address: `${username.toLowerCase()}.lupi`,
              lupicoins: 100
            });
        } catch (profileError) {
          console.warn('Profile creation might have failed:', profileError);
        }
      }

    } catch (error) {
      console.error('Full auth error:', error);
      
      if (error.message.includes('Email not confirmed')) {
        alert('Por favor confirma tu email antes de iniciar sesión.');
      } else if (error.message.includes('Invalid login credentials')) {
        alert('Email o contraseña incorrectos.');
      } else if (error.message.includes('already registered')) {
        alert('Este email ya está registrado. Intenta iniciar sesión.');
      } else {
        alert('Error: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h1>⚽ Lupi App</h1>
        <p>Tu juego deportivo favorito</p>
      </div>

      <form onSubmit={handleAuth} className="auth-form">
        {/* Campo de email */}
        <div className="input-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="tu@email.com"
          />
        </div>

        {/* Campo de contraseña */}
        <div className="input-group">
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Mínimo 6 caracteres"
            minLength="6"
          />
        </div>

        {/* ✅ Campo de username SOLO para registro */}
        {!isLogin && (
          <div className="input-group">
            <label>Nombre de usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Tu nombre de usuario"
              minLength="3"
            />
          </div>
        )}

        <button 
          type="submit" 
          className="auth-button"
          disabled={loading}
        >
          {loading ? 'Cargando...' : isLogin ? 'Iniciar Sesión' : 'Registrarse'}
        </button>
      </form>

      <button 
        className="switch-mode-button"
        onClick={() => setIsLogin(!isLogin)}
        type="button"
      >
        {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
      </button>
    </div>
  );
};

export default LoginScreen;