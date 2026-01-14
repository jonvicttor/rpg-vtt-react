import React, { useState, useEffect, useRef, useCallback } from 'react';
import socket from './services/socket';
import { Howl, Howler } from 'howler';
import CanvasMap from './components/CanvasMap';
import SidebarDM, { InitiativeItem } from './components/SidebarDM';
import SidebarPlayer from './components/SidebarPlayer';
import LoginScreen from './components/LoginScreen'; 

const ROOM_ID = 'mesa-do-victor'; 

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
  stats?: {
    str: number; dex: number; con: number; int: number; wis: number; cha: number;
  };
  classType?: string;
}

export interface MonsterPreset {
  name: string;
  hp: number;
  ac: number;
  image: string;
}

const DiceRoller = ({ playDiceSound }: { playDiceSound: () => void }) => {
  const [result, setResult] = useState<number | string>('--');
  const rollDice = (sides: number) => {
    const roll = Math.floor(Math.random() * sides) + 1;
    setResult(roll);
    playDiceSound();
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

const MAP_LIMIT = 4000; 
const COLS = Math.ceil(MAP_LIMIT / 70);
const ROWS = Math.ceil(MAP_LIMIT / 70);
const createInitialFog = () => Array(ROWS).fill(null).map(() => Array(COLS).fill(false));

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [role, setRole] = useState<'DM' | 'PLAYER'>('PLAYER'); 
  const [playerName, setPlayerName] = useState('');

  const [entities, setEntities] = useState<Entity[]>([
    { id: 1, name: "Necromante", hp: 20, maxHp: 24, ac: 12, x: 8, y: 5, rotation: 0, mirrored: false, conditions: [], color: "#6b21a8", type: "player", image: "/tokens/necromante.png" }
  ]);
  
  const [fogGrid, setFogGrid] = useState<boolean[][]>(createInitialFog());
  const [isFogMode, setIsFogMode] = useState(false);
  const [fogTool, setFogTool] = useState<'reveal' | 'hide'>('reveal'); 
  const [currentMap, setCurrentMap] = useState('/maps/floresta.jpg');
  
  const [initiativeList, setInitiativeList] = useState<InitiativeItem[]>([]);
  const [activeTurnId, setActiveTurnId] = useState<number | null>(null);
  
  const [targetEntityIds, setTargetEntityIds] = useState<number[]>([]);
  const [attackerId, setAttackerId] = useState<number | null>(null);

  const [activeAoE, setActiveAoE] = useState<'circle' | 'cone' | 'cube' | null>(null);

  const audioRefs = useRef({
    dado: new Howl({ src: ['/sfx/dado.mp3'], volume: 0.5, html5: true }),
    atmosfera: new Howl({ src: ['/sfx/suspense.mp3'], volume: 0.4, html5: true, preload: true, loop: true })
  });

  const playSound = useCallback((type: 'dado' | 'atmosfera') => {
    if (Howler.ctx && Howler.ctx.state !== 'running') Howler.ctx.resume();
    const sound = type === 'dado' ? audioRefs.current.dado : audioRefs.current.atmosfera;
    if (type === 'atmosfera') {
      if (sound.playing()) sound.stop(); else { Howler.stop(); sound.play(); }
    } else {
      sound.play();
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return; 

    const joinRoom = () => { console.log("Entrando na sala:", ROOM_ID); socket.emit('joinRoom', ROOM_ID); };
    joinRoom();
    socket.on('connect', joinRoom);

    socket.on('gameStateSync', (gameState) => {
      if (gameState.entities) setEntities(gameState.entities);
      if (gameState.fogGrid) setFogGrid(gameState.fogGrid);
      if (gameState.currentMap) setCurrentMap(gameState.currentMap);
      if (gameState.initiativeList) setInitiativeList(gameState.initiativeList);
      if (gameState.activeTurnId) setActiveTurnId(gameState.activeTurnId);
    });

    socket.on('notification', (data) => { alert(data.message); });
    socket.on('newDiceResult', () => playSound('dado'));
    socket.on('entityPositionUpdated', (data) => setEntities(prev => prev.map(ent => ent.id === data.entityId ? { ...ent, x: data.x, y: data.y } : ent)));
    socket.on('entityStatusUpdated', (data) => setEntities(prev => prev.map(ent => ent.id === data.entityId ? { ...ent, ...data.updates } : ent)));
    socket.on('entityCreated', (data) => setEntities(prev => { if (prev.find(e => e.id === data.entity.id)) return prev; return [...prev, data.entity]; }));
    socket.on('entityDeleted', (data) => setEntities(prev => prev.filter(ent => ent.id !== data.entityId)));
    socket.on('mapChanged', (data) => { setCurrentMap(data.mapUrl); setFogGrid(data.fogGrid); });
    socket.on('fogUpdated', (data) => {
      setFogGrid(prev => {
        if (!prev || !prev[data.y]) return prev;
        const newGrid = prev.map(row => [...row]);
        if (newGrid[data.y][data.x] !== undefined) newGrid[data.y][data.x] = data.shouldReveal;
        return newGrid;
      });
    });
    socket.on('fogGridSynced', (data) => setFogGrid(data.grid));
    socket.on('initiativeUpdated', (data) => {
      setInitiativeList(data.list);
      setActiveTurnId(data.activeTurnId);
    });
    socket.on('triggerAudio', (data) => { if (data.trackId === 'suspense') playSound('atmosfera'); });

    return () => {
      socket.off('connect', joinRoom);
      socket.off('gameStateSync');
      socket.off('notification');
      socket.off('newDiceResult');
      socket.off('entityPositionUpdated');
      socket.off('entityStatusUpdated');
      socket.off('entityCreated');
      socket.off('entityDeleted');
      socket.off('mapChanged');
      socket.off('fogUpdated');
      socket.off('fogGridSynced');
      socket.off('initiativeUpdated');
      socket.off('triggerAudio');
    };
  }, [playSound, isLoggedIn]); 

  // Handlers
  const handleUpdatePosition = (id: number, newX: number, newY: number) => {
    setEntities(prev => prev.map(ent => ent.id === id ? { ...ent, x: newX, y: newY } : ent));
    socket.emit('updateEntityPosition', { entityId: id, x: newX, y: newY, roomId: ROOM_ID });
  };

  const handleRotateToken = (id: number, angle: number) => {
    setEntities(prev => prev.map(ent => ent.id === id ? { ...ent, rotation: angle } : ent));
    socket.emit('updateEntityStatus', { entityId: id, updates: { rotation: angle }, roomId: ROOM_ID });
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
        const newConditions = hasCondition 
            ? ent.conditions.filter(c => c !== condition) 
            : [...ent.conditions, condition];
        socket.emit('updateEntityStatus', { entityId: id, updates: { conditions: newConditions }, roomId: ROOM_ID });
        return { ...ent, conditions: newConditions };
    }));
  };

  const handleUpdateHP = (id: number, change: number) => {
    const entity = entities.find(e => e.id === id);
    if (!entity) return;
    const newHp = Math.min(entity.maxHp, Math.max(0, entity.hp + change));
    setEntities(prev => prev.map(ent => ent.id === id ? { ...ent, hp: newHp } : ent));
    socket.emit('updateEntityStatus', { entityId: id, updates: { hp: newHp }, roomId: ROOM_ID });
  };
  const handleEditEntity = (id: number, updates: Partial<Entity>) => {
    setEntities(prev => prev.map(ent => ent.id === id ? { ...ent, ...updates } : ent));
    socket.emit('updateEntityStatus', { entityId: id, updates, roomId: ROOM_ID });
  };
  const handleDeleteEntity = (id: number) => {
    setEntities(prev => prev.filter(ent => ent.id !== id));
    socket.emit('deleteEntity', { entityId: id, roomId: ROOM_ID });
    setTargetEntityIds(prev => prev.filter(tid => tid !== id));
    if (attackerId === id) setAttackerId(null);
  };

  const createEntity = (type: 'enemy' | 'player', name: string, x: number, y: number, customStats?: MonsterPreset) => {
    const newId = Date.now(); 
    let hp = 10;
    let maxHp = 10;
    let ac = 10;
    let image = type === 'enemy' ? "/tokens/lobo.png" : "/tokens/aliado.png";

    if (customStats) {
        hp = customStats.hp;
        maxHp = customStats.hp;
        ac = customStats.ac;
        image = customStats.image;
    } else if (type === 'player') {
        hp = 20; maxHp = 20;
    }

    const newEntity: Entity = { 
        id: newId, 
        name: name, 
        hp: hp, 
        maxHp: maxHp, 
        ac: ac, 
        x: x, 
        y: y, 
        rotation: 0,
        mirrored: false,
        conditions: [],
        color: type === 'enemy' ? '#ef4444' : '#3b82f6', 
        type: type, 
        image: image 
    };

    setEntities(prev => [...prev, newEntity]);
    socket.emit('createEntity', { entity: newEntity, roomId: ROOM_ID });
  };

  const handleAddEntity = (type: 'enemy' | 'player', name: string, customStats?: MonsterPreset) => { 
      createEntity(type, name, 8, 6, customStats); 
  };

  const handleMapDrop = (type: string, x: number, y: number) => {
    const entityType = type as 'enemy' | 'player';
    const nextNum = entities.filter(e => e.type === entityType).length + 1;
    const name = entityType === 'enemy' ? `Monstro ${nextNum}` : `Aliado ${nextNum}`;
    createEntity(entityType, name, x, y);
  };

  const handleFogUpdate = (x: number, y: number, shouldReveal: boolean) => {
    if (role !== 'DM') return; 
    if (y < 0 || y >= ROWS || x < 0 || x >= COLS) return;
    setFogGrid(prev => { 
      if (!prev || !prev[y]) return prev;
      const newGrid = prev.map(row => [...row]); 
      newGrid[y][x] = shouldReveal; 
      return newGrid; 
    });
    socket.emit('updateFog', { x, y, shouldReveal, roomId: ROOM_ID });
  };
  const handleResetFog = () => { const newGrid = createInitialFog(); setFogGrid(newGrid); socket.emit('syncFogGrid', { grid: newGrid, roomId: ROOM_ID }); };
  const handleRevealAll = () => { const newGrid = Array(ROWS).fill(null).map(() => Array(COLS).fill(true)); setFogGrid(newGrid); socket.emit('syncFogGrid', { grid: newGrid, roomId: ROOM_ID }); };
  const handleSyncFog = () => { socket.emit('syncFogGrid', { grid: fogGrid, roomId: ROOM_ID }); };
  const handleChangeMap = (mapUrl: string) => { socket.emit('changeMap', { mapUrl, roomId: ROOM_ID }); };
  
  const handleSaveGame = () => {
    socket.emit('saveGame', {
      roomId: ROOM_ID,
      entities: entities,
      fogGrid: fogGrid,
      currentMap: currentMap,
      initiativeList: initiativeList,
      activeTurnId: activeTurnId
    });
  };

  const handleAddToInitiative = (entity: Entity) => {
    if (initiativeList.find(i => i.id === entity.id)) return;
    const initValue = parseInt(prompt(`Iniciativa para ${entity.name}:`, "0") || "0");
    const newItem = { id: entity.id, name: entity.name, value: initValue };
    const newList = [...initiativeList, newItem];
    newList.sort((a, b) => b.value - a.value);
    setInitiativeList(newList);
    const newActive = activeTurnId === null ? entity.id : activeTurnId;
    setActiveTurnId(newActive);
    socket.emit('updateInitiative', { list: newList, activeTurnId: newActive, roomId: ROOM_ID });
  };
  const handleRemoveFromInitiative = (id: number) => {
    const newList = initiativeList.filter(i => i.id !== id);
    setInitiativeList(newList);
    socket.emit('updateInitiative', { list: newList, activeTurnId, roomId: ROOM_ID });
  };
  const handleNextTurn = () => {
    if (initiativeList.length === 0) return;
    const currentIndex = initiativeList.findIndex(i => i.id === activeTurnId);
    const nextIndex = (currentIndex + 1) % initiativeList.length;
    const nextId = initiativeList[nextIndex].id;
    setActiveTurnId(nextId);
    socket.emit('updateInitiative', { list: initiativeList, activeTurnId: nextId, roomId: ROOM_ID });
  };
  const handleClearInitiative = () => {
    setInitiativeList([]);
    setActiveTurnId(null);
    socket.emit('updateInitiative', { list: [], activeTurnId: null, roomId: ROOM_ID });
  };
  const handleSortInitiative = () => {
    const newList = [...initiativeList].sort((a, b) => b.value - a.value);
    setInitiativeList(newList);
    socket.emit('updateInitiative', { list: newList, activeTurnId, roomId: ROOM_ID });
  };

  // --- ATUALIZADO: Suporte para múltiplos IDs (AoE) ---
  const handleSetTarget = (id: number | number[] | null, multiSelect: boolean = false) => {
    if (role !== 'DM') return;
    
    // Caso 1: Limpar tudo
    if (id === null) { 
        if (!multiSelect) setTargetEntityIds([]); 
        return; 
    }

    // Caso 2: Array de IDs (vido do AoE)
    if (Array.isArray(id)) {
        if (multiSelect) {
            // Adiciona os novos sem duplicar
            setTargetEntityIds(prev => Array.from(new Set([...prev, ...id])));
        } else {
            // Substitui a seleção atual pela nova área
            setTargetEntityIds(id);
        }
        return;
    }

    // Caso 3: ID único (Clique normal)
    setTargetEntityIds(prev => {
        if (multiSelect) {
            return prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id];
        }
        return [id];
    });
  };

  const handleSetAttacker = (id: number | null) => {
    if (role !== 'DM') return;
    setAttackerId(id);
  };

  const handleLogin = (selectedRole: 'DM' | 'PLAYER', name: string, charData?: any) => {
    setRole(selectedRole);
    setPlayerName(name);
    setIsLoggedIn(true); 

    if (selectedRole === 'PLAYER' && charData) {
      const existingEntity = entities.find(e => e.name.toLowerCase() === name.toLowerCase());
      
      if (!existingEntity) {
        const newEntity: Entity = {
          id: Date.now(),
          name: name,
          hp: charData.hp,
          maxHp: charData.maxHp,
          ac: charData.ac,
          x: 4, 
          y: 4,
          rotation: 0,
          mirrored: false,
          conditions: [],
          color: '#3b82f6',
          type: 'player',
          image: charData.image,
          stats: charData.stats,
          classType: charData.classType
        };

        setEntities(prev => [...prev, newEntity]);
        socket.emit('createEntity', { entity: newEntity, roomId: ROOM_ID });
      }
    }
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-rpgBg" onClick={() => { if (Howler.ctx && Howler.ctx.state !== 'running') Howler.ctx.resume(); }}>
      <main className="relative flex-grow h-full overflow-hidden bg-black text-white">
        <div className="absolute top-4 left-4 z-[150] pointer-events-none opacity-50">
           <span className={`text-[10px] font-bold px-2 py-1 rounded border ${role === 'DM' ? 'bg-red-900 border-red-500' : 'bg-blue-900 border-blue-500'}`}>
             {role === 'DM' ? 'Mestre Supremo' : `Jogador: ${playerName}`}
           </span>
        </div>

        <CanvasMap 
          mapUrl={currentMap}
          gridSize={70}
          entities={entities}
          role={role}
          fogGrid={fogGrid}
          isFogMode={isFogMode}
          fogTool={fogTool}
          activeTurnId={activeTurnId}
          onFogUpdate={handleFogUpdate}
          onMoveToken={handleUpdatePosition}
          onAddToken={handleMapDrop}
          onRotateToken={handleRotateToken}
          onTokenDoubleClick={handleAddToInitiative}
          targetEntityIds={targetEntityIds} 
          attackerId={attackerId}
          onSetTarget={handleSetTarget} // Agora aceita number | number[]
          onSetAttacker={handleSetAttacker}
          onFlipToken={handleFlipToken}
          
          activeAoE={activeAoE}
          onAoEComplete={() => setActiveAoE(null)}
        />
        
        <div className="fixed bottom-4 right-[340px] z-[130] pointer-events-none">
          <div className="pointer-events-auto">
            <DiceRoller playDiceSound={() => playSound('dado')} />
          </div>
        </div>
      </main>

      <aside className="w-80 flex-shrink-0 border-l border-rpgAccent/20 bg-rpgPanel shadow-2xl z-[140]">
        {role === 'DM' 
          ? <SidebarDM 
              entities={entities} 
              onUpdateHP={handleUpdateHP} 
              onAddEntity={handleAddEntity}
              onDeleteEntity={handleDeleteEntity}
              onEditEntity={handleEditEntity}
              isFogMode={isFogMode}
              onToggleFogMode={() => setIsFogMode(!isFogMode)}
              fogTool={fogTool}
              onSetFogTool={setFogTool} 
              onSyncFog={handleSyncFog}
              onResetFog={handleResetFog}
              onRevealAll={handleRevealAll}
              onSaveGame={handleSaveGame}
              onChangeMap={handleChangeMap}
              initiativeList={initiativeList}
              activeTurnId={activeTurnId}
              onAddToInitiative={handleAddToInitiative}
              onRemoveFromInitiative={handleRemoveFromInitiative}
              onNextTurn={handleNextTurn}
              onClearInitiative={handleClearInitiative}
              onSortInitiative={handleSortInitiative}
              targetEntityIds={targetEntityIds}
              attackerId={attackerId}
              onSetTarget={handleSetTarget}
              onToggleCondition={handleToggleCondition}
              
              activeAoE={activeAoE}
              onSetAoE={setActiveAoE}
            /> 
          : <SidebarPlayer 
              entities={entities}
              initiativeList={initiativeList}
              activeTurnId={activeTurnId}
            />
        }
      </aside>
    </div>
  );
}

export default App;