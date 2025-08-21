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
  ChevronsUp,
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
import "./App.css"

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
    // If client already exists, do nothing.
    if (supabaseClient) {
      setIsSupabase(true);
      return;
    }

    const script = document.createElement('script');
    script.src = SUPABASE_CDN;
    script.onload = () => {
      // Create Supabase client only if the script has loaded.
      if (!supabaseClient) {
        // Supabase credentials provided by the user.
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
    
    // Intenta obtener la sesión actual al cargar
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

    // Suscribe a los cambios de autenticación
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

    // Fetch initial messages
    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabaseClient
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          players (
            username
          )
        `)
        .order('created_at', { ascending: true })
        .limit(50); // Fetch last 50 messages

      if (error) {
        showMessage(error.message);
      } else {
        setMessages(data || []);
        scrollToBottom();
      }
      setLoading(false);
    };

    fetchMessages();

    // Subscribe to new messages
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
        .insert([
          {
            id: session.user.id,
            level: 1,
            experience: 0,
            position,
            sport,
            skill_points: availablePoints,
            username,
            lupi_coins: 100
          }
        ])
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

  // NUEVA FUNCIÓN para desequipar un objeto
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
        .select(`
          id,
          price,
          seller_id,
          created_at,
          player_item_id,
          player_items (
            items (
              name,
              skill_bonus,
              bonus_value
            )
          ),
          players (
            username
          )
        `)
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

  // Componente de botón reutilizable con estilos del tema
  const ThemedButton = ({ onClick, disabled, icon, children, className = '' }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center justify-center gap-2 px-4 py-2 font-semibold
        rounded-md transition duration-300 transform
        bg-blue-600 text-white
        hover:bg-blue-500 hover:scale-105
        disabled:bg-gray-400 disabled:text-gray-600 disabled:transform-none
        ${className}
      `}
    >
      {icon}
      <span>{children}</span>
    </button>
  );

  const renderAuth = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-sans">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-xl border border-gray-300">
        <h2 className="text-3xl font-bold text-center mb-6 text-blue-600">LUPI APP</h2>
        {message && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-md mb-4" role="alert">
            {message}
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Correo Electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
          />
          <ThemedButton type="submit" disabled={loading} icon={<LogIn size={20} />} className="w-full">
            {loading ? 'Cargando...' : 'Iniciar Sesión'}
          </ThemedButton>
        </form>
        <button
          onClick={handleSignup}
          disabled={loading}
          className="w-full mt-4 flex items-center justify-center gap-2 p-2 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300 transition disabled:bg-gray-300"
        >
          <UserPlus size={20} />
          {loading ? 'Cargando...' : 'Registrarse'}
        </button>
      </div>
    </div>
  );

  const renderCreateCharacter = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-sans">
      <div className="w-full max-w-lg p-8 bg-white rounded-lg shadow-xl border border-gray-300">
        <h2 className="text-3xl font-bold text-center mb-6 text-blue-600">Crea Tu Personaje</h2>
        {message && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-md mb-4" role="alert">
            {message}
          </div>
        )}
        <form onSubmit={handleCreateAccount} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre de Usuario</label>
            <input
              type="text"
              placeholder="Nombre de Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Deporte</label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            >
              {sports.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Posición</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            >
              {positions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          
          <div className="bg-gray-100 p-4 rounded-md border border-gray-300">
            <h4 className="font-semibold mb-2 text-blue-600">Asignar Puntos de Habilidad</h4>
            <p className="text-sm text-gray-500 mb-4">Puntos disponibles: {availablePoints}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(skills).map(([skillName, skillValue]) => (
                <div key={skillName} className="flex items-center justify-between p-2 rounded-md bg-white">
                  <span className="text-gray-800">{skillName}: <span className="text-blue-600">{skillValue}</span></span>
                  <button
                    type="button"
                    onClick={() => handleSkillChange(skillName, 1)}
                    disabled={availablePoints <= 0}
                    className="ml-2 p-1 bg-blue-600 text-white rounded-full hover:bg-blue-500 disabled:bg-gray-400 disabled:text-gray-600 transition"
                  >
                    <ChevronUp size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <ThemedButton type="submit" disabled={loading || availablePoints > 0} className="w-full bg-green-600 hover:bg-green-500">
            {loading ? 'Cargando...' : 'Crear Personaje'}
          </ThemedButton>
        </form>
      </div>
    </div>
  );

  const renderDashboard = () => {
    const nextLevelXp = playerData?.level * 100 || 100;
    const xpPercentage = playerData ? (playerData.experience / nextLevelXp) * 100 : 0;
  
    const totalSkills = playerData ? playerData.skills.reduce((acc, skill) => {
      const bonusItem = equippedItems[skill.skill_name];
      const bonus = bonusItem ? bonusItem.bonus_value : 0;
      acc[skill.skill_name] = skill.skill_value + bonus;
      return acc;
    }, {}) : {};

    return (
      <div className="dashboard">
        <div className="w-full max-w-4xl p-8 bg-white rounded-lg shadow-xl border border-gray-300">
          <h2 className="text-3xl font-bold text-center mb-6 text-blue-600">Dashboard</h2>
          {message && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-md mb-4" role="alert">
              {message}
            </div>
          )}
          {playerData ? (
            <div className="section player-info">
              <div className="bg-gray-100 p-4 rounded-lg shadow-inner border border-gray-300">
                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2 text-blue-600">
                  <Star size={20} /> Información del Jugador
                </h3>
                <p>Usuario: <span className="text-blue-800">{playerData.username}</span></p>
                <p>Nivel: <span className="text-blue-800">{playerData.level}</span></p>
                <p>Deporte: <span className="text-blue-800">{playerData.sport}</span></p>
                <p>Posición: <span className="text-blue-800">{playerData.position}</span></p>
                <div className="flex items-center gap-2 mt-1">
                  <Wallet size={16} className="text-blue-800" />
                  <span className="text-gray-700">Dirección: {playerData.username}.lupi</span>
                  <span className="ml-auto text-amber-500 flex items-center gap-1">
                    <DollarSign size={16} />{lupiCoins}
                  </span>
                </div>
                <div className="exp-bar">
                  <p className="text-sm text-gray-500">
                    Experiencia ({playerData.experience}/{nextLevelXp})
                  </p>
                 
                    <div
                      className="exp-bar-fill"
                      style={{ width: `${xpPercentage}%` }}
                    ></div>
                  
                </div>
              </div>
  
              <div className="section">
                <h3 className="text-xl font-semibold flex items-center gap-2 mb-2 text-blue-600">
                  <Trophy size={20} /> Habilidades
                </h3>
                <p className="text-sm text-gray-500 mb-4">Puntos disponibles: <span className="text-green-600">{playerData.skill_points}</span></p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playerData.skills.map(skill => {
                    const bonusItem = equippedItems[skill.skill_name];
                    const bonus = bonusItem ? bonusItem.bonus_value : 0;
                    const totalValue = skill.skill_value + bonus;
                    return (
                      <div key={skill.skill_name} className="flex justify-between items-center p-2 bg-white rounded-md shadow-sm border border-gray-200">
                        <span className="text-gray-800">{skill.skill_name}:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600 font-bold">{totalValue}</span>
                          {bonus > 0 && <span className="text-xs text-green-600">(+{bonus})</span>}
                          <button
                            onClick={() => handleUpgradeSkill(skill.skill_name)}
                            disabled={loading || playerData.skill_points <= 0}
                            className="p-1 bg-blue-600 text-white rounded-full hover:bg-blue-500 disabled:bg-gray-400 disabled:text-gray-600 transition"
                          >
                            <ChevronUp size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex flex-wrap justify-center mt-6 gap-2">
                <ThemedButton onClick={handleGainXp} disabled={loading} icon={<Zap size={20} />} className="bg-green-600 hover:bg-green-500">
                  Entrenar
                </ThemedButton>
                <ThemedButton onClick={() => { fetchMarketItems(); setView('market'); }} disabled={loading} icon={<ShoppingCart size={20} />} className="bg-amber-500 hover:bg-amber-400">
                  Mercado
                </ThemedButton>
                <ThemedButton onClick={() => setView('transfer')} disabled={loading} icon={<CornerUpRight size={20} />} className="bg-purple-600 hover:bg-purple-500">
                  Transferir
                </ThemedButton>
                <ThemedButton onClick={handleFindItem} disabled={loading} icon={<Compass size={20} />}>
                  Buscar Objeto
                </ThemedButton>
                <ThemedButton onClick={() => { fetchMissions(); setView('missions'); }} disabled={loading} icon={<CircleCheck size={20} />}>
                  Misiones
                </ThemedButton>
                <ThemedButton onClick={() => { fetchLeaderboard(); setView('leaderboard'); }} disabled={loading} icon={<Users size={20} />}>
                  Clasificación
                </ThemedButton>
                <ThemedButton onClick={() => setView('inventory')} disabled={loading} icon={<Backpack size={20} />}>
                  Inventario
                </ThemedButton>
                <ThemedButton onClick={() => setView('chat')} disabled={loading} icon={<MessageCircleMore size={20} />}>
                  Chat
                </ThemedButton>
                <button
                  onClick={() => supabaseClient.auth.signOut()}
                  className="flex items-center gap-2 px-4 py-2 font-semibold rounded-md transition duration-300 transform bg-red-600 text-white hover:bg-red-500 hover:scale-105"
                >
                  <LogOut size={20} />
                  Salir
                </button>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500">Cargando datos del jugador...</p>
          )}
        </div>
      </div>
    );
  };

  const renderLeaderboard = () => (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4 font-sans">
      <div className="w-full max-w-4xl p-8 bg-white rounded-lg shadow-xl border border-gray-300">
        <h2 className="text-3xl font-bold text-center mb-6 text-blue-600">Clasificación</h2>
        {message && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-md mb-4" role="alert">
            {message}
          </div>
        )}
        {loading ? (
          <p className="text-center text-gray-500">Cargando clasificación...</p>
        ) : (
          <div>
            <table className="min-w-full bg-gray-100 border border-gray-300 rounded-md overflow-hidden">
              <thead className="bg-gray-200">
                <tr>
                  <th className="py-2 px-4 border-b border-gray-300 text-left">#</th>
                  <th className="py-2 px-4 border-b border-gray-300 text-left">Nombre</th>
                  <th className="py-2 px-4 border-b border-gray-300 text-left">Nivel</th>
                  <th className="py-2 px-4 border-b border-gray-300 text-left">XP</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.length > 0 ? (
                  leaderboardData.map((player, index) => (
                    <tr key={index} className="hover:bg-gray-200 transition duration-200">
                      <td className="py-2 px-4 border-b border-gray-300">{index + 1}</td>
                      <td className="py-2 px-4 border-b border-gray-300 text-blue-800">{player.username}</td>
                      <td className="py-2 px-4 border-b border-gray-300">{player.level}</td>
                      <td className="py-2 px-4 border-b border-gray-300">{player.experience}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-gray-500">No hay datos en la clasificación.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="flex justify-center mt-4">
              <ThemedButton onClick={() => setView('dashboard')} icon={<ChevronDown size={20} />}>
                Volver
              </ThemedButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderInventory = () => (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4 font-sans">
      <div className="w-full max-w-4xl p-8 bg-white rounded-lg shadow-xl border border-gray-300">
        <h2 className="text-3xl font-bold text-center mb-6 text-blue-600">Inventario</h2>
        {message && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-md mb-4" role="alert">
            {message}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventory.length > 0 ? (
            inventory.map(item => (
              <div key={item.id} className="bg-gray-100 p-4 rounded-lg shadow-inner border border-gray-300">
                <h3 className="text-lg font-semibold text-blue-600">{item.items.name}</h3>
                <p className="text-sm text-gray-500">Bonificación: {item.items.skill_bonus} <span className="text-green-600">+{item.items.bonus_value}</span></p>
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  {!item.is_equipped ? (
                    <ThemedButton
                      onClick={() => handleEquipItem(item.id, item.items.skill_bonus)}
                      disabled={loading}
                      icon={<Swords size={16} />}
                      className="flex-1 bg-blue-600 hover:bg-blue-500"
                    >
                      Equipar
                    </ThemedButton>
                  ) : (
                    <ThemedButton
                      onClick={() => handleUnequipItem(item.id)}
                      disabled={loading}
                      icon={<Backpack size={16} />}
                      className="flex-1 bg-red-600 hover:bg-red-500"
                    >
                      Desequipar
                    </ThemedButton>
                  )}
                  <ThemedButton
                    onClick={() => {
                      setItemToSell(item);
                      setSellPrice('');
                      setView('sell_item');
                    }}
                    disabled={item.is_equipped || loading}
                    icon={<DollarSign size={16} />}
                    className={`flex-1 bg-amber-500 hover:bg-amber-400 ${item.is_equipped ? 'disabled:bg-gray-400 disabled:text-gray-600' : ''}`}
                  >
                    Vender
                  </ThemedButton>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-500">Tu inventario está vacío.</p>
            </div>
          )}
        </div>
        <div className="flex justify-center mt-6">
          <ThemedButton onClick={() => setView('dashboard')} icon={<ChevronDown size={20} />}>
            Volver
          </ThemedButton>
        </div>
      </div>
    </div>
  );

  const renderMissions = () => (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4 font-sans">
      <div className="w-full max-w-4xl p-8 bg-white rounded-lg shadow-xl border border-gray-300">
        <h2 className="text-3xl font-bold text-center mb-6 text-blue-600">Misiones</h2>
        {message && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-md mb-4" role="alert">
            {message}
          </div>
        )}
        {loading ? (
          <p className="text-center text-gray-500">Cargando misiones...</p>
        ) : (
          <div className="space-y-4">
            {missionsData.length > 0 ? (
              missionsData.map(mission => (
                <div key={mission.id} className="bg-gray-100 p-4 rounded-lg shadow-inner border border-gray-300">
                  <h3 className="text-xl font-semibold text-blue-600">{mission.name}</h3>
                  <p className="text-gray-700">{mission.description}</p>
                  <p className="text-sm text-gray-500 mt-2">Recompensa: <span className="text-green-600">{mission.xp_reward} XP</span> y <span className="text-green-600">{mission.skill_points_reward} puntos de habilidad</span></p>
                  <ThemedButton
                    onClick={() => handleCompleteMission(mission)}
                    disabled={mission.is_completed || loading}
                    icon={<CircleCheck size={20} />}
                    className={`mt-4 w-full ${mission.is_completed ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                  >
                    {mission.is_completed ? 'Misión Completada' : 'Completar Misión'}
                  </ThemedButton>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No hay misiones disponibles.</p>
              </div>
            )}
            <div className="flex justify-center mt-6">
              <ThemedButton onClick={() => setView('dashboard')} icon={<ChevronDown size={20} />}>
                Volver
              </ThemedButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderTransferCoins = () => (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4 font-sans">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-xl border border-gray-300">
        <h2 className="text-3xl font-bold text-center mb-6 text-blue-600">Transferir Lupi Coins</h2>
        {message && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-md mb-4" role="alert">
            {message}
          </div>
        )}
        <p className="text-center mb-4 text-gray-700">Tu saldo: <span className="text-amber-500">{lupiCoins}</span> Lupi Coins</p>
        
        <form onSubmit={handleTransferCoins} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Dirección del Destinatario</label>
            <div className="flex mt-1">
              <input
                type="text"
                placeholder="nombredeusuario"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="flex-1 p-2 bg-gray-50 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                required
              />
              <span className="p-2 border-y border-r border-gray-300 bg-gray-200 text-gray-600 rounded-r-md">.lupi</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Cantidad a Transferir</label>
            <input
              type="number"
              placeholder="100"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              required
            />
          </div>

          <ThemedButton type="submit" disabled={loading} icon={<CornerUpRight size={20} />} className="w-full bg-purple-600 hover:bg-purple-500">
            {loading ? 'Transfiriendo...' : 'Confirmar Transferencia'}
          </ThemedButton>
        </form>

        <div className="flex justify-center mt-6">
          <ThemedButton onClick={() => setView('dashboard')} icon={<ChevronDown size={20} />}>
            Volver
          </ThemedButton>
        </div>
      </div>
    </div>
  );

  const renderMarket = () => (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4 font-sans">
      <div className="w-full max-w-5xl p-8 bg-white rounded-lg shadow-xl border border-gray-300">
        <h2 className="text-3xl font-bold text-center mb-6 text-blue-600">Mercado</h2>
        {message && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-md mb-4" role="alert">
            {message}
          </div>
        )}
        <div className="flex justify-end mb-4">
          <ThemedButton onClick={() => { setView('sell_item'); }} icon={<DollarSign size={16} />} className="bg-amber-500 hover:bg-amber-400">
            Vender Objeto
          </ThemedButton>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Cargando mercado...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketItems.length > 0 ? (
              marketItems.map(listing => (
                <div key={listing.id} className="bg-gray-100 p-4 rounded-lg shadow-inner border border-gray-300">
                  <h3 className="text-lg font-semibold text-blue-600">{listing.player_items.items.name}</h3>
                  <p className="text-sm text-gray-500">Bonificación: {listing.player_items.items.skill_bonus} <span className="text-green-600">+{listing.player_items.items.bonus_value}</span></p>
                  <p className="text-sm text-gray-500">Vendedor: <span className="text-blue-800">{listing.players.username}</span></p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-lg font-bold text-amber-500 flex items-center gap-1">
                      <Wallet size={16} />
                      {listing.price} Lupi Coins
                    </span>
                    <ThemedButton
                      onClick={() => handleBuyItem(listing)}
                      disabled={loading || playerData.id === listing.seller_id}
                      icon={<ShoppingCart size={16} />}
                      className="bg-green-600 hover:bg-green-500"
                    >
                      Comprar
                    </ThemedButton>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-500">No hay objetos en el mercado.</p>
              </div>
            )}
          </div>
        )}
        <div className="flex justify-center mt-6">
          <ThemedButton onClick={() => setView('dashboard')} icon={<ChevronDown size={20} />}>
            Volver
          </ThemedButton>
        </div>
      </div>
    </div>
  );

  const renderSellItem = () => {
    const availableForSale = inventory.filter(item => !marketItems.some(listing => listing.player_item_id === item.id));

    return (
      <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4 font-sans">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-xl border border-gray-300">
          <h2 className="text-3xl font-bold text-center mb-6 text-blue-600">Vender Objeto</h2>
          {message && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-md mb-4" role="alert">
              {message}
            </div>
          )}
          <form onSubmit={handleSellItem} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Selecciona un Objeto</label>
              <select
                onChange={(e) => {
                  const selectedItem = availableForSale.find(item => String(item.id) === e.target.value);
                  setItemToSell(selectedItem);
                }}
                value={itemToSell ? itemToSell.id : ''}
                className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                required
              >
                <option value="" disabled>-- Elige un objeto --</option>
                {availableForSale.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.items.name} (+{item.items.bonus_value} {item.items.skill_bonus})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Precio de Venta (LupiCoins)</label>
              <input
                type="number"
                placeholder="100"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                required
              />
            </div>
            
            <ThemedButton type="submit" disabled={loading} icon={<DollarSign size={20} />} className="w-full bg-amber-500 hover:bg-amber-400">
              {loading ? 'Listando...' : 'Poner en venta'}
            </ThemedButton>
          </form>

          <div className="flex justify-center mt-6">
            <ThemedButton onClick={() => setView('market')} icon={<ChevronDown size={20} />}>
              Volver al Mercado
            </ThemedButton>
          </div>
        </div>
      </div>
    );
  };
  
  const renderChat = () => (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4 font-sans">
      <div className="w-full max-w-4xl p-8 bg-white rounded-lg shadow-xl border border-gray-300 h-[80vh] flex flex-col">
        <h2 className="text-3xl font-bold text-center mb-6 text-blue-600">Chat Global</h2>
        
        <div className="flex-1 overflow-y-auto space-y-4 p-4 border border-gray-300 rounded-md bg-gray-100">
          {loading && <p className="text-center text-gray-500">Cargando mensajes...</p>}
          {messages.map((message) => (
            <div key={message.id} className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
              <span className="font-semibold text-blue-600">
                {message.players?.username || 'Usuario Desconocido'}:
              </span>
              <span className="text-gray-800 ml-2">{message.content}</span>
              <div className="text-right text-xs text-gray-500 mt-1">
                {new Date(message.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
          <input
            type="text"
            placeholder="Escribe un mensaje..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 p-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            required
          />
          <ThemedButton
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500"
            icon={<CornerUpRight size={20} />}
          >
            Enviar
          </ThemedButton>
        </form>

        <div className="flex justify-center mt-6">
          <ThemedButton onClick={() => setView('dashboard')} icon={<ChevronDown size={20} />}>
            Volver
          </ThemedButton>
        </div>
      </div>
    </div>
  );

  if (loading && !isSupabaseReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-sans">
        <p className="text-xl text-blue-600 animate-pulse">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
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
