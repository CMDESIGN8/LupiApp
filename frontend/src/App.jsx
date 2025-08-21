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

// Se carga la biblioteca de Supabase desde un CDN.
const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

// Usar una variable global para el cliente de Supabase para asegurar que solo se cree una instancia.
let supabaseClient = null;

// Valores para las listas desplegables, ahora en español.
const positions = ['Arquero', 'Defensa', 'Mediocampista', 'Delantero', 'Neutro'];
const sports = ['Fútbol', 'Voley', 'Handball', 'Hockey', 'Rugby', 'Fitness'];
const skillNames = ["Fuerza", "Resistencia", "Técnica", "Velocidad", "Dribling", "Pase", "Tiro", "Defensa", "Liderazgo", "Estrategia", "Inteligencia"];
const initialSkillPoints = 5;

const App = () => {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('auth'); // 'auth', 'create_character', 'dashboard', 'leaderboard', 'inventory', 'missions', 'transfer', 'market', 'sell_item', 'chat'
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [sport, setSport] = useState(sports[0]);
  const [position, setPosition] = useState(positions[0]);
  const [availablePoints, setAvailablePoints] = useState(initialSkillPoints);
  const [skills, setSkills] = useState(skillNames.reduce((acc, skill) => ({ ...acc, [skill]: 50 }), {}));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSupabaseReady, setIsSupabaseReady] = useState(false);
  const [playerData, setPlayerData] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [equippedItems, setEquippedItems] = useState({});
  const [missionsData, setMissionsData] = useState([]);
  const [lupiCoins, setLupiCoins] = useState(0);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  // Nuevo estado para el mercado
  const [marketItems, setMarketItems] = useState([]);
  const [itemToSell, setItemToSell] = useState(null);
  const [sellPrice, setSellPrice] = useState('');
  // Nuevo estado para el chat
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  // Inicializa el cliente de Supabase y carga el script del CDN una sola vez.
  useEffect(() => {
    // If client already exists, do nothing.
    if (supabaseClient) {
      setIsSupabaseReady(true);
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
        setIsSupabaseReady(true);
      }
    };
    script.onerror = () => {
      setError('Failed to load Supabase script.');
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
        setError(error.message);
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

  // Verifica si el usuario ya tiene un personaje creado
  const checkProfile = async (userId) => {
    setLoading(true);
    const { data: player, error: playerError } = await supabaseClient
      .from('players')
      .select('*')
      .eq('id', userId)
      .single();

    if (playerError && playerError.code === "PGRST116") {
      // No player found, proceed to character creation
      setLoading(false);
      setView('create_character');
      return;
    }
    if (playerError) {
      setError(playerError.message);
      setLoading(false);
      return;
    }

    if (player) {
      // Player found, fetch skills and display dashboard
      const { data: skills, error: skillsError } = await supabaseClient
        .from('player_skills')
        .select('*')
        .eq('player_id', userId);

      if (skillsError) {
        setError(skillsError.message);
        setLoading(false);
        return;
      }
      
      // Fetch inventory and equipped items
      const { data: playerItems, error: itemsError } = await supabaseClient
        .from('player_items')
        .select('*, items(*)')
        .eq('player_id', userId);

      if (itemsError) {
        setError(itemsError.message);
        setLoading(false);
        return;
      }

      const equipped = {};
      playerItems.forEach(item => {
        if (item.is_equipped) {
          equipped[item.items.skill_bonus] = item.items;
        }
      });
      setInventory(playerItems);
      setEquippedItems(equipped);

      // Update local state with fetched data
      setSkills(skills.reduce((acc, skill) => ({ ...acc, [skill.skill_name]: skill.skill_value }), {}));
      setAvailablePoints(player.skill_points);
      setLupiCoins(player.lupi_coins);
      setPlayerData({ ...player, skills });
      setView('dashboard');
    } else {
      setView('create_character');
    }
    setLoading(false);
  };

  // Función para obtener los datos de la tabla de clasificación
  const fetchLeaderboard = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabaseClient
        .from('players')
        .select('username, level, experience')
        .order('level', { ascending: false })
        .order('experience', { ascending: false })
        .limit(10); // Limitar a los 10 mejores jugadores

      if (error) throw error;
      setLeaderboardData(data);
      setSuccess('Clasificación cargada con éxito.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMissions = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch all available missions
      const { data: missions, error: missionsError } = await supabaseClient
        .from('missions')
        .select('*');
      if (missionsError) throw missionsError;
  
      // Fetch the player's completed missions
      const { data: completedMissions, error: completedError } = await supabaseClient
        .from('player_missions')
        .select('mission_id')
        .eq('player_id', session.user.id);
      if (completedError) throw completedError;
  
      const completedIds = new Set(completedMissions.map(m => m.mission_id));
  
      // Merge data and set local state
      const mergedMissions = missions.map(mission => ({
        ...mission,
        is_completed: completedIds.has(mission.id)
      }));
  
      setMissionsData(mergedMissions);
      setSuccess('Misiones cargadas con éxito.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteMission = async (mission) => {
    if (mission.is_completed) {
      setError('Esta misión ya ha sido completada.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Insert a new record in player_missions
      const { error: insertError } = await supabaseClient
        .from('player_missions')
        .insert([{ player_id: session.user.id, mission_id: mission.id }]);
      if (insertError) throw insertError;

      // 2. Update player's XP and skill points
      const { data: updatedPlayer, error: updateError } = await supabaseClient
        .from('players')
        .update({
          experience: playerData.experience + mission.xp_reward,
          skill_points: playerData.skill_points + mission.skill_points_reward
        })
        .eq('id', session.user.id)
        .select();
      if (updateError) throw updateError;
      
      // 3. Update local state
      setPlayerData(prev => ({
        ...prev,
        experience: prev.experience + mission.xp_reward,
        skill_points: prev.skill_points + mission.skill_points_reward
      }));
      setAvailablePoints(prev => prev + mission.skill_points_reward);
      setMissionsData(prev => prev.map(m =>
        m.id === mission.id ? { ...m, is_completed: true } : m
      ));
      
      setSuccess(`¡Misión completada! Ganaste ${mission.xp_reward} XP y ${mission.skill_points_reward} puntos de habilidad.`);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!supabaseClient) {
      setError('Supabase client not available.');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Inicio de sesión exitoso. Redirigiendo...');
    }
    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!supabaseClient) {
      setError('Supabase client not available.');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Registro exitoso. Revisa tu correo electrónico para confirmar.');
    }
    setLoading(false);
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!supabaseClient || !session) {
      setError('Supabase client or session not available.');
      return;
    }
    setLoading(true);
    setError('');
  
    try {
      // 1. Check if the username is already taken
      const { data: existingUser, error: userCheckError } = await supabaseClient
        .from('players')
        .select('username')
        .eq('username', username)
        .single();

      if (existingUser) {
        throw new Error('El nombre de usuario ya existe. Por favor, elige otro.');
      }
      if (userCheckError && userCheckError.code !== "PGRST116") { // PGRST116 means no rows found
        throw userCheckError;
      }

      // 2. Crear el registro del jugador
      const { data: playerData, error: playerError } = await supabaseClient
        .from('players')
        .insert([
          {
            id: session.user.id,
            level: 1, // Start at level 1
            experience: 0, // Start with 0 experience
            position,
            sport,
            skill_points: availablePoints, // Usar los puntos disponibles en la creación
            username,
            lupi_coins: 100 // Nuevo: Inicializar con 100 LupiCoins
          }
        ])
        .select();
  
      if (playerError) throw playerError;
  
      // 3. Crear los registros de las habilidades del jugador
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
  
      setSuccess('Personaje creado con éxito. ¡Bienvenido a Lupi App!');
      // Update state to trigger dashboard view
      setPlayerData({ ...playerData[0], skills: skillsData });
      setView('dashboard');
    } catch (err) {
      setError(err.message);
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
      setError('No tienes suficientes puntos de habilidad.');
    }
  };

  const handleUpgradeSkill = async (skill_name) => {
    if (playerData.skill_points <= 0) {
      setError('No tienes puntos de habilidad para gastar.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Incrementar el valor de la habilidad en la base de datos
      const currentSkill = playerData.skills.find(s => s.skill_name === skill_name);
      if (!currentSkill) throw new Error("Habilidad no encontrada.");

      const { data: updatedSkill, error: skillError } = await supabaseClient
        .from('player_skills')
        .update({ skill_value: currentSkill.skill_value + 1 })
        .eq('player_id', session.user.id)
        .eq('skill_name', skill_name)
        .select();

      if (skillError) throw skillError;

      // 2. Decrementar los puntos de habilidad disponibles del jugador
      const { data: updatedPlayer, error: playerError } = await supabaseClient
        .from('players')
        .update({ skill_points: playerData.skill_points - 1 })
        .eq('id', session.user.id)
        .select();

      if (playerError) throw playerError;

      // 3. Actualizar el estado local para reflejar los cambios
      setPlayerData(prev => ({
        ...prev,
        skill_points: prev.skill_points - 1,
        skills: prev.skills.map(s => s.skill_name === skill_name ? { ...s, skill_value: s.skill_value + 1 } : s)
      }));
      setAvailablePoints(prev => prev - 1);
      setSuccess(`Habilidad "${skill_name}" mejorada con éxito.`);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGainXp = async () => {
    setLoading(true);
    setError('');

    try {
      // Logic for gaining XP and LupiCoins
      const xpGained = 10; // Example: Gain 10 XP per click
      const coinsGained = 5; // New: Gain 5 LupiCoins per click
      const currentXp = playerData.experience;
      const nextLevelRequirement = playerData.level * 100; // Example: Level 2 requires 100 XP, Level 3 requires 200 XP, etc.
      
      let newLevel = playerData.level;
      let newSkillPoints = playerData.skill_points;
      let newXp = currentXp + xpGained;
      let newCoins = playerData.lupi_coins + coinsGained;

      if (newXp >= nextLevelRequirement) {
        newLevel++;
        newXp = newXp - nextLevelRequirement; // Reset XP to the remainder
        newSkillPoints += 5; // Reward 5 skill points for leveling up
        setSuccess(`¡Felicidades! Subiste al nivel ${newLevel}. Ganaste 5 puntos de habilidad.`);
      }

      // Update player data in the database
      const { data, error } = await supabaseClient
        .from('players')
        .update({
          level: newLevel,
          experience: newXp,
          skill_points: newSkillPoints,
          lupi_coins: newCoins // Actualizar los LupiCoins
        })
        .eq('id', session.user.id)
        .select();

      if (error) throw error;
      
      // Update local state
      setPlayerData(prev => ({ ...prev, ...data[0] }));
      setAvailablePoints(data[0].skill_points);
      setLupiCoins(data[0].lupi_coins);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFindItem = async () => {
    setLoading(true);
    setError('');
    try {
      // Obtener un objeto al azar de la tabla 'items'
      const { data: allItems, error: itemsError } = await supabaseClient
        .from('items')
        .select('*');
      if (itemsError) throw itemsError;

      if (allItems.length === 0) {
        setError("No hay objetos disponibles para encontrar. Por favor, añade algunos en la tabla 'items'.");
        return;
      }
      
      const randomItem = allItems[Math.floor(Math.random() * allItems.length)];

      // Insertar el objeto encontrado en la tabla 'player_items'
      const { data, error } = await supabaseClient
        .from('player_items')
        .insert([{ player_id: session.user.id, item_id: randomItem.id }])
        .select('*, items(*)')
        .single();
      
      if (error) throw error;

      setInventory(prev => [...prev, data]);
      setSuccess(`¡Has encontrado un nuevo objeto: ${randomItem.name}!`);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEquipItem = async (playerItemId, skillBonus) => {
    setLoading(true);
    setError('');

    try {
      // Desequipar cualquier otro objeto que dé bonificación a la misma habilidad
      const currentEquippedItem = inventory.find(item => item.is_equipped && item.items.skill_bonus === skillBonus);
      if (currentEquippedItem) {
        await supabaseClient
          .from('player_items')
          .update({ is_equipped: false })
          .eq('id', currentEquippedItem.id);
      }
      
      // Equipar el nuevo objeto
      await supabaseClient
        .from('player_items')
        .update({ is_equipped: true })
        .eq('id', playerItemId);

      // Actualizar el estado del inventario y los objetos equipados
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

      setSuccess("¡Objeto equipado con éxito!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Lógica de transferencia corregida con Supabase RPC
  const handleTransferCoins = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
  
    const amount = parseInt(transferAmount);
    const recipientUsername = recipientAddress.endsWith('.lupi') ? recipientAddress.slice(0, -5) : recipientAddress;
  
    if (isNaN(amount) || amount <= 0) {
      setError('Por favor, ingresa una cantidad válida y positiva.');
      setLoading(false);
      return;
    }
  
    if (recipientUsername === playerData.username) {
      setError('No puedes transferirte monedas a ti mismo.');
      setLoading(false);
      return;
    }
  
    try {
      // Paso 1: Buscar el ID del destinatario por su nombre de usuario
      const { data: recipient, error: recipientError } = await supabaseClient
        .from('players')
        .select('id')
        .eq('username', recipientUsername)
        .single();
  
      if (recipientError) {
        if (recipientError.code === "PGRST116") {
          setError('El usuario destinatario no existe.');
        } else {
          setError(recipientError.message);
        }
        setLoading(false);
        return;
      }
  
      // Paso 2: Llamar a la función atómica de la base de datos
      const { error: rpcError } = await supabaseClient.rpc('transfer_lupicoins', {
        sender_id: session.user.id,
        receiver_id: recipient.id,
        amount: amount
      });
  
      if (rpcError) throw rpcError;
  
      // Paso 3: Actualizar el estado local (asume que la transacción fue exitosa)
      const newLupiCoins = playerData.lupi_coins - amount;
      setLupiCoins(newLupiCoins);
      setPlayerData(prev => ({ ...prev, lupi_coins: newLupiCoins }));
      setSuccess(`Transferencia de ${amount} LupiCoins a ${recipientUsername} exitosa.`);
      setRecipientAddress('');
      setTransferAmount('');
  
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketItems = async () => {
    setLoading(true);
    setError('');
    try {
      // Consulta corregida para seguir la relación: market_listings -> player_items -> items
      const { data: listings, error } = await supabaseClient
        .from('market_listings')
        .select(`
          id,
          price,
          seller_id,
          created_at,
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
      setSuccess('Objetos del mercado cargados.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyItem = async (listing) => {
    setLoading(true);
    setError('');
    
    if (playerData.lupi_coins < listing.price) {
      setError('No tienes suficientes LupiCoins para comprar este objeto.');
      setLoading(false);
      return;
    }
    
    // Check if the buyer is also the seller.
    if (playerData.id === listing.seller_id) {
      setError('No puedes comprar tu propio objeto.');
      setLoading(false);
      return;
    }

    try {
      // 1. Transferir LupiCoins del comprador al vendedor
      const { error: transferError } = await supabaseClient.rpc('transfer_lupicoins', {
        sender_id: session.user.id,
        receiver_id: listing.seller_id,
        amount: listing.price
      });
      
      if (transferError) throw transferError;

      // 2. Transferir la propiedad del objeto al comprador
      const { error: ownershipError } = await supabaseClient
        .from('player_items')
        .update({ player_id: session.user.id })
        .eq('id', listing.player_item_id);

      if (ownershipError) throw ownershipError;
      
      // 3. Eliminar el listing del mercado
      const { error: deleteError } = await supabaseClient
        .from('market_listings')
        .delete()
        .eq('id', listing.id);
        
      if (deleteError) throw deleteError;

      // 4. Actualizar el estado local
      const newLupiCoins = playerData.lupi_coins - listing.price;
      setLupiCoins(newLupiCoins);
      setPlayerData(prev => ({ ...prev, lupi_coins: newLupiCoins }));

      // Vuelve a cargar el inventario y el mercado para reflejar los cambios
      checkProfile(session.user.id);
      fetchMarketItems();
      
      setSuccess(`¡Has comprado ${listing.items.name} por ${listing.price} LupiCoins!`);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSellItem = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!itemToSell || !sellPrice) {
      setError('Selecciona un objeto y un precio para venderlo.');
      setLoading(false);
      return;
    }

    const price = parseInt(sellPrice);
    if (isNaN(price) || price <= 0) {
      setError('El precio debe ser un número positivo.');
      setLoading(false);
      return;
    }

    try {
      // 1. Insertar el objeto en la tabla de listings del mercado
      const { data, error } = await supabaseClient
        .from('market_listings')
        .insert([{
          player_item_id: itemToSell.id,
          seller_id: session.user.id,
          price: price
        }]);

      if (error) throw error;
      
      // 2. Actualizar el estado local para que el objeto no aparezca más en el inventario del jugador
      setInventory(inventory.filter(item => item.id !== itemToSell.id));
      
      setSuccess(`¡Objeto listado en el mercado por ${price} LupiCoins!`);
      // Vuelve a la vista de mercado
      setView('market');
      fetchMarketItems();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !session) return;
    
    setLoading(true);
    setError('');

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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderAuth = () => (
    <div className="font-inter flex flex-col items-center justify-center min-h-screen bg-[#0A192F] text-slate-200 p-4">
      <div className="w-full max-w-md p-8 bg-[#112240] rounded-3xl shadow-2xl border-2 border-transparent border-t-[#00BFFF]">
        <h2 className="text-4xl font-extrabold text-center mb-6 text-white tracking-wide">LUPI APP</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {success && <p className="text-emerald-400 text-center mb-4">{success}</p>}
        
        <form onSubmit={handleLogin} className="space-y-6">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 rounded-xl bg-[#0B1A30] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-[#00BFFF] transition duration-300"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 rounded-xl bg-[#0B1A30] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-[#00BFFF] transition duration-300"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#00BFFF] text-black font-bold py-4 rounded-xl hover:bg-opacity-90 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
          >
            <LogIn size={20} />
            {loading ? 'Cargando...' : 'Iniciar Sesión'}
          </button>
        </form>
        <button
          onClick={handleSignup}
          disabled={loading}
          className="w-full mt-4 flex items-center justify-center gap-2 bg-gray-700 text-slate-200 font-semibold py-4 rounded-xl hover:bg-gray-600 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
        >
          <UserPlus size={20} />
          {loading ? 'Cargando...' : 'Registrarse'}
        </button>
      </div>
    </div>
  );

  const renderCreateCharacter = () => (
    <div className="font-inter flex flex-col items-center justify-center min-h-screen bg-[#0A192F] text-slate-200 p-4">
      <div className="w-full max-w-xl p-8 bg-[#112240] rounded-3xl shadow-2xl border-2 border-transparent border-t-[#00BFFF]">
        <h2 className="text-3xl font-bold text-center mb-6 text-white">Crea tu Personaje</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {success && <p className="text-emerald-400 text-center mb-4">{success}</p>}
        
        <form onSubmit={handleCreateAccount} className="space-y-6">
          <div className="flex flex-col">
            <label className="text-slate-300 font-medium mb-1">Nombre de Usuario</label>
            <input
              type="text"
              placeholder="Nombre de usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#0B1A30] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-[#00BFFF]"
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="text-slate-300 font-medium mb-1">Deporte</label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#0B1A30] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-[#00BFFF]"
            >
              {sports.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          
          <div className="flex flex-col">
            <label className="text-slate-300 font-medium mb-1">Posición</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#0B1A30] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-[#00BFFF]"
            >
              {positions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          
          <div className="bg-[#0B1A30] p-4 rounded-xl border border-gray-700 shadow-inner">
            <h4 className="font-bold text-lg mb-2 text-white">Asignar Puntos de Habilidad</h4>
            <p className="text-sm text-slate-400 mb-4">Puntos disponibles: <span className="font-bold text-[#00BFFF]">{availablePoints}</span></p>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(skills).map(([skillName, skillValue]) => (
                <div key={skillName} className="flex items-center justify-between">
                  <span>{skillName}: {skillValue}</span>
                  <button
                    type="button"
                    onClick={() => handleSkillChange(skillName, 1)}
                    disabled={availablePoints <= 0}
                    className="bg-[#00BFFF] text-black w-8 h-8 rounded-full font-bold hover:bg-opacity-90 transition disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || availablePoints > 0}
            className="w-full bg-[#00BFFF] text-black font-bold py-4 rounded-xl hover:bg-opacity-90 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
          >
            {loading ? 'Cargando...' : 'Crear Personaje'}
          </button>
        </form>
      </div>
    </div>
  );

  const renderDashboard = () => {
    const nextLevelXp = playerData?.level * 100 || 100;
    const xpPercentage = playerData ? (playerData.experience / nextLevelXp) * 100 : 0;
  
    // Calcular las habilidades totales con las bonificaciones de los objetos equipados
    const totalSkills = playerData ? playerData.skills.reduce((acc, skill) => {
      const bonusItem = equippedItems[skill.skill_name];
      const bonus = bonusItem ? bonusItem.bonus_value : 0;
      acc[skill.skill_name] = skill.skill_value + bonus;
      return acc;
    }, {}) : {};

    return (
      <div className="font-inter flex flex-col items-center min-h-screen bg-[#0A192F] text-slate-200 p-4">
        <div className="w-full max-w-4xl p-8 bg-[#112240] rounded-3xl shadow-2xl border-2 border-transparent border-t-[#00BFFF]">
          <h2 className="text-4xl font-extrabold text-center mb-6 text-white tracking-wide">DASHBOARD</h2>
          {error && <p className="text-red-500 text-center mb-4">{error}</p>}
          {success && <p className="text-emerald-400 text-center mb-4">{success}</p>}
          {playerData ? (
            <div className="space-y-8">
              <div className="bg-[#0B1A30] p-6 rounded-3xl border border-gray-700 shadow-lg">
                <h3 className="text-2xl font-semibold mb-2 flex items-center gap-2 text-white">
                  <Star size={24} className="text-[#00BFFF]" /> Información del Jugador
                </h3>
                <p className="text-lg text-slate-300">
                  <span className="font-medium text-slate-200">Nombre:</span> {playerData.username}
                </p>
                <p className="text-lg text-slate-300">
                  <span className="font-medium text-slate-200">Nivel:</span> {playerData.level}
                </p>
                <div className="flex items-center gap-2 text-lg text-slate-300">
                  <Wallet size={20} className="text-yellow-400" />
                  <span className="font-medium text-slate-200">Billetera:</span> {playerData.username}.lupi
                  <span className="font-medium text-slate-200 ml-auto">LupiCoins:</span> {lupiCoins}
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium text-slate-400">
                    Experiencia ({playerData.experience}/{nextLevelXp})
                  </p>
                  <div className="w-full bg-gray-700 rounded-full h-3 mt-2 overflow-hidden">
                    <div
                      className="bg-[#00BFFF] h-full rounded-full transition-all duration-500 ease-in-out"
                      style={{ width: `${xpPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
  
              <div className="bg-[#0B1A30] p-6 rounded-3xl border border-gray-700 shadow-lg">
                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-white">
                  <Trophy size={24} className="text-[#00BFFF]" /> Habilidades
                </h3>
                <p className="text-md text-slate-400 mb-4">
                  Puntos disponibles: <span className="font-bold text-[#00BFFF]">{playerData.skill_points}</span>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playerData.skills.map(skill => {
                    const bonusItem = equippedItems[skill.skill_name];
                    const bonus = bonusItem ? bonusItem.bonus_value : 0;
                    const totalValue = skill.skill_value + bonus;
                    return (
                      <div key={skill.skill_name} className="flex justify-between items-center p-3 bg-[#112240] rounded-xl shadow-inner border border-gray-700">
                        <span className="font-medium text-slate-300">{skill.skill_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[#00BFFF] font-bold">{totalValue}</span>
                          {bonus > 0 && <span className="text-xs text-emerald-400">(+{bonus})</span>}
                          <button
                            onClick={() => handleUpgradeSkill(skill.skill_name)}
                            disabled={loading || playerData.skill_points <= 0}
                            className="bg-[#00BFFF] text-black w-8 h-8 rounded-full font-bold hover:bg-opacity-90 transition duration-300 disabled:opacity-50"
                          >
                            <ChevronUp size={16} className="mx-auto" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex flex-wrap justify-center mt-6 gap-4">
                <button
                  onClick={handleGainXp}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-[#00BFFF] text-black font-bold py-3 px-6 rounded-xl hover:bg-opacity-90 transition duration-300 disabled:opacity-50 transform hover:scale-105"
                >
                  <Zap size={20} />
                  {loading ? 'Entrenando...' : 'Entrenar (Ganar XP y LupiCoins)'}
                </button>
                <button
                  onClick={() => {
                    fetchMarketItems();
                    setView('market');
                  }}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-green-700 transition duration-300 disabled:opacity-50 transform hover:scale-105"
                >
                  <ShoppingCart size={20} />
                  Ir al Mercado
                </button>
                <button
                  onClick={() => setView('transfer')}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-purple-700 transition duration-300 disabled:opacity-50 transform hover:scale-105"
                >
                  <CornerUpRight size={20} />
                  Transferir LupiCoins
                </button>
                <button
                  onClick={handleFindItem}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-gray-700 text-slate-200 font-semibold py-3 px-6 rounded-xl hover:bg-gray-600 transition duration-300 disabled:opacity-50 transform hover:scale-105"
                >
                  <Backpack size={20} />
                  {loading ? 'Buscando...' : 'Buscar Equipamiento'}
                </button>
                <button
                  onClick={() => {
                    fetchMissions();
                    setView('missions');
                  }}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-gray-700 text-slate-200 font-semibold py-3 px-6 rounded-xl hover:bg-gray-600 transition duration-300 disabled:opacity-50 transform hover:scale-105"
                >
                  <CircleCheck size={20} />
                  Misiones
                </button>
                <button
                  onClick={() => {
                    fetchLeaderboard();
                    setView('leaderboard');
                  }}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-gray-700 text-slate-200 font-semibold py-3 px-6 rounded-xl hover:bg-gray-600 transition duration-300 disabled:opacity-50 transform hover:scale-105"
                >
                  <Users size={20} />
                  Ver Clasificación
                </button>
                <button
                  onClick={() => setView('inventory')}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-gray-700 text-slate-200 font-semibold py-3 px-6 rounded-xl hover:bg-gray-600 transition duration-300 disabled:opacity-50 transform hover:scale-105"
                >
                  <Backpack size={20} />
                  Ver Inventario
                </button>
                <button
                  onClick={() => setView('chat')}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-slate-500 text-white font-semibold py-3 px-6 rounded-xl hover:bg-slate-600 transition duration-300 disabled:opacity-50 transform hover:scale-105"
                >
                  <MessageCircleMore size={20} />
                  Chat
                </button>
                <button
                  onClick={() => supabaseClient.auth.signOut()}
                  className="flex items-center justify-center gap-2 bg-red-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-red-700 transition duration-300 disabled:opacity-50 transform hover:scale-105"
                >
                  <LogOut size={20} />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          ) : (
            <p className="text-center text-lg text-slate-400">Cargando datos del personaje...</p>
          )}
        </div>
      </div>
    );
  };

  const renderLeaderboard = () => (
    <div className="font-inter flex flex-col items-center min-h-screen bg-[#0A192F] text-slate-200 p-4">
      <div className="w-full max-w-2xl p-8 bg-[#112240] rounded-3xl shadow-2xl border-2 border-transparent border-t-[#00BFFF]">
        <h2 className="text-4xl font-extrabold text-center mb-6 text-white tracking-wide">CLASIFICACIÓN</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {success && <p className="text-emerald-400 text-center mb-4">{success}</p>}
        
        {loading ? (
          <p className="text-center text-lg text-slate-400">Cargando clasificación...</p>
        ) : (
          <div className="space-y-4">
            <table className="min-w-full bg-[#0B1A30] rounded-xl shadow-lg overflow-hidden border border-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="py-3 px-4 text-left font-bold text-[#00BFFF]">#</th>
                  <th className="py-3 px-4 text-left font-bold text-[#00BFFF]">Nombre</th>
                  <th className="py-3 px-4 text-left font-bold text-[#00BFFF]">Nivel</th>
                  <th className="py-3 px-4 text-left font-bold text-[#00BFFF]">XP</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.length > 0 ? (
                  leaderboardData.map((player, index) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-[#112240] transition duration-150">
                      <td className="py-3 px-4">{index + 1}</td>
                      <td className="py-3 px-4 font-medium text-slate-200">{player.username}</td>
                      <td className="py-3 px-4">{player.level}</td>
                      <td className="py-3 px-4">{player.experience}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-4 text-center text-slate-400">No hay datos en la clasificación.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setView('dashboard')}
                className="flex items-center gap-2 bg-gray-700 text-slate-200 font-semibold py-3 px-6 rounded-xl hover:bg-gray-600 transition duration-300 transform hover:scale-105"
              >
                <ChevronDown size={20} />
                Volver al Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderInventory = () => (
    <div className="font-inter flex flex-col items-center min-h-screen bg-[#0A192F] text-slate-200 p-4">
      <div className="w-full max-w-2xl p-8 bg-[#112240] rounded-3xl shadow-2xl border-2 border-transparent border-t-[#00BFFF]">
        <h2 className="text-4xl font-extrabold text-center mb-6 text-white tracking-wide">INVENTARIO</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {success && <p className="text-emerald-400 text-center mb-4">{success}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventory.length > 0 ? (
            inventory.map(item => (
              <div key={item.id} className="bg-[#0B1A30] p-4 rounded-xl border border-gray-700 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg text-[#00BFFF]">{item.items.name}</h3>
                  <p className="text-sm text-slate-400">Bonificación: {item.items.skill_bonus} +{item.items.bonus_value}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <button
                    onClick={() => handleEquipItem(item.id, item.items.skill_bonus)}
                    disabled={item.is_equipped || loading}
                    className={`flex-1 flex items-center justify-center gap-2 font-semibold py-2 rounded-xl transition duration-300 transform hover:scale-105 ${
                      item.is_equipped 
                        ? 'bg-emerald-500 text-white cursor-not-allowed opacity-75'
                        : 'bg-[#00BFFF] text-black hover:bg-opacity-90'
                    }`}
                  >
                    <Swords size={16} />
                    {item.is_equipped ? 'Equipado' : 'Equipar'}
                  </button>
                  <button
                    onClick={() => {
                      setItemToSell(item);
                      setSellPrice('');
                      setView('sell_item');
                    }}
                    disabled={item.is_equipped || loading}
                    className={`flex-1 flex items-center justify-center gap-2 font-semibold py-2 rounded-xl transition duration-300 transform hover:scale-105 ${
                      item.is_equipped 
                        ? 'bg-gray-500 text-white cursor-not-allowed opacity-75'
                        : 'bg-yellow-500 text-black hover:bg-yellow-600'
                    }`}
                  >
                    <DollarSign size={16} />
                    Vender
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <p className="text-lg text-slate-400">Tu inventario está vacío.</p>
              <p className="text-sm text-slate-500 mt-2">¡Ve al Dashboard y busca equipamiento!</p>
            </div>
          )}
        </div>
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setView('dashboard')}
            className="flex items-center gap-2 bg-gray-700 text-slate-200 font-semibold py-3 px-6 rounded-xl hover:bg-gray-600 transition duration-300 transform hover:scale-105"
          >
            <ChevronDown size={20} />
            Volver al Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  const renderMissions = () => (
    <div className="font-inter flex flex-col items-center min-h-screen bg-[#0A192F] text-slate-200 p-4">
      <div className="w-full max-w-2xl p-8 bg-[#112240] rounded-3xl shadow-2xl border-2 border-transparent border-t-[#00BFFF]">
        <h2 className="text-4xl font-extrabold text-center mb-6 text-white tracking-wide">MISIONES</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {success && <p className="text-emerald-400 text-center mb-4">{success}</p>}
        
        {loading ? (
          <p className="text-center text-lg text-slate-400">Cargando misiones...</p>
        ) : (
          <div className="space-y-4">
            {missionsData.length > 0 ? (
              missionsData.map(mission => (
                <div key={mission.id} className="bg-[#0B1A30] p-5 rounded-xl border border-gray-700 shadow-sm">
                  <h3 className="text-xl font-bold text-white">{mission.name}</h3>
                  <p className="text-slate-400 mt-1">{mission.description}</p>
                  <p className="text-sm text-[#00BFFF] font-semibold mt-2">
                    Recompensa: {mission.xp_reward} XP, {mission.skill_points_reward} Puntos de Habilidad
                  </p>
                  <button
                    onClick={() => handleCompleteMission(mission)}
                    disabled={mission.is_completed || loading}
                    className={`mt-4 w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition duration-300 transform hover:scale-105 ${
                      mission.is_completed
                        ? 'bg-emerald-500 text-white cursor-not-allowed opacity-75'
                        : 'bg-[#00BFFF] text-black hover:bg-opacity-90'
                    }`}
                  >
                    <CircleCheck size={20} />
                    {mission.is_completed ? 'Misión Completada' : 'Completar Misión'}
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-lg text-slate-400">No hay misiones disponibles.</p>
              </div>
            )}
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setView('dashboard')}
                className="flex items-center gap-2 bg-gray-700 text-slate-200 font-semibold py-3 px-6 rounded-xl hover:bg-gray-600 transition duration-300 transform hover:scale-105"
              >
                <ChevronDown size={20} />
                Volver al Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderTransferCoins = () => (
    <div className="font-inter flex flex-col items-center min-h-screen bg-[#0A192F] text-slate-200 p-4">
      <div className="w-full max-w-md p-8 bg-[#112240] rounded-3xl shadow-2xl border-2 border-transparent border-t-[#00BFFF]">
        <h2 className="text-4xl font-extrabold text-center mb-6 text-white tracking-wide">TRANSFERIR LUPI COINS</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {success && <p className="text-emerald-400 text-center mb-4">{success}</p>}

        <p className="text-center text-lg mb-4 text-slate-300">
          Tu Saldo: <span className="font-bold text-yellow-400">{lupiCoins}</span> LupiCoins
        </p>
        
        <form onSubmit={handleTransferCoins} className="space-y-6">
          <div className="flex flex-col">
            <label className="text-slate-300 font-medium mb-1">Dirección del Destinatario</label>
            <div className="flex rounded-xl bg-[#0B1A30] border border-gray-700 text-white focus-within:ring-2 focus-within:ring-[#00BFFF] transition duration-300">
              <input
                type="text"
                placeholder="nombredeusuario"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="w-full p-4 bg-transparent focus:outline-none"
                required
              />
              <span className="p-4 bg-[#112240] border-l border-gray-700 rounded-r-xl">.lupi</span>
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-slate-300 font-medium mb-1">Cantidad a Transferir</label>
            <input
              type="number"
              placeholder="100"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              className="w-full p-4 rounded-xl bg-[#0B1A30] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-[#00BFFF] transition duration-300"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-4 rounded-xl hover:bg-purple-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
          >
            <CornerUpRight size={20} />
            {loading ? 'Transfiriendo...' : 'Confirmar Transferencia'}
          </button>
        </form>

        <div className="flex justify-center mt-6">
          <button
            onClick={() => setView('dashboard')}
            className="flex items-center gap-2 bg-gray-700 text-slate-200 font-semibold py-3 px-6 rounded-xl hover:bg-gray-600 transition duration-300 transform hover:scale-105"
          >
            <ChevronDown size={20} />
            Volver al Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  const renderMarket = () => (
    <div className="font-inter flex flex-col items-center min-h-screen bg-[#0A192F] text-slate-200 p-4">
      <div className="w-full max-w-4xl p-8 bg-[#112240] rounded-3xl shadow-2xl border-2 border-transparent border-t-[#00BFFF]">
        <h2 className="text-4xl font-extrabold text-center mb-6 text-white tracking-wide">MERCADO DE OBJETOS</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {success && <p className="text-emerald-400 text-center mb-4">{success}</p>}

        <div className="flex justify-end mb-4 gap-2">
          <button
            onClick={() => {
              // Filtrar el inventario para encontrar items que no están ya en el mercado
              const availableForSale = inventory.filter(item => !marketItems.some(listing => listing.player_item_id === item.id));
              setInventory(availableForSale);
              setView('sell_item');
            }}
            className="flex items-center justify-center gap-2 bg-yellow-500 text-black font-semibold py-2 px-4 rounded-xl hover:bg-yellow-600 transition duration-300 transform hover:scale-105"
          >
            <DollarSign size={16} />
            Vender un Objeto
          </button>
        </div>

        {loading ? (
          <p className="text-center text-lg text-slate-400">Cargando mercado...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketItems.length > 0 ? (
              marketItems.map(listing => (
                <div key={listing.id} className="bg-[#0B1A30] p-4 rounded-xl border border-gray-700 shadow-sm flex flex-col">
                  {/* Acceso a los datos del objeto corregido */}
                  <h3 className="font-bold text-lg text-white">{listing.player_items.items.name}</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Bonificación: {listing.player_items.items.skill_bonus} +{listing.player_items.items.bonus_value}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    Vendedor: <span className="font-medium text-[#00BFFF]">{listing.players.username}</span>
                  </p>
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <span className="text-xl font-bold text-yellow-400 flex items-center gap-1">
                      <Wallet size={20} />
                      {listing.price}
                    </span>
                    <button
                      onClick={() => handleBuyItem(listing)}
                      disabled={loading || playerData.id === listing.seller_id}
                      className="flex items-center gap-2 bg-green-600 text-white font-semibold py-2 px-4 rounded-xl hover:bg-green-700 transition duration-300 disabled:opacity-50"
                    >
                      <ShoppingCart size={16} />
                      Comprar
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-lg text-slate-400">No hay objetos en el mercado.</p>
                <p className="text-sm text-slate-500 mt-2">¡Sé el primero en vender algo!</p>
              </div>
            )}
          </div>
        )}
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setView('dashboard')}
            className="flex items-center gap-2 bg-gray-700 text-slate-200 font-semibold py-3 px-6 rounded-xl hover:bg-gray-600 transition duration-300 transform hover:scale-105"
          >
            <ChevronDown size={20} />
            Volver al Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  const renderSellItem = () => (
    <div className="font-inter flex flex-col items-center min-h-screen bg-[#0A192F] text-slate-200 p-4">
      <div className="w-full max-w-md p-8 bg-[#112240] rounded-3xl shadow-2xl border-2 border-transparent border-t-[#00BFFF]">
        <h2 className="text-4xl font-extrabold text-center mb-6 text-white tracking-wide">VENDER OBJETO</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {success && <p className="text-emerald-400 text-center mb-4">{success}</p>}

        <form onSubmit={handleSellItem} className="space-y-6">
          <div className="flex flex-col">
            <label className="text-slate-300 font-medium mb-1">Selecciona un Objeto</label>
            <select
              onChange={(e) => {
                const selectedItem = inventory.find(item => item.id === e.target.value);
                setItemToSell(selectedItem);
              }}
              value={itemToSell ? itemToSell.id : ''}
              className="w-full p-4 rounded-xl bg-[#0B1A30] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-[#00BFFF] transition duration-300"
              required
            >
              <option value="" disabled>-- Elige un objeto --</option>
              {inventory.filter(item => !item.is_equipped).map(item => (
                <option key={item.id} value={item.id}>
                  {item.items.name} (+{item.items.bonus_value} {item.items.skill_bonus})
                </option>
              ))}
            </select>
            {itemToSell && (
              <p className="mt-2 text-sm text-slate-400">
                El objeto seleccionado no puede estar equipado para ser vendido.
              </p>
            )}
          </div>

          <div className="flex flex-col">
            <label className="text-slate-300 font-medium mb-1">Precio en LupiCoins</label>
            <input
              type="number"
              placeholder="100"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              className="w-full p-4 rounded-xl bg-[#0B1A30] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-[#00BFFF] transition duration-300"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !itemToSell || !sellPrice || itemToSell.is_equipped}
            className="w-full flex items-center justify-center gap-2 bg-yellow-500 text-black font-bold py-4 rounded-xl hover:bg-yellow-600 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
          >
            <DollarSign size={20} />
            {loading ? 'Listando...' : 'Poner en Venta'}
          </button>
        </form>

        <div className="flex justify-center mt-6">
          <button
            onClick={() => {
              setView('market');
              fetchMarketItems();
            }}
            className="flex items-center gap-2 bg-gray-700 text-slate-200 font-semibold py-3 px-6 rounded-xl hover:bg-gray-600 transition duration-300 transform hover:scale-105"
          >
            <ChevronDown size={20} />
            Volver al Mercado
          </button>
        </div>
      </div>
    </div>
  );

  const renderChat = () => (
    <div className="font-inter flex flex-col h-screen bg-[#0A192F] text-slate-200 p-4">
      <div className="w-full max-w-4xl mx-auto p-6 bg-[#112240] rounded-3xl shadow-2xl border-2 border-transparent border-t-[#00BFFF] flex-grow flex flex-col">
        <h2 className="text-4xl font-extrabold text-center mb-6 text-white tracking-wide">CHAT GLOBAL</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {loading ? (
          <p className="text-center text-lg text-slate-400">Cargando mensajes...</p>
        ) : (
          <div className="flex-grow overflow-y-auto space-y-4 p-4 bg-[#0B1A30] rounded-xl border border-gray-700 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {messages.map((msg, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className="text-[#00BFFF] font-bold min-w-[100px] text-right">{msg.players.username}:</span>
                <p className="text-slate-200 flex-1">{msg.content}</p>
                <span className="text-xs text-slate-500 whitespace-nowrap">{new Date(msg.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
        <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe tu mensaje..."
            className="flex-grow p-3 rounded-xl bg-[#0B1A30] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-[#00BFFF]"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-[#00BFFF] text-black font-bold py-3 px-6 rounded-xl hover:bg-opacity-90 transition disabled:opacity-50"
          >
            Enviar
          </button>
        </form>
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setView('dashboard')}
            className="flex items-center gap-2 bg-gray-700 text-slate-200 font-semibold py-3 px-6 rounded-xl hover:bg-gray-600 transition duration-300 transform hover:scale-105"
          >
            <ChevronDown size={20} />
            Volver al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
  
  if (loading) {
    return (
      <div className="font-inter flex justify-center items-center min-h-screen bg-[#0A192F]">
        <div className="text-[#00BFFF] text-2xl font-bold animate-pulse">Cargando...</div>
      </div>
    );
  }

  return (
    <>
      {
        (() => {
          switch (view) {
            case 'auth':
              return renderAuth();
            case 'create_character':
              return renderCreateCharacter();
            case 'dashboard':
              return renderDashboard();
            case 'leaderboard':
              return renderLeaderboard();
            case 'inventory':
              return renderInventory();
            case 'missions':
              return renderMissions();
            case 'transfer':
              return renderTransferCoins();
            case 'market':
              return renderMarket();
            case 'sell_item':
              return renderSellItem();
            case 'chat':
              return renderChat();
            default:
              return null;
          }
        })()
      }
    </>
  );
};

export default App;
