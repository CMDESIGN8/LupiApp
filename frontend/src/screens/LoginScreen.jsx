const handleAuth = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    console.log('Attempting registration...');
    
    if (isLogin) {
      // Lógica de login existente
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
    } else {
      // REGISTRO - con mejor manejo de errores
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (signUpError) {
        // Usuario ya existe
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

      // Éxito en registro
      alert('¡Registro exitoso! Por favor verifica tu email para confirmar la cuenta.');
      
      // Crear perfil manualmente por si el trigger falla
      try {
        await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username: username,
            wallet_address: `${username.toLowerCase()}.lupi`,
            lupicoins: 100
          });
      } catch (profileError) {
        console.warn('Profile creation might have failed:', profileError);
      }
    }

  } catch (error) {
    console.error('Full auth error:', error);
    
    // Errores específicos
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