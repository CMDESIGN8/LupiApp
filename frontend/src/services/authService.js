export const authService = {
  signUp: async (email, password, username) => {
    try {
      console.log('Starting signup process for:', email);
      
      // 1. Primero crear el usuario en Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }

      console.log('Auth success, user ID:', authData.user?.id);

      // 2. Esperar un momento para que el trigger se ejecute
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 3. Verificar si el trigger funcionó
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      // 4. Si el trigger falló, crear el perfil manualmente
      if (profileError || !profile) {
        console.warn('Trigger failed, creating profile manually');
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            username: username,
            wallet_address: `${username.toLowerCase()}.lupi`,
            lupicoins: 100
          });

        if (insertError) {
          console.error('Manual profile creation failed:', insertError);
          // No throw aquí - el usuario ya se creó en auth
        }
      }

      console.log('Signup completed successfully');
      return authData;

    } catch (error) {
      console.error('Signup failed completely:', error);
      
      // Manejar error específico de usuario ya existente
      if (error.message?.includes('already registered')) {
        throw new Error('Este email ya está registrado. Intenta iniciar sesión.');
      }
      
      throw error;
    }
  }
};