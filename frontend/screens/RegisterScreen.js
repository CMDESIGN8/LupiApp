import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { authService, playerService } from '../services';

const SPORTS = [
  { label: 'Fútbol', value: 'futbol' },
  { label: 'Vóley', value: 'voley' },
  { label: 'Handball', value: 'handball' },
  { label: 'Hockey', value: 'hockey' },
  { label: 'Rugby', value: 'rugby' },
  { label: 'Fitness', value: 'fitness' }
];

const POSITIONS = {
  futbol: [
    { label: 'Arquero', value: 'arquero' },
    { label: 'Defensor', value: 'defensor' },
    { label: 'Mediocampista', value: 'mediocampista' },
    { label: 'Delantero', value: 'delantero' }
  ],
  fitness: [
    { label: 'Neutro', value: 'neutro' }
  ]
};

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [sport, setSport] = useState('');
  const [position, setPosition] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !username || !fullName || !sport || !position) {
      alert('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      // Registrar usuario
      const authData = await authService.signUp(email, password, username);
      
      // Crear jugador
      await playerService.createPlayer(authData.user.id, {
        fullName,
        sport,
        position
      });

      alert('¡Registro exitoso! Bienvenido a Lupi App');
      navigation.navigate('Home');
    } catch (error) {
      alert('Error en el registro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Crear Cuenta Lupi App</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TextInput
        style={styles.input}
        placeholder="Nombre de usuario"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Nombre completo"
        value={fullName}
        onChangeText={setFullName}
      />

      <Text style={styles.label}>Deporte:</Text>
      <View style={styles.optionsContainer}>
        {SPORTS.map((sportItem) => (
          <TouchableOpacity
            key={sportItem.value}
            style={[
              styles.optionButton,
              sport === sportItem.value && styles.optionButtonSelected
            ]}
            onPress={() => setSport(sportItem.value)}
          >
            <Text style={styles.optionText}>{sportItem.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {sport && (
        <>
          <Text style={styles.label}>Posición:</Text>
          <View style={styles.optionsContainer}>
            {(POSITIONS[sport] || []).map((positionItem) => (
              <TouchableOpacity
                key={positionItem.value}
                style={[
                  styles.optionButton,
                  position === positionItem.value && styles.optionButtonSelected
                ]}
                onPress={() => setPosition(positionItem.value)}
              >
                <Text style={styles.optionText}>{positionItem.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <TouchableOpacity 
        style={styles.registerButton} 
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.registerButtonText}>
          {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    marginTop: 20
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 10
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  optionButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    minWidth: '48%',
    alignItems: 'center'
  },
  optionButtonSelected: {
    backgroundColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500'
  },
  registerButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20
  },
  registerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold'
  }
});