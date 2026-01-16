import React, { useState, useEffect, useRef, useCallback } from 'react';
import socket from './services/socket';
import { Howl, Howler } from 'howler';
import CanvasMap from './components/CanvasMap';
import SidebarDM, { InitiativeItem } from './components/SidebarDM';
import SidebarPlayer from './components/SidebarPlayer';
import LoginScreen from './components/LoginScreen'; 
import { ChatMessage } from './components/Chat';
import EditEntityModal from './components/EditEntityModal';
import MonsterCreatorModal from './components/MonsterCreatorModal';

// --- IMPORTANDO AS REGRAS DE JOGO ---
import { getLevelFromXP } from './utils/gameRules';

const ROOM_ID = 'mesa-do-victor'; 
const GRID_SIZE = 70; // Tamanho padrão do grid
const CANVAS_WIDTH = 1920; 
const CANVAS_HEIGHT = 1080; 

export interface Entity {
  id: number;
  name: string;
  hp: number;
  maxHp: number;
  ac: number;
  x: number;
  y: number;
  rotation?: number; 
  mirrored?: boolean;
  conditions: string[]; 
  color: string;
  type: 'player' | 'enemy';
  image?: string;
  visionRadius?: number; 
  stats?: {
    str: number; dex: number; con: number; int: number; wis: number; cha: number;
  };
  classType?: string;
  size?: number; 
  
  xp?: number;
  level?: number;
}

export interface MonsterPreset {
  name: string;
  hp: number;
  ac: number;
  image: string;
  size?: number;
}

const InitiativeModal = ({ entity, onClose, onConfirm }: { entity: Entity, onClose: () => void, onConfirm: (val: number) => void }) => {
  const [manualValue, setManualValue] = useState('');
  const dexMod = entity.stats ? Math.floor((entity.stats.dex - 10) / 2) : 0;
  const modString = dexMod >= 0 ? `+${dexMod}` : `${dexMod}`;
  const handleAutoRoll = () => { const d20 = Math.floor(Math.random() * 20) + 1; onConfirm(d20 + dexMod); };
  const handleManualSubmit = (e: React.FormEvent) => { e.preventDefault(); const val = parseInt(manualValue); if (!isNaN(val)) onConfirm(val); };
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-yellow-600/50 p-6 rounded-lg shadow-2xl w-80 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center mb-4">
          <div className="w-16 h-16 rounded-full border-2 border-yellow-500 overflow-hidden mb-2 shadow-lg">
             {entity.image ? <img src={entity.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-gray-700" />}
          </div>
          <h3 className="text-yellow-500 font-bold text-lg uppercase tracking-widest text-center">{entity.name}</h3>
          <p className="text-gray-400 text-xs font-mono">Mod. Destreza: <span className="text-white">{modString}</span></p>
        </div>
        <button onClick={handleAutoRoll} className="w-full bg-yellow-700 hover:bg-yellow-600 text-white font-bold py-3 rounded mb-4 shadow-lg border border-yellow-500/30 flex justify-center items-center gap-2 transition-all active:scale-95"><span>🎲</span> Rolar (1d20 {modString})</button>
        <div className="relative flex items-center gap-2 mb-4"><div className="flex-grow h-px bg-white/10"></div><span className="text-xs text-gray-500 uppercase">Ou Manual</span><div className="flex-grow h-px bg-white/10"></div></div>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input type="number" placeholder="Valor" className="flex-1 bg-black/50 border border-white/20 rounded p-2 text-center text-white outline-none focus:border-yellow-500" value={manualValue} onChange={e => setManualValue(e.target.value)} autoFocus />
          <button type="submit" className="bg-gray-800 hover:bg-gray-700 text-white px-4 rounded border border-white/10">OK</button>
        </form>
      </div>
    </div>
  );
};

const DiceRoller = ({ playDiceSound, addLog }: { playDiceSound: () => void, addLog: (text: string, type: 'roll' | 'info' | 'damage' | 'chat', sender?: string) => void }) => {
  const [result, setResult] = useState<number | string>('--');
  const rollDice = (sides: number) => {
    const roll = Math.floor(Math.random() * sides) + 1;
    setResult(roll);
    playDiceSound();
    addLog(`Rolou 1d${sides}: [ ${roll} ]`, 'roll', 'Jogador');
    socket.emit('rollDice', { sides, result: roll, roomId: ROOM_ID, user: 'Player' });
  };
  return (
    <div className="bg-rpgPanel/90 border border-rpgAccent/30 rounded-lg p-4 w-32 h-auto flex flex-col items-center shadow-2xl backdrop-blur-sm">
      <span className="text-[8px] text-rpgText opacity-50 uppercase font-mono tracking-widest mb-2 text-center text-white/40">Painel de Dados</span>
      <div className="text-3xl font-bold text-rpgAccent my-2 font-mono drop-shadow-[0_0_8px_rgba(255,0,0,0.5)]">{result}</div>
      <div className="grid grid-cols-2 gap-2 w-full mt-2">
        <button onClick={() => rollDice(20)} className="bg-rpgAccent hover:bg-rpgAccent/80 text-white text-[10px] font-bold py-2 rounded transition-all active:scale-95 shadow-lg">d20</button>
        <button onClick={() => rollDice(6)} className="bg-rpgAccent/40 hover:bg-rpgAccent/60 text-white text-[10px] font-bold py-2 rounded transition-all active:scale-95 shadow-lg">d6</button>
      </div>
    </div>
  );
};

const createInitialFog = () => {
    const MAP_LIMIT = 8000; 
    const COLS = Math.ceil(MAP_LIMIT / GRID_SIZE);
    const ROWS = Math.ceil(MAP_LIMIT / GRID_SIZE);
    return Array(ROWS).fill(null).map(() => Array(COLS).fill(false));
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [role, setRole] = useState<'DM' | 'PLAYER'>('PLAYER'); 
  const [playerName, setPlayerName] = useState('');
  const [entities, setEntities] = useState<Entity[]>([]);
  const [fogGrid, setFogGrid] = useState<boolean[][]>(createInitialFog());
  const [isFogMode, setIsFogMode] = useState(false);
  const [fogTool, setFogTool] = useState<'reveal' | 'hide'>('reveal'); 
  const [currentMap, setCurrentMap] = useState('/maps/floresta.jpg');
  const [initiativeList, setInitiativeList] = useState<InitiativeItem[]>([]);
  const [activeTurnId, setActiveTurnId] = useState<number | null>(null);
  const [targetEntityIds, setTargetEntityIds] = useState<number[]>([]);
  const [attackerId, setAttackerId] = useState<number | null>(null);
  const [activeAoE, setActiveAoE] = useState<'circle' | 'cone' | 'cube' | null>(null);
  
  const [aoeColor, setAoEColor] = useState<string>('#ef4444'); 
  const [initModalEntity, setInitModalEntity] = useState<Entity | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  const [statusSelectionId, setStatusSelectionId] = useState<number | null>(null);
  // --- NOVO ESTADO: Controla qual entidade está sendo editada pelo Mestre ---
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);

  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [mapScale, setMapScale] = useState(1);
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  const [showAllyCreator, setShowAllyCreator] = useState(false);
  const [showEnemyCreator, setShowEnemyCreator] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const audioRefs = useRef({
    dado: new Howl({ src: ['/sfx/dado.mp3'], volume: 0.5, html5: true }),
    atmosfera: new Howl({ src: ['/sfx/suspense.mp3'], volume: 0.4, html5: true, preload: true, loop: true }),
    levelup: new Howl({ src: ['/sfx/levelup.mp3'], volume: 0.6, html5: true })
  });

  const playSound = useCallback((type: 'dado' | 'atmosfera' | 'levelup') => {
    if (Howler.ctx && Howler.ctx.state !== 'running') Howler.ctx.resume();
    const sound = audioRefs.current[type]; 
    if (!sound) { console.warn(`⚠️ Aviso: O som '${type}' não foi encontrado.`); return; }
    if (type === 'atmosfera') {
      if (sound.playing()) sound.stop(); else { Howler.stop(); sound.play(); }
    } else {
      sound.play();
    }
  }, []);

  const addLog = useCallback((text: string, type: 'info' | 'roll' | 'damage' | 'chat' = 'info', sender: string = 'Sistema', shouldEmit: boolean = true) => {
    const newMessage: ChatMessage = { id: Date.now().toString() + Math.random(), sender, text, type, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setChatMessages(prev => [...prev, newMessage]);
    if (shouldEmit) {
        socket.emit('sendMessage', { roomId: ROOM_ID, message: newMessage });
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return; 
    const joinRoom = () => { socket.emit('joinRoom', ROOM_ID); };
    joinRoom();
    socket.on('connect', joinRoom);
    socket.on('gameStateSync', (gameState) => {
      if (gameState.entities) setEntities(gameState.entities);
      if (gameState.fogGrid) setFogGrid(gameState.fogGrid);
      if (gameState.currentMap) setCurrentMap(gameState.currentMap);
      if (gameState.initiativeList) setInitiativeList(gameState.initiativeList);
      if (gameState.activeTurnId) setActiveTurnId(gameState.activeTurnId);
      if (gameState.chatHistory) setChatMessages(gameState.chatHistory);
    });
    socket.on('notification', (data) => { alert(data.message); });
    socket.on('newDiceResult', () => playSound('dado'));
    socket.on('chatMessage', (data) => {
        setChatMessages(prev => {
            if (prev.some(msg => msg.id === data.message.id)) return prev;
            return [...prev, data.message];
        });
    });
    socket.on('entityPositionUpdated', (data) => setEntities(prev => prev.map(ent => ent.id === data.entityId ? { ...ent, x: data.x, y: data.y } : ent)));
    socket.on('entityStatusUpdated', (data) => setEntities(prev => prev.map(ent => ent.id === data.entityId ? { ...ent, ...data.updates } : ent)));
    socket.on('entityCreated', (data) => setEntities(prev => { if (prev.find(e => e.id === data.entity.id)) return prev; return [...prev, data.entity]; }));
    socket.on('entityDeleted', (data) => {
        setEntities(prev => prev.filter(ent => ent.id !== data.entityId));
        if (statusSelectionId === data.entityId) setStatusSelectionId(null);
    });
    socket.on('mapChanged', (data) => { setCurrentMap(data.mapUrl); setFogGrid(data.fogGrid); });
    socket.on('fogUpdated', (data) => {
      setFogGrid(prev => {
        if (!prev || !prev[data.y]) return prev;
        const newGrid = prev.map(row => [...row]);
        newGrid[data.y][data.x] = data.shouldReveal;
        return newGrid;
      });
    });
    socket.on('fogGridSynced', (data) => setFogGrid(data.grid));
    socket.on('initiativeUpdated', (data) => { setInitiativeList(data.list); setActiveTurnId(data.activeTurnId); });
    socket.on('triggerAudio', (data) => { if (data.trackId === 'suspense') playSound('atmosfera'); });
    socket.on('mapStateUpdated', (data) => {
      if (role === 'PLAYER') {
          setMapOffset(data.offset);
          setMapScale(data.scale);
      }
    });

    return () => {
      socket.off('connect', joinRoom); socket.off('gameStateSync'); socket.off('notification'); socket.off('newDiceResult'); socket.off('chatMessage'); socket.off('entityPositionUpdated'); socket.off('entityStatusUpdated'); socket.off('entityCreated'); socket.off('entityDeleted'); socket.off('mapChanged'); socket.off('fogUpdated'); socket.off('fogGridSynced'); socket.off('initiativeUpdated'); socket.off('triggerAudio'); socket.off('mapStateUpdated');
    };
  }, [playSound, isLoggedIn, addLog, role, statusSelectionId]); 

  // --- ATUALIZA POSIÇÃO LOCAL (PAN/ZOOM) IMEDIATAMENTE PARA O STATUS ACOMPANHAR ---
  const handleMapSync = (offset: {x: number, y: number}, scale: number) => {
    setMapOffset(offset);
    setMapScale(scale);
    
    if (role === 'DM') {
        socket.emit('syncMapState', { roomId: ROOM_ID, offset, scale });
    }
  };

  const handleAttributeRoll = (charName: string, attrName: string, mod: number) => {
      const d20 = Math.floor(Math.random() * 20) + 1;
      const total = d20 + mod;
      const modLabel = mod >= 0 ? `+${mod}` : mod;
      addLog(`${charName} fez teste de ${attrName}: [ ${d20} ] ${modLabel} = ${total}`, 'roll', charName);
      playSound('dado');
  };

  const handleAddXP = (id: number, amount: number) => {
    const entity = entities.find(e => e.id === id);
    if (!entity || entity.type !== 'player') return;

    const oldXP = entity.xp || 0;
    const newXP = oldXP + amount;
    const oldLevel = entity.level || 1;
    const calculatedLevel = getLevelFromXP(newXP);

    setEntities(prev => prev.map(ent => ent.id === id ? { ...ent, xp: newXP } : ent));
    socket.emit('updateEntityStatus', { entityId: id, updates: { xp: newXP }, roomId: ROOM_ID });
    addLog(`${entity.name} ganhou ${amount} XP!`, 'info');
    
    if (calculatedLevel > oldLevel) {
        addLog(`✨ ${entity.name} está pronto para subir de nível!`, 'info');
        playSound('levelup'); 
    }
  };

  const handleUpdateHP = (id: number, change: number) => {
    const entity = entities.find(e => e.id === id);
    if (!entity) return;
    const newHp = Math.min(entity.maxHp, Math.max(0, entity.hp + change));
    if (change < 0) addLog(`💥 ${entity.name} tomou ${Math.abs(change)} de dano.`, 'damage');
    else if (change > 0) addLog(`💖 ${entity.name} curou ${change} PV.`, 'info');
    if (entity.hp > 0 && newHp <= 0) addLog(`☠️ ${entity.name} caiu inconsciente!`, 'damage');
    setEntities(prev => prev.map(ent => ent.id === id ? { ...ent, hp: newHp } : ent));
    socket.emit('updateEntityStatus', { entityId: id, updates: { hp: newHp }, roomId: ROOM_ID });
  };

  const handleSendMessage = (text: string) => {
      const senderName = role === 'DM' ? 'MESTRE' : playerName;
      const rollMatch = text.match(/^\/r\s+(\d+)d(\d+)(\+(\d+))?$/i);
      if (rollMatch) {
        const count = parseInt(rollMatch[1]);
        const sides = parseInt(rollMatch[2]);
        const mod = rollMatch[4] ? parseInt(rollMatch[4]) : 0;
        let rolls = [];
        let sum = 0;
        for(let i=0; i<count; i++) { const val = Math.floor(Math.random() * sides) + 1; rolls.push(val); sum += val; }
        const total = sum + mod;
        const rollString = `[${rolls.join(', ')}]` + (mod > 0 ? ` + ${mod}` : '');
        addLog(`🎲 Rolou ${count}d${sides}${mod ? '+'+mod : ''}: ${rollString} = **${total}**`, 'roll', senderName);
        playSound('dado');
      } else {
        addLog(text, 'chat', senderName);
      }
  };

  const handleUpdatePosition = (id: number, newX: number, newY: number) => {
    setEntities(prev => prev.map(ent => ent.id === id ? { ...ent, x: newX, y: newY } : ent));
    socket.emit('updateEntityPosition', { entityId: id, x: newX, y: newY, roomId: ROOM_ID });
  };
  const handleRotateToken = (id: number, angle: number) => {
    setEntities(prev => prev.map(ent => ent.id === id ? { ...ent, rotation: angle } : ent));
    socket.emit('updateEntityStatus', { entityId: id, updates: { rotation: angle }, roomId: ROOM_ID });
  };
  const handleResizeToken = (id: number, size: number) => {
    setEntities(prev => prev.map(ent => ent.id === id ? { ...ent, size } : ent));
    socket.emit('updateEntityStatus', { entityId: id, updates: { size }, roomId: ROOM_ID });
  };
  const handleFlipToken = (id: number) => {
    const ent = entities.find(e => e.id === id);
    if (!ent) return;
    const newMirrored = !ent.mirrored;
    setEntities(prev => prev.map(e => e.id === id ? { ...e, mirrored: newMirrored } : e));
    socket.emit('updateEntityStatus', { entityId: id, updates: { mirrored: newMirrored }, roomId: ROOM_ID });
  };
  const handleToggleCondition = (id: number, condition: string) => {
    setEntities(prev => prev.map(ent => {
        if (ent.id !== id) return ent;
        const hasCondition = ent.conditions.includes(condition);
        const newConditions = hasCondition ? ent.conditions.filter(c => c !== condition) : [...ent.conditions, condition];
        if (!hasCondition) addLog(`${ent.name} recebeu condição: ${condition}`, 'info');
        socket.emit('updateEntityStatus', { entityId: id, updates: { conditions: newConditions }, roomId: ROOM_ID });
        return { ...ent, conditions: newConditions };
    }));
  };
  const handleEditEntity = (id: number, updates: Partial<Entity>) => {
    setEntities(prev => prev.map(ent => ent.id === id ? { ...ent, ...updates } : ent));
    socket.emit('updateEntityStatus', { entityId: id, updates, roomId: ROOM_ID });
  };
  const handleDeleteEntity = (id: number) => {
    setEntities(prev => prev.filter(ent => ent.id !== id));
    socket.emit('deleteEntity', { entityId: id, roomId: ROOM_ID });
    if (attackerId === id) setAttackerId(null);
  };
  
  const createEntity = (type: 'enemy' | 'player', name: string, x: number, y: number, customStats?: Partial<Entity>) => {
    const newId = Date.now(); 
    const newEntity: Entity = { 
      id: newId, name, hp: customStats?.hp || 10, maxHp: customStats?.maxHp || customStats?.hp || 10, 
      ac: customStats?.ac || 10, x, y, rotation: 0, mirrored: false, conditions: [], 
      color: type === 'enemy' ? '#ef4444' : '#3b82f6', type, 
      image: customStats?.image || (type === 'enemy' ? "/tokens/lobo.png" : "/tokens/aliado.png"), 
      visionRadius: 9, stats: customStats?.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      classType: customStats?.classType || "NPC", size: customStats?.size || 2,
      xp: customStats?.xp || 0,
      level: customStats?.level || 1
    };
    setEntities(prev => [...prev, newEntity]);
    socket.emit('createEntity', { entity: newEntity, roomId: ROOM_ID });
    addLog(`${name} entrou na mesa.`, 'info');
  };

  const handleAddEntity = (type: 'enemy' | 'player', name: string, customStats?: MonsterPreset) => { createEntity(type, name, 8, 6, customStats as Partial<Entity>); };
  const handleMapDrop = (type: string, x: number, y: number) => {
    const entityType = type as 'enemy' | 'player';
    const nextNum = entities.filter(e => e.type === entityType).length + 1;
    createEntity(entityType, entityType === 'enemy' ? `Monstro ${nextNum}` : `Aliado ${nextNum}`, x, y);
  };
  const handleFogUpdate = (x: number, y: number, shouldReveal: boolean) => {
    if (role !== 'DM') return; 
    setFogGrid(prev => { const newGrid = prev.map(row => [...row]); if (newGrid[y]) newGrid[y][x] = shouldReveal; return newGrid; });
    socket.emit('updateFog', { x, y, shouldReveal, roomId: ROOM_ID });
  };
  const handleResetFog = () => { const newGrid = createInitialFog(); setFogGrid(newGrid); socket.emit('syncFogGrid', { grid: newGrid, roomId: ROOM_ID }); };
  const handleRevealAll = () => { const newGrid = fogGrid.map(row => row.map(() => true)); setFogGrid(newGrid); socket.emit('syncFogGrid', { grid: newGrid, roomId: ROOM_ID }); };
  const handleSyncFog = () => { socket.emit('syncFogGrid', { grid: fogGrid, roomId: ROOM_ID }); };
  
  const handleChangeMap = (mapUrl: string) => { 
      setCurrentMap(mapUrl); 
      setFogGrid(createInitialFog()); 
      socket.emit('changeMap', { mapUrl, roomId: ROOM_ID }); 
  };
  
  const handleSaveGame = () => {
    socket.emit('saveGame', { roomId: ROOM_ID, entities: entities, fogGrid: fogGrid, currentMap: currentMap, initiativeList: initiativeList, activeTurnId: activeTurnId, chatMessages: chatMessages });
    addLog("O Mestre salvou o estado da mesa no servidor.", 'info');
  };

  const handleAddToInitiative = (entity: Entity) => { if (initiativeList.find(i => i.id === entity.id)) return; setInitModalEntity(entity); };
  const handleSubmitInitiative = (val: number) => {
    if (!initModalEntity) return;
    const newItem = { id: initModalEntity.id, name: initModalEntity.name, value: val };
    const newList = [...initiativeList, newItem].sort((a, b) => b.value - a.value);
    setInitiativeList(newList);
    const newActive = activeTurnId === null ? initModalEntity.id : activeTurnId;
    setActiveTurnId(newActive);
    socket.emit('updateInitiative', { list: newList, activeTurnId: newActive, roomId: ROOM_ID });
    addLog(`${initModalEntity.name} rolou Iniciativa: ${val}`, 'info');
    playSound('dado');
    setInitModalEntity(null);
  };

  const handleRemoveFromInitiative = (id: number) => { const newList = initiativeList.filter(i => i.id !== id); setInitiativeList(newList); socket.emit('updateInitiative', { list: newList, activeTurnId, roomId: ROOM_ID }); };
  const handleNextTurn = () => {
    if (initiativeList.length === 0) return;
    const nextId = initiativeList[(initiativeList.findIndex(i => i.id === activeTurnId) + 1) % initiativeList.length].id;
    setActiveTurnId(nextId);
    socket.emit('updateInitiative', { list: initiativeList, activeTurnId: nextId, roomId: ROOM_ID });
    const nextEntity = initiativeList.find(i => i.id === nextId);
    if(nextEntity) addLog(`Turno de: ${nextEntity.name}`, 'info');
  };
  const handleClearInitiative = () => { setInitiativeList([]); setActiveTurnId(null); socket.emit('updateInitiative', { list: [], activeTurnId: null, roomId: ROOM_ID }); };
  const handleSortInitiative = () => { const newList = [...initiativeList].sort((a, b) => b.value - a.value); setInitiativeList(newList); socket.emit('updateInitiative', { list: newList, activeTurnId, roomId: ROOM_ID }); };
  
  const handleSetTarget = (id: number | number[] | null, multiSelect: boolean = false) => {
    if (role !== 'DM') return;
    if (id === null) { if (!multiSelect) setTargetEntityIds([]); return; }
    if (Array.isArray(id)) { setTargetEntityIds(multiSelect ? Array.from(new Set([...targetEntityIds, ...id])) : id); return; }
    setTargetEntityIds(multiSelect ? (targetEntityIds.includes(id) ? targetEntityIds.filter(tid => tid !== id) : [...targetEntityIds, id]) : [id]);
  };
  
  const handleSetAttacker = (id: number | null) => { if (role !== 'DM') return; setAttackerId(id); };
  const handleSelectEntityForStatus = (entity: Entity) => { setStatusSelectionId(entity.id); };
  
  const handleLogin = (selectedRole: 'DM' | 'PLAYER', name: string, charData?: any) => {
    setRole(selectedRole); 
    setPlayerName(name); 
    setIsLoggedIn(true); 
    
    socket.emit('joinRoom', ROOM_ID);

    if (selectedRole === 'PLAYER' && charData) {
        setTimeout(() => {
            const charExists = entities.find(e => e.name.toLowerCase() === name.toLowerCase());
            if (!charExists) {
                const newEntity: Entity = { 
                    id: Date.now(), 
                    name, 
                    hp: charData.hp, maxHp: charData.maxHp, 
                    ac: charData.ac, 
                    x: 8, y: 6, // Ponto de spawn visível
                    rotation: 0, mirrored: false, conditions: [], color: '#3b82f6', type: 'player', 
                    image: charData.image, stats: charData.stats, classType: charData.classType, 
                    visionRadius: 9, size: charData.size || 2,
                    xp: charData.xp || 0,
                    level: charData.level || 1
                };
                setEntities(prev => [...prev, newEntity]);
                socket.emit('createEntity', { entity: newEntity, roomId: ROOM_ID });
                addLog(`${name} entrou na mesa!`, 'info');
            }
        }, 800); 
    }
  };

  const selectedStatusEntity = statusSelectionId ? entities.find(e => e.id === statusSelectionId) : null;

  // --- CÁLCULO DINÂMICO E PRECISO DA POSIÇÃO (CONSIDERANDO CENTRALIZAÇÃO) ---
  let modalPosition = { top: 0, left: 0 };
  if (selectedStatusEntity) {
      const canvasOffsetX = (windowSize.w - CANVAS_WIDTH) / 2;
      const canvasOffsetY = (windowSize.h - CANVAS_HEIGHT) / 2;

      const tokenPixelX = (selectedStatusEntity.x * GRID_SIZE * mapScale) + mapOffset.x + canvasOffsetX;
      const tokenPixelY = (selectedStatusEntity.y * GRID_SIZE * mapScale) + mapOffset.y + canvasOffsetY;
      
      const tokenSize = (selectedStatusEntity.size || 1) * GRID_SIZE * mapScale;

      // Padrão: Lado direito do token + 15px
      modalPosition = {
          top: tokenPixelY,
          left: tokenPixelX + tokenSize + 15 
      };

      // Ajuste de colisão com a direita (largura aumentada para 320px + margem)
      if (modalPosition.left + 330 > windowSize.w - 320) { 
          modalPosition.left = tokenPixelX - 340; 
      }

      // Ajuste de colisão com baixo
      if (modalPosition.top + 400 > windowSize.h) {
          modalPosition.top = windowSize.h - 410;
      }
      
      if (modalPosition.top < 10) modalPosition.top = 10;
  }

  const handleSaveNewAlly = (id: number, data: Partial<Entity>) => {
      const nextNum = entities.filter(e => e.type === 'player').length + 1;
      const finalName = data.name || `Aliado ${nextNum}`;
      createEntity('player', finalName, 4, 4, { ...data, name: finalName });
      setShowAllyCreator(false);
  };

  const handleSaveNewEnemy = (data: Partial<Entity>) => {
      const nextNum = entities.filter(e => e.type === 'enemy').length + 1;
      createEntity('enemy', data.name || `Monstro ${nextNum}`, 8, 6, data);
      setShowEnemyCreator(false);
  };

  if (!isLoggedIn) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-rpgBg" onClick={() => { if (Howler.ctx && Howler.ctx.state !== 'running') Howler.ctx.resume(); }}>
      {initModalEntity && (<InitiativeModal entity={initModalEntity} onClose={() => setInitModalEntity(null)} onConfirm={handleSubmitInitiative} />)}

      {/* --- MODAL DE EDIÇÃO (QUANDO MESTRE CLICA NO TOKEN DO STATUS) --- */}
      {editingEntity && (
          <EditEntityModal 
              entity={editingEntity} 
              onSave={(id, updates) => { handleEditEntity(id, updates); setEditingEntity(null); }} 
              onClose={() => setEditingEntity(null)} 
          />
      )}

      {/* --- MODAL DE STATUS DO TOKEN (MÉDIO E COLADO NO TOKEN) --- */}
      {selectedStatusEntity && (
        <div 
          className="fixed z-50 bg-gray-900/95 border-2 border-cyan-400 p-4 rounded-xl shadow-[0_0_30px_rgba(34,211,238,0.3)] text-cyan-50 w-80 backdrop-blur-md animate-in fade-in zoom-in duration-100 font-mono transition-all ease-linear"
          style={{ 
              top: modalPosition.top, 
              left: modalPosition.left
          }}
        >
          {/* Cabeçalho */}
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-cyan-400/40 relative">
            <h3 className="text-base font-black tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">STATUS</h3>
            <button onClick={() => setStatusSelectionId(null)} className="text-cyan-500 hover:text-white transition-colors text-base font-bold">✕</button>
          </div>

          <div className="flex gap-3 mb-4">
            {/* IMAGEM DO TOKEN (CLICÁVEL PARA MESTRE) */}
            <div 
                onClick={() => role === 'DM' && setEditingEntity(selectedStatusEntity)}
                className={`w-16 h-16 rounded-lg border-2 border-cyan-400 overflow-hidden shrink-0 relative shadow-lg shadow-cyan-500/20 group ${role === 'DM' ? 'cursor-pointer' : ''}`}
            >
              {selectedStatusEntity.image ? (
                <img src={selectedStatusEntity.image} alt={selectedStatusEntity.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-xl" style={{ backgroundColor: selectedStatusEntity.color }}>{selectedStatusEntity.name[0]}</div>
              )}
              {/* Scanline CSS */}
              <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
              
              {/* HOVER EFFECT: EDITAR (SÓ MESTRE) */}
              {role === 'DM' && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest border border-cyan-300 px-1 rounded">Editar</span>
                  </div>
              )}
            </div>

            <div className="flex flex-col justify-center gap-1 text-xs w-full">
              <div className="flex justify-between items-end border-b border-white/10 pb-1">
                  <span className="text-cyan-400 font-bold uppercase tracking-wider text-[10px]">Nome</span>
                  <span className="font-bold truncate ml-1 text-white text-sm max-w-[140px]">{selectedStatusEntity.name}</span>
              </div>
              <div className="flex justify-between items-end border-b border-white/10 pb-1">
                  <span className="text-cyan-400 font-bold uppercase tracking-wider text-[10px]">Classe</span>
                  <span className="font-bold text-white text-xs">{selectedStatusEntity.classType || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center bg-cyan-950/50 px-2 py-1 rounded border border-cyan-500/20 mt-1">
                  <span className="text-cyan-400 font-bold text-[10px] uppercase">Nível</span>
                  <span className="font-black text-yellow-400 text-sm drop-shadow-sm">{getLevelFromXP(selectedStatusEntity.xp || 0)}</span>
              </div>
            </div>
          </div>

          {/* Barra de Vida */}
          <div className="mb-4">
            <div className="flex justify-between text-[10px] font-bold mb-1 px-1 uppercase tracking-wider">
              <span className="text-cyan-400">Integridade</span>
              <span className={selectedStatusEntity.hp < selectedStatusEntity.maxHp / 2 ? "text-red-400" : "text-cyan-100"}>{selectedStatusEntity.hp} / {selectedStatusEntity.maxHp}</span>
            </div>
            <div className="w-full h-3 bg-gray-800 rounded border border-cyan-500/30 overflow-hidden relative shadow-inner">
              <div 
                className={`h-full transition-all duration-300 relative ${
                  selectedStatusEntity.hp <= selectedStatusEntity.maxHp * 0.25 ? 'bg-red-600' : 
                  selectedStatusEntity.hp <= selectedStatusEntity.maxHp * 0.5 ? 'bg-yellow-500' : 
                  'bg-gradient-to-r from-cyan-500 to-blue-600'
                }`} 
                style={{ width: `${Math.max(0, Math.min(100, (selectedStatusEntity.hp / selectedStatusEntity.maxHp) * 100))}%` }}
              >
                  <div className="absolute right-0 top-0 h-full w-px bg-white/50 shadow-[0_0_5px_white]"></div>
              </div>
            </div>
          </div>
          
          {/* Grid de Atributos */}
          {selectedStatusEntity.stats && (
            <div className="grid grid-cols-2 gap-2 text-xs bg-black/40 p-2 rounded-lg border border-cyan-500/20">
              {Object.entries(selectedStatusEntity.stats).map(([stat, value]) => {
                 const mod = Math.floor((value - 10) / 2);
                 const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
                 const labels: Record<string, string> = { str: 'FOR', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' };
                 const icons: Record<string, string> = { str: '💪', dex: '🏃', con: '❤️', int: '🧠', wis: '🦉', cha: '🎭' };
                 return (
                  <div key={stat} className="flex justify-between items-center px-2 py-1.5 bg-cyan-900/20 rounded border border-white/5 hover:border-cyan-500/30 transition-colors">
                    <div className="flex items-center gap-1.5">
                        <span className="opacity-80 text-[10px]">{icons[stat]}</span>
                        <span className="font-bold text-cyan-500 text-[10px] uppercase">{labels[stat]}</span>
                    </div>
                    <div className="flex gap-1.5 items-baseline">
                        <span className="text-white font-bold">{value}</span>
                        <span className={`font-black text-[10px] ${mod > 0 ? 'text-green-400' : mod < 0 ? 'text-red-400' : 'text-gray-500'}`}>{modStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showAllyCreator && (
          <EditEntityModal entity={{ id: 0, name: '', hp: 20, maxHp: 20, ac: 12, x:0, y:0, type: 'player', color: '', conditions: [], mirrored: false, size: 1 }} onSave={(id, updates) => handleSaveNewAlly(id, updates)} onClose={() => setShowAllyCreator(false)} />
      )}

      {showEnemyCreator && (
          <MonsterCreatorModal onSave={handleSaveNewEnemy} onClose={() => setShowEnemyCreator(false)} />
      )}

      <main className="relative flex-grow h-full overflow-hidden bg-black text-white">
        <div className="absolute top-4 left-4 z-[150] pointer-events-none opacity-50">
           <span className={`text-[10px] font-bold px-2 py-1 rounded border ${role === 'DM' ? 'bg-red-900 border-red-500' : 'bg-blue-900 border-blue-500'}`}>
             {role === 'DM' ? 'Mestre Supremo' : `Jogador: ${playerName}`}
           </span>
        </div>

        <CanvasMap 
          mapUrl={currentMap} gridSize={GRID_SIZE} entities={entities} role={role} fogGrid={fogGrid} isFogMode={isFogMode} fogTool={fogTool} activeTurnId={activeTurnId}
          onFogUpdate={handleFogUpdate} onMoveToken={handleUpdatePosition} onAddToken={handleMapDrop} onRotateToken={handleRotateToken}
          onResizeToken={handleResizeToken} 
          onTokenDoubleClick={handleAddToInitiative} targetEntityIds={targetEntityIds} attackerId={attackerId} onSetTarget={handleSetTarget}
          onSetAttacker={handleSetAttacker} onFlipToken={handleFlipToken} activeAoE={activeAoE} onAoEComplete={() => setActiveAoE(null)}
          aoeColor={aoeColor} onSelectEntity={handleSelectEntityForStatus}
          externalOffset={mapOffset} 
          externalScale={mapScale} 
          onMapChange={handleMapSync}
        />
        
        <div className="fixed bottom-4 right-[340px] z-[130] pointer-events-none">
          <div className="pointer-events-auto">
            <DiceRoller playDiceSound={() => playSound('dado')} addLog={addLog} />
          </div>
        </div>
      </main>

      <aside className="w-80 flex-shrink-0 border-l border-rpgAccent/20 bg-rpgPanel shadow-2xl z-[140]">
        {role === 'DM' 
          ? <SidebarDM 
              entities={entities} onUpdateHP={handleUpdateHP} onAddEntity={handleAddEntity} onDeleteEntity={handleDeleteEntity}
              onEditEntity={handleEditEntity} isFogMode={isFogMode} onToggleFogMode={() => setIsFogMode(!isFogMode)}
              fogTool={fogTool} onSetFogTool={setFogTool} onSyncFog={handleSyncFog} onResetFog={handleResetFog} onRevealAll={handleRevealAll}
              onSaveGame={handleSaveGame} onChangeMap={handleChangeMap} initiativeList={initiativeList} activeTurnId={activeTurnId}
              onAddToInitiative={handleAddToInitiative} onRemoveFromInitiative={handleRemoveFromInitiative} onNextTurn={handleNextTurn}
              onClearInitiative={handleClearInitiative} onSortInitiative={handleSortInitiative} targetEntityIds={targetEntityIds}
              attackerId={attackerId} onSetTarget={handleSetTarget} onToggleCondition={handleToggleCondition}
              onSetAttacker={handleSetAttacker} 
              activeAoE={activeAoE} onSetAoE={setActiveAoE} chatMessages={chatMessages} onSendMessage={handleSendMessage}
              aoeColor={aoeColor} onSetAoEColor={setAoEColor}
              onOpenCreator={(type) => { if (type === 'player') setShowAllyCreator(true); if (type === 'enemy') setShowEnemyCreator(true); }}
              onAddXP={handleAddXP} 
            /> 
          : <SidebarPlayer entities={entities} initiativeList={initiativeList} activeTurnId={activeTurnId} chatMessages={chatMessages} onSendMessage={handleSendMessage} onRollAttribute={handleAttributeRoll}
              onUpdateCharacter={handleEditEntity} 
            />
        }
      </aside>
    </div>
  );
}

export default App;