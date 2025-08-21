import { useState, useEffect, useRef } from 'react';
import {
  LogIn,
  UserPlus,
  Compass,
  Swords,
  Users,
  Backpack,
  LogOut,
  ChevronUp,
  ChevronDown,
  CircleCheck,
  Zap,
  Star,
  Trophy,
  Wallet,
  CornerUpRight,
  ShoppingCart,
  DollarSign,
  MessageCircleMore
} from 'lucide-react';
import './App.css'; // ¡Importamos nuestro nuevo archivo CSS!

// Se carga la biblioteca de Supabase
const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

// Usar una variable global para el cliente de Supabase para asegurar que solo se cree una instancia.
let supabaseClient = null;

const positions = ['Arquero', 'Defensa', 'Mediocampista', 'Delantero', 'Neutro'];
const sports = ['Fútbol', 'Voley', 'Handball', 'Hockey', 'Rugby', 'Fitness'];
const skillNames = ["Fuerza", "Resistencia", "Técnica", "Velocidad", "Dribling", "Pase", "Tiro", "Defensa", "Liderazgo", "Estrategia", "Inteligencia"];
const initialSkillPoints = 5;

const App = () => {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('auth');
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [sport, setSport] = useState(sports[0]);
  const [position, setPosition] = useState(positions[0]);
  const [availablePoints, setAvailablePoints] = useState(initialSkillPoints);
  const [skills, setSkills] = useState(skillNames.reduce((acc, skill) => ({ ...acc, [skill]: 50 }), {}));
  const [message, setMessage] = useState('');
  const [isSupabaseReady, setIsSupabase] = useState(false);
  const [playerData, setPlayerData] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [equippedItems, setEquippedItems] = useState({});
  const [missionsData, setMissionsData] = useState([]);
  const [lupiCoins, setLupiCoins] = useState(0);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [marketItems, setMarketItems] = useState([]);
  const [itemToSell, setItemToSell] = useState(null);
  const [sellPrice, setSellPrice] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000); // Ocultar mensaje después de 3 segundos
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Inicializa el cliente de Supabase y carga el script del CDN una sola vez.
  useEffect(() => {
    if (supabaseClient) {
      setIsSupabase(true);
      return;
    }

    const script = document.createElement('script');
    script.src = SUPABASE_CDN;
    script.onload = () => {
      if (!supabaseClient) {
        const SUPABASE_URL = "https://xvdevkrgsgiiqqhfnnut.supabase.co"; 
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZGV2a3Jnc2dpaXFxaGZubnV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MzMwMDQsImV4cCI6MjA3MTMwOTAwNH0.uS3WC9rdNeAeGmiJdwKC-q1N_w_rDE413Zu62rfmLVc";
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        setIsSupabase(true);
      }
    };
    script.onerror = () => {
      showMessage('Failed to load Supabase script.');
      setLoading(false);
    };
    document.head.appendChild(script);
  }, []);

  // Escucha los cambios en la sesión de Supabase
  useEffect(() => {
    if (!isSupabaseReady) {
      setLoading(false);
      return;
    }
    
    const getSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      setSession(session);
      if (session) {
        checkProfile(session.user.id);
      } else {
        setView('auth');
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkProfile(session.user.id);
      } else {
        setView('auth');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [isSupabaseReady]);

  // Manejar el chat en tiempo real
  useEffect(() => {
    if (view !== 'chat' || !supabaseClient) return;

    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabaseClient
        .from('messages')
        .select(`id, content, created_at, players (username)`)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        showMessage(error.message);
      } else {
        setMessages(data || []);
        scrollToBottom();
      }
      setLoading(false);
    };

    fetchMessages();

    const subscription = supabaseClient
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const newMessage = { ...payload.new, players: { username: playerData.username } };
        setMessages(prevMessages => [...prevMessages, newMessage]);
        scrollToBottom();
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(subscription);
    };
  }, [view, supabaseClient, playerData]);

  // Checks if the user already has a character created
  const checkProfile = async (userId) => {
    setLoading(true);
    try {
      const { data: player, error: playerError } = await supabaseClient
        .from('players')
        .select('*')
        .eq('id', userId)
        .single();

      if (playerError && playerError.code === "PGRST116") {
        setView('create_character');
        return;
      }
      if (playerError) throw playerError;

      const { data: skills, error: skillsError } = await supabaseClient
        .from('player_skills')
        .select('*')
        .eq('player_id', userId);
      if (skillsError) throw skillsError;

      const { data: playerItems, error: itemsError } = await supabaseClient
        .from('player_items')
        .select('*, items(*)')
        .eq('player_id', userId);
      if (itemsError) throw itemsError;

      const equipped = {};
      playerItems.forEach(item => {
        if (item.is_equipped) {
          equipped[item.items.skill_bonus] = item.items;
        }
      });
      setInventory(playerItems);
      setEquippedItems(equipped);

      setSkills(skills.reduce((acc, skill) => ({ ...acc, [skill.skill_name]: skill.skill_value }), {}));
      setAvailablePoints(player.skill_points);
      setLupiCoins(player.lupi_coins);
      setPlayerData({ ...player, skills });
      setView('dashboard');
    } catch (err) {
      showMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('players')
        .select('username, level, experience')
        .order('level', { ascending: false })
        .order('experience', { ascending: false })
        .limit(10);
      if (error) throw error;
      setLeaderboardData(data);
    } catch (err) {
      showMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMissions = async () => {
    setLoading(true);
    try {
      const { data: missions, error: missionsError } = await supabaseClient
        .from('missions')
        .select('*');
      if (missionsError) throw missionsError;

      const { data: completedMissions, error: completedError } = await supabaseClient
        .from('player_missions')
        .select('mission_id')
        .eq('player_id', session.user.id);
      if (completedError) throw completedError;

      const completedIds = new Set(completedMissions.map(m => m.mission_id));
      const mergedMissions = missions.map(mission => ({
        ...mission,
        is_completed: completedIds.has(mission.id)
      }));
      setMissionsData(mergedMissions);
      showMessage('Misiones cargadas.');
    } catch (err) {
      showMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteMission = async (mission) => {
    if (mission.is_completed) {
      showMessage('Esta misión ya ha sido completada.');
      return;
    }
    setLoading(true);
    try {
      const { error: insertError } = await supabaseClient
        .from('player_missions')
        .insert([{ player_id: session.user.id, mission_id: mission.id }]);
      if (insertError) throw insertError;

      const { data: updatedPlayer, error: updateError } = await supabaseClient
        .from('players')
        .update({
          experience: playerData.experience + mission.xp_reward,
          skill_points: playerData.skill_points + mission.skill_points_reward
        })
        .eq('id', session.user.id)
        .select();
      if (updateError) throw updateError;

      setPlayerData(prev => ({
        ...prev,
        experience: prev.experience + mission.xp_reward,
        skill_points: prev.skill_points + mission.skill_points_reward
      }));
      setAvailablePoints(prev => prev + mission.skill_points_reward);
      setMissionsData(prev => prev.map(m =>
        m.id === mission.id ? { ...m, is_completed: true } : m
      ));
      showMessage(`¡Misión completada! Ganaste ${mission.xp_reward} XP y ${mission.skill_points_reward} puntos de habilidad.`);
    } catch (err) {
      showMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!supabaseClient) {
      showMessage('Supabase client not available.');
      return;
    }
    setLoading(true);
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      showMessage(error.message);
    } else {
      showMessage('Inicio de sesión exitoso. Redirigiendo...');
    }
    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!supabaseClient) {
      showMessage('Supabase client not available.');
      return;
    }
    setLoading(true);
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) {
      showMessage(error.message);
    } else {
      showMessage('Registro exitoso. Revisa tu correo electrónico para confirmar.');
    }
    setLoading(false);
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!supabaseClient || !session) {
      showMessage('Supabase client or session not available.');
      return;
    }
    setLoading(true);
    try {
      const { data: existingUser, error: userCheckError } = await supabaseClient
        .from('players')
        .select('username')
        .eq('username', username)
        .single();
      if (existingUser) {
        throw new Error('El nombre de usuario ya existe. Por favor, elige otro.');
      }
      if (userCheckError && userCheckError.code !== "PGRST116") {
        throw userCheckError;
      }

      const { data: playerData, error: playerError } = await supabaseClient
        .from('players')
        .insert([{
          id: session.user.id,
          level: 1,
          experience: 0,
          position,
          sport,
          skill_points: availablePoints,
          username,
          lupi_coins: 100
        }])
        .select();
      if (playerError) throw playerError;

      const skillInserts = Object.entries(skills).map(([skill_name, skill_value]) => ({
        player_id: session.user.id,
        skill_name,
        skill_value,
      }));
      const { data: skillsData, error: skillsError } = await supabaseClient
        .from('player_skills')
        .insert(skillInserts)
        .select();
      if (skillsError) throw skillsError;

      showMessage('Personaje creado con éxito. ¡Bienvenido a Lupi App!');
      setPlayerData({ ...playerData[0], skills: skillsData });
      setView('dashboard');
    } catch (err) {
      showMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkillChange = (skill, value) => {
    const newPoints = availablePoints - value;
    if (newPoints >= 0) {
      setAvailablePoints(newPoints);
      setSkills(prev => ({ ...prev, [skill]: prev[skill] + value }));
    } else {
      showMessage('No tienes suficientes puntos de habilidad.');
    }
  };

  const handleUpgradeSkill = async (skill_name) => {
    if (playerData.skill_points <= 0) {
      showMessage('No tienes puntos de habilidad para gastar.');
      return;
    }
    setLoading(true);
    try {
      const currentSkill = playerData.skills.find(s => s.skill_name === skill_name);
      if (!currentSkill) throw new Error("Habilidad no encontrada.");

      const { data: updatedSkill, error: skillError } = await supabaseClient
        .from('player_skills')
        .update({ skill_value: currentSkill.skill_value + 1 })
        .eq('player_id', session.user.id)
        .eq('skill_name', skill_name)
        .select();
      if (skillError) throw skillError;

      const { data: updatedPlayer, error: playerError } = await supabaseClient
        .from('players')
        .update({ skill_points: playerData.skill_points - 1 })
        .eq('id', session.user.id)
        .select();
      if (playerError) throw playerError;

      setPlayerData(prev => ({
        ...prev,
        skill_points: prev.skill_points - 1,
        skills: prev.skills.map(s => s.skill_name === skill_name ? { ...s, skill_value: s.skill_value + 1 } : s)
      }));
      setAvailablePoints(prev => prev - 1);
      showMessage(`Habilidad "${skill_name}" mejorada con éxito.`);
    } catch (err) {
      showMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGainXp = async () => {
    setLoading(true);
    try {
      const xpGained = 10;
      const coinsGained = 5;
      const currentXp = playerData.experience;
      const nextLevelRequirement = playerData.level * 100;
      
      let newLevel = playerData.level;
      let newSkillPoints = playerData.skill_points;
      let newXp = currentXp + xpGained;
      let newCoins = playerData.lupi_coins + coinsGained;

      let levelUpMessage = '';
      if (newXp >= nextLevelRequirement) {
        newLevel++;
        newXp = newXp - nextLevelRequirement;
        newSkillPoints += 5;
        levelUpMessage = `¡Felicidades! Subiste al nivel ${newLevel}. Ganaste 5 puntos de habilidad. `;
      }

      const { data, error } = await supabaseClient
        .from('players')
        .update({
          level: newLevel,
          experience: newXp,
          skill_points: newSkillPoints,
          lupi_coins: newCoins
        })
        .eq('id', session.user.id)
        .select();
      if (error) throw error;
      
      setPlayerData(prev => ({ ...prev, ...data[0] }));
      setAvailablePoints(data[0].skill_points);
      setLupiCoins(data[0].lupi_coins);
      showMessage(`${levelUpMessage}Ganaste ${xpGained} XP y ${coinsGained} LupiCoins.`);
    } catch (err) {
      showMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFindItem = async () => {
    setLoading(true);
    try {
      const { data: allItems, error: itemsError } = await supabaseClient
        .from('items')
        .select('*');
      if (itemsError) throw itemsError;

      if (allItems.length === 0) {
        showMessage("No hay objetos disponibles para encontrar. Por favor, añade algunos en la tabla 'items'.");
        return;
      }
      
      const randomItem = allItems[Math.floor(Math.random() * allItems.length)];
      const { data, error } = await supabaseClient
        .from('player_items')
        .insert([{ player_id: session.user.id, item_id: randomItem.id }])
        .select('*, items(*)')
        .single();
      if (error) throw error;

      setInventory(prev => [...prev, data]);
      showMessage(`¡Has encontrado un nuevo objeto: ${randomItem.name}!`);
    } catch (err) {
      showMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEquipItem = async (playerItemId, skillBonus) => {
    setLoading(true);
    try {
      const currentEquippedItem = inventory.find(item => item.is_equipped && item.items.skill_bonus === skillBonus);
      if (currentEquippedItem) {
        await supabaseClient
          .from('player_items')
          .update({ is_equipped: false })
          .eq('id', currentEquippedItem.id);
      }
      
      await supabaseClient
        .from('player_items')
        .update({ is_equipped: true })
        .eq('id', playerItemId);

      const updatedInventory = inventory.map(item => {
        if (item.id === playerItemId) {
          return { ...item, is_equipped: true };
        }
        if (currentEquippedItem && item.id === currentEquippedItem.id) {
          return { ...item, is_equipped: false };
        }
        return item;
      });

      const updatedEquipped = {};
      updatedInventory.forEach(item => {
        if (item.is_equipped) {
          updatedEquipped[item.items.skill_bonus] = item.items;
        }
      });
      setInventory(updatedInventory);
      setEquippedItems(updatedEquipped);
      showMessage("¡Objeto equipado con éxito!");
    } catch (err) {
      showMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnequipItem = async (playerItemId) => {
    setLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('player_items')
        .update({ is_equipped: false })
        .eq('id', playerItemId)
        .select('*, items(*)')
        .single();
      if (error) throw error;
      
      const updatedInventory = inventory.map(item =>
        item.id === playerItemId ? { ...item, is_equipped: false } : item
      );
      
      const updatedEquipped = { ...equippedItems };
      const unequippedSkillBonus = data.items.skill_bonus;
      delete updatedEquipped[unequippedSkillBonus];
      
      setInventory(updatedInventory);
      setEquippedItems(updatedEquipped);
      showMessage("¡Objeto desequipado con éxito!");
    } catch (err) {
      showMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTransferCoins = async (e) => {
    e.preventDefault();
    setLoading(true);
    const amount = parseInt(transferAmount);
    const recipientUsername = recipientAddress.endsWith('.lupi') ? recipientAddress.slice(0, -5) : recipientAddress;

    if (isNaN(amount) || amount <= 0) {
      showMessage('Por favor, ingresa una cantidad válida y positiva.');
      setLoading(false);
      return;
    }
    if (recipientUsername === playerData.username) {
      showMessage('No puedes transferirte monedas a ti mismo.');
      setLoading(false);
      return;
    }
    try {
      const { data: recipient, error: recipientError } = await supabaseClient
        .from('players')
        .select('id')
        .eq('username', recipientUsername)
        .single();
      if (recipientError) {
        if (recipientError.code === "PGRST116") {
          showMessage('El usuario destinatario no existe.');
        } else {
          showMessage(recipientError.message);
        }
        setLoading(false);
        return;
      }

      const { error: rpcError } = await supabaseClient.rpc('transfer_lupicoins', {
        sender_id: session.user.id,
        receiver_id: recipient.id,
        amount: amount
      });
      if (rpcError) throw rpcError;

      const newLupiCoins = playerData.lupi_coins - amount;
      setLupiCoins(newLupiCoins);
      setPlayerData(prev => ({ ...prev, lupi_coins: newLupiCoins }));
      showMessage(`Transferencia de ${amount} LupiCoins a ${recipientUsername} exitosa.`);
      setRecipientAddress('');
      setTransferAmount('');
    } catch (err) {
      showMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketItems = async () => {
    setLoading(true);
    try {
      const { data: listings, error } = await supabaseClient
        .from('market_listings')
        .select(`id, price, seller_id, created_at, player_item_id, player_items (items (name, skill_bonus, bonus_value)), players (username)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMarketItems(listings);
      showMessage('Objetos del mercado cargados.');
    } catch (err) {
      showMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyItem = async (listing) => {
    setLoading(true);
    if (playerData.lupi_coins < listing.price) {
      showMessage('No tienes suficientes LupiCoins para comprar este objeto.');
      setLoading(false);
      return;
    }
    if (playerData.id === listing.seller_id) {
      showMessage('No puedes comprar tu propio objeto.');
      setLoading(false);
      return;
    }
    try {
      const { error: transferError } = await supabaseClient.rpc('transfer_lupicoins', {
        sender_id: session.user.id,
        receiver_id: listing.seller_id,
        amount: listing.price
      });
      if (transferError) throw transferError;

      const { error: ownershipError } = await supabaseClient
        .from('player_items')
        .update({ player_id: session.user.id, is_equipped: false })
        .eq('id', listing.player_item_id);
      if (ownershipError) throw ownershipError;
      
      const { error: deleteError } = await supabaseClient
        .from('market_listings')
        .delete()
        .eq('id', listing.id);
      if (deleteError) throw deleteError;

      const newLupiCoins = playerData.lupi_coins - listing.price;
      setLupiCoins(newLupiCoins);
      setPlayerData(prev => ({ ...prev, lupi_coins: newLupiCoins }));
      checkProfile(session.user.id);
      fetchMarketItems();
      showMessage(`¡Has comprado ${listing.player_items.items.name} por ${listing.price} LupiCoins!`);
    } catch (err) {
      showMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSellItem = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (!itemToSell || !sellPrice) {
      showMessage('Selecciona un objeto y un precio para venderlo.');
      setLoading(false);
      return;
    }
    const price = parseInt(sellPrice);
    if (isNaN(price) || price <= 0) {
      showMessage('El precio debe ser un número positivo.');
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabaseClient
        .from('market_listings')
        .insert([{
          player_item_id: itemToSell.id,
          seller_id: session.user.id,
          price: price
        }]);
      if (error) throw error;
      
      const updatedInventory = inventory.filter(item => item.id !== itemToSell.id);
      setInventory(updatedInventory);
      showMessage(`¡Objeto listado en el mercado por ${price} LupiCoins!`);
      setView('market');
      fetchMarketItems();
    } catch (err) {
      showMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !session) return;
    setLoading(true);
    try {
      const { error } = await supabaseClient
        .from('messages')
        .insert({
          content: newMessage,
          sender_id: session.user.id
        });
      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      showMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const ThemedButton = ({ onClick, disabled, icon, children, className = '' }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`themed-button ${className}`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );

  const renderAuth = () => (
    <div className="app-container">
      <div className="card auth-card">
        <h2 className="card-title">LUPI APP</h2>
        {message && <div className="message-box">{message}</div>}
        <form onSubmit={handleLogin} className="form-container">
          <input
            type="email"
            placeholder="Correo Electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
          />
          <ThemedButton type="submit" disabled={loading} icon={<LogIn size={20} />} className="button-full-width">
            {loading ? 'Cargando...' : 'Iniciar Sesión'}
          </ThemedButton>
        </form>
        <button
          onClick={handleSignup}
          disabled={loading}
          className="secondary-button button-full-width"
        >
          <UserPlus size={20} />
          {loading ? 'Cargando...' : 'Registrarse'}
        </button>
      </div>
    </div>
  );

  const renderCreateCharacter = () => (
    <div className="app-container">
      <div className="card character-card">
        <h2 className="card-title">Crea Tu Personaje</h2>
        {message && <div className="message-box">{message}</div>}
        <form onSubmit={handleCreateAccount} className="form-container">
          <div>
            <label className="form-label">Nombre de Usuario</label>
            <input
              type="text"
              placeholder="Nombre de Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <div>
            <label className="form-label">Deporte</label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="form-input"
            >
              {sports.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Posición</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="form-input"
            >
              {positions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="skills-assignment-box">
            <h4 className="skills-assignment-title">Asignar Puntos de Habilidad</h4>
            <p className="skills-points-available">Puntos disponibles: {availablePoints}</p>
            <div className="skills-grid">
              {Object.entries(skills).map(([skillName, skillValue]) => (
                <div key={skillName} className="skill-item">
                  <span>{skillName}: <span className="skill-value">{skillValue}</span></span>
                  <button
                    type="button"
                    onClick={() => handleSkillChange(skillName, 1)}
                    disabled={availablePoints <= 0}
                    className="skill-button"
                  >
                    <ChevronUp size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <ThemedButton type="submit" disabled={loading || availablePoints > 0} className="button-full-width button-success">
            {loading ? 'Cargando...' : 'Crear Personaje'}
          </ThemedButton>
        </form>
      </div>
    </div>
  );

  const renderDashboard = () => {
    const nextLevelXp = playerData?.level * 100 || 100;
    const xpPercentage = playerData ? (playerData.experience / nextLevelXp) * 100 : 0;
  
    return (
      <div className="app-container">
        <div className="card dashboard-card">
          <h2 className="card-title">Dashboard</h2>
          {message && <div className="message-box">{message}</div>}
          {playerData ? (
            <div className="dashboard-content">
              <div className="info-card">
                <h3 className="info-card-title"><Star size={20} /> Información del Jugador</h3>
                <p>Usuario: <span className="info-value">{playerData.username}</span></p>
                <p>Nivel: <span className="info-value">{playerData.level}</span></p>
                <p>Deporte: <span className="info-value">{playerData.sport}</span></p>
                <p>Posición: <span className="info-value">{playerData.position}</span></p>
                <div className="wallet-info">
                  <Wallet size={16} />
                  <span>Dirección: {playerData.username}.lupi</span>
                  <span className="lupi-coins-balance">
                    <DollarSign size={16} />{lupiCoins}
                  </span>
                </div>
                <div className="xp-bar-container">
                  <p className="xp-bar-label">Experiencia ({playerData.experience}/{nextLevelXp})</p>
                  <div className="xp-bar-background">
                    <div className="xp-bar-progress" style={{ width: `${xpPercentage}%` }}></div>
                  </div>
                </div>
              </div>
  
              <div className="info-card">
                <h3 className="info-card-title"><Trophy size={20} /> Habilidades</h3>
                <p className="skills-points-available">Puntos disponibles: <span className="points-value">{playerData.skill_points}</span></p>
                <div className="dashboard-skills-grid">
                  {playerData.skills.map(skill => {
                    const bonusItem = equippedItems[skill.skill_name];
                    const bonus = bonusItem ? bonusItem.bonus_value : 0;
                    const totalValue = skill.skill_value + bonus;
                    return (
                      <div key={skill.skill_name} className="dashboard-skill-item">
                        <span>{skill.skill_name}:</span>
                        <div className="skill-controls">
                          <span className="skill-total-value">{totalValue}</span>
                          {bonus > 0 && <span className="skill-bonus-value">(+{bonus})</span>}
                          <button
                            onClick={() => handleUpgradeSkill(skill.skill_name)}
                            disabled={loading || playerData.skill_points <= 0}
                            className="skill-button"
                          >
                            <ChevronUp size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="dashboard-actions">
                <ThemedButton onClick={handleGainXp} disabled={loading} icon={<Zap size={20} />} className="button-success">Entrenar</ThemedButton>
                <ThemedButton onClick={() => { fetchMarketItems(); setView('market'); }} disabled={loading} icon={<ShoppingCart size={20} />} className="button-warning">Mercado</ThemedButton>
                <ThemedButton onClick={() => setView('transfer')} disabled={loading} icon={<CornerUpRight size={20} />} className="button-purple">Transferir</ThemedButton>
                <ThemedButton onClick={handleFindItem} disabled={loading} icon={<Compass size={20} />}>Buscar Objeto</ThemedButton>
                <ThemedButton onClick={() => { fetchMissions(); setView('missions'); }} disabled={loading} icon={<CircleCheck size={20} />}>Misiones</ThemedButton>
                <ThemedButton onClick={() => { fetchLeaderboard(); setView('leaderboard'); }} disabled={loading} icon={<Users size={20} />}>Clasificación</ThemedButton>
                <ThemedButton onClick={() => setView('inventory')} disabled={loading} icon={<Backpack size={20} />}>Inventario</ThemedButton>
                <ThemedButton onClick={() => setView('chat')} disabled={loading} icon={<MessageCircleMore size={20} />}>Chat</ThemedButton>
                <button onClick={() => supabaseClient.auth.signOut()} className="themed-button button-danger">
                  <LogOut size={20} />
                  Salir
                </button>
              </div>
            </div>
          ) : (
            <p>Cargando datos del jugador...</p>
          )}
        </div>
      </div>
    );
  };

  const renderLeaderboard = () => (
    <div className="app-container">
      <div className="card leaderboard-card">
        <h2 className="card-title">Clasificación</h2>
        {message && <div className="message-box">{message}</div>}
        {loading ? (
          <p>Cargando clasificación...</p>
        ) : (
          <div>
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre</th>
                  <th>Nivel</th>
                  <th>XP</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.length > 0 ? (
                  leaderboardData.map((player, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{player.username}</td>
                      <td>{player.level}</td>
                      <td>{player.experience}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4">No hay datos en la clasificación.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="card-footer">
              <ThemedButton onClick={() => setView('dashboard')} icon={<ChevronDown size={20} />}>Volver</ThemedButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderInventory = () => (
    <div className="app-container">
      <div className="card inventory-card">
        <h2 className="card-title">Inventario</h2>
        {message && <div className="message-box">{message}</div>}
        <div className="inventory-grid">
          {inventory.length > 0 ? (
            inventory.map(item => (
              <div key={item.id} className="inventory-item-card">
                <h3>{item.items.name}</h3>
                <p>Bonificación: {item.items.skill_bonus} <span className="bonus-value">+{item.items.bonus_value}</span></p>
                <div className="inventory-item-actions">
                  {!item.is_equipped ? (
                    <ThemedButton onClick={() => handleEquipItem(item.id, item.items.skill_bonus)} disabled={loading} icon={<Swords size={16} />}>Equipar</ThemedButton>
                  ) : (
                    <ThemedButton onClick={() => handleUnequipItem(item.id)} disabled={loading} icon={<Backpack size={16} />} className="button-danger">Desequipar</ThemedButton>
                  )}
                  <ThemedButton onClick={() => { setItemToSell(item); setSellPrice(''); setView('sell_item'); }} disabled={item.is_equipped || loading} icon={<DollarSign size={16} />} className="button-warning">Vender</ThemedButton>
                </div>
              </div>
            ))
          ) : (
            <div className="inventory-empty">
              <p>Tu inventario está vacío.</p>
            </div>
          )}
        </div>
        <div className="card-footer">
          <ThemedButton onClick={() => setView('dashboard')} icon={<ChevronDown size={20} />}>Volver</ThemedButton>
        </div>
      </div>
    </div>
  );

  const renderMissions = () => (
    <div className="app-container">
      <div className="card missions-card">
        <h2 className="card-title">Misiones</h2>
        {message && <div className="message-box">{message}</div>}
        {loading ? (
          <p>Cargando misiones...</p>
        ) : (
          <div className="missions-list">
            {missionsData.length > 0 ? (
              missionsData.map(mission => (
                <div key={mission.id} className="mission-item-card">
                  <h3>{mission.name}</h3>
                  <p>{mission.description}</p>
                  <p className="mission-reward">Recompensa: <span className="reward-value">{mission.xp_reward} XP</span> y <span className="reward-value">{mission.skill_points_reward} puntos</span></p>
                  <ThemedButton
                    onClick={() => handleCompleteMission(mission)}
                    disabled={mission.is_completed || loading}
                    icon={<CircleCheck size={20} />}
                    className={`button-full-width ${mission.is_completed ? 'button-success' : ''}`}
                  >
                    {mission.is_completed ? 'Misión Completada' : 'Completar Misión'}
                  </ThemedButton>
                </div>
              ))
            ) : (
              <p>No hay misiones disponibles.</p>
            )}
            <div className="card-footer">
              <ThemedButton onClick={() => setView('dashboard')} icon={<ChevronDown size={20} />}>Volver</ThemedButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderTransferCoins = () => (
    <div className="app-container">
      <div className="card transfer-card">
        <h2 className="card-title">Transferir Lupi Coins</h2>
        {message && <div className="message-box">{message}</div>}
        <p className="balance-text">Tu saldo: <span className="lupi-coins-balance">{lupiCoins}</span> Lupi Coins</p>
        <form onSubmit={handleTransferCoins} className="form-container">
          <div>
            <label className="form-label">Dirección del Destinatario</label>
            <div className="address-input-group">
              <input
                type="text"
                placeholder="nombredeusuario"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="form-input"
                required
              />
              <span className="address-suffix">.lupi</span>
            </div>
          </div>
          <div>
            <label className="form-label">Cantidad a Transferir</label>
            <input
              type="number"
              placeholder="100"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <ThemedButton type="submit" disabled={loading} icon={<CornerUpRight size={20} />} className="button-full-width button-purple">
            {loading ? 'Transfiriendo...' : 'Confirmar Transferencia'}
          </ThemedButton>
        </form>
        <div className="card-footer">
          <ThemedButton onClick={() => setView('dashboard')} icon={<ChevronDown size={20} />}>Volver</ThemedButton>
        </div>
      </div>
    </div>
  );

  const renderMarket = () => (
    <div className="app-container">
      <div className="card market-card">
        <h2 className="card-title">Mercado</h2>
        {message && <div className="message-box">{message}</div>}
        <div className="market-header">
          <ThemedButton onClick={() => { setView('sell_item'); }} icon={<DollarSign size={16} />} className="button-warning">Vender Objeto</ThemedButton>
        </div>
        {loading ? (
          <p>Cargando mercado...</p>
        ) : (
          <div className="market-grid">
            {marketItems.length > 0 ? (
              marketItems.map(listing => (
                <div key={listing.id} className="market-item-card">
                  <h3>{listing.player_items.items.name}</h3>
                  <p>Bonificación: {listing.player_items.items.skill_bonus} <span className="bonus-value">+{listing.player_items.items.bonus_value}</span></p>
                  <p>Vendedor: <span className="seller-name">{listing.players.username}</span></p>
                  <div className="market-item-footer">
                    <span className="item-price"><Wallet size={16} />{listing.price} Lupi Coins</span>
                    <ThemedButton onClick={() => handleBuyItem(listing)} disabled={loading || playerData.id === listing.seller_id} icon={<ShoppingCart size={16} />} className="button-success">Comprar</ThemedButton>
                  </div>
                </div>
              ))
            ) : (
              <div className="market-empty">
                <p>No hay objetos en el mercado.</p>
              </div>
            )}
          </div>
        )}
        <div className="card-footer">
          <ThemedButton onClick={() => setView('dashboard')} icon={<ChevronDown size={20} />}>Volver</ThemedButton>
        </div>
      </div>
    </div>
  );

  const renderSellItem = () => {
    const availableForSale = inventory.filter(item => !marketItems.some(listing => listing.player_item_id === item.id));
    return (
      <div className="app-container">
        <div className="card sell-item-card">
          <h2 className="card-title">Vender Objeto</h2>
          {message && <div className="message-box">{message}</div>}
          <form onSubmit={handleSellItem} className="form-container">
            <div>
              <label className="form-label">Selecciona un Objeto</label>
              <select onChange={(e) => { const selectedItem = availableForSale.find(item => String(item.id) === e.target.value); setItemToSell(selectedItem); }} value={itemToSell ? itemToSell.id : ''} className="form-input" required>
                <option value="" disabled>-- Elige un objeto --</option>
                {availableForSale.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.items.name} (+{item.items.bonus_value} {item.items.skill_bonus})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Precio de Venta (LupiCoins)</label>
              <input type="number" placeholder="100" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} className="form-input" required />
            </div>
            <ThemedButton type="submit" disabled={loading} icon={<DollarSign size={20} />} className="button-full-width button-warning">
              {loading ? 'Listando...' : 'Poner en venta'}
            </ThemedButton>
          </form>
          <div className="card-footer">
            <ThemedButton onClick={() => setView('market')} icon={<ChevronDown size={20} />}>Volver al Mercado</ThemedButton>
          </div>
        </div>
      </div>
    );
  };
  
  const renderChat = () => (
    <div className="app-container">
      <div className="card chat-card">
        <h2 className="card-title">Chat Global</h2>
        <div className="chat-messages-container">
          {loading && <p>Cargando mensajes...</p>}
          {messages.map((message) => (
            <div key={message.id} className="chat-message">
              <span className="chat-username">{message.players?.username || 'Usuario Desconocido'}:</span>
              <span className="chat-content">{message.content}</span>
              <div className="chat-timestamp">{new Date(message.created_at).toLocaleTimeString()}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="chat-form">
          <input
            type="text"
            placeholder="Escribe un mensaje..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="form-input"
            required
          />
          <ThemedButton type="submit" disabled={loading} icon={<CornerUpRight size={20} />}>Enviar</ThemedButton>
        </form>
        <div className="card-footer">
          <ThemedButton onClick={() => setView('dashboard')} icon={<ChevronDown size={20} />}>Volver</ThemedButton>
        </div>
      </div>
    </div>
  );

  if (loading && !isSupabaseReady) {
    return (
      <div className="app-container">
        <p className="loading-text">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="main-background">
      {(() => {
        switch (view) {
          case 'auth': return renderAuth();
          case 'create_character': return renderCreateCharacter();
          case 'leaderboard': return renderLeaderboard();
          case 'inventory': return renderInventory();
          case 'missions': return renderMissions();
          case 'transfer': return renderTransferCoins();
          case 'market': return renderMarket();
          case 'sell_item': return renderSellItem();
          case 'chat': return renderChat();
          case 'dashboard':
          default: return renderDashboard();
        }
      })()}
    </div>
  );
};

export default App;
