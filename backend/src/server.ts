import Fastify from 'fastify';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';

const fastify = Fastify();

const io = new Server(fastify.server, {
  cors: { origin: "*" }
});

// --- 1. CONFIGURAÇÃO DO MAPA ---
const MAP_LIMIT = 8000; // Ajustado para 8000 para sincronizar com o frontend
const COLS = Math.ceil(MAP_LIMIT / 70);
const ROWS = Math.ceil(MAP_LIMIT / 70);

const createInitialFog = () => Array(ROWS).fill(null).map(() => Array(COLS).fill(false));

// --- 2. ESTADO INICIAL ---
const DATA_FILE = path.resolve(__dirname, 'savegame_v2.json');

let currentGameState = {
  entities: [] as any[],
  fogGrid: createInitialFog(), 
  currentMap: '/maps/floresta.jpg',
  initiativeList: [] as any[],
  activeTurnId: null as number | null,
  chatHistory: [] as any[] 
};

// --- 3. CARREGAR SAVE (Se existir) ---
if (fs.existsSync(DATA_FILE)) {
  try {
    const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
    const loadedData = JSON.parse(rawData);
    
    currentGameState = { ...currentGameState, ...loadedData };

    // SEGURANÇA: Corrige grade se o tamanho estiver errado
    if (!currentGameState.fogGrid || currentGameState.fogGrid.length < ROWS) {
        console.log("⚠️ Grade inválida detectada! Recriando neblina...");
        currentGameState.fogGrid = createInitialFog();
    }

    console.log('✅ SAVE CARREGADO. Entidades:', currentGameState.entities.length);
  } catch (e) {
    console.error('❌ ERRO AO LER SAVE:', e);
  }
}

io.on('connection', (socket) => {
  console.log('🔌 Nova conexão:', socket.id);

  // Sincroniza o estado completo ao entrar
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    socket.emit('gameStateSync', currentGameState);
    console.log(`👤 Usuário entrou na sala: ${roomId}`);
  });

  // Trocando o mapa e resetando neblina
  socket.on('changeMap', (data) => {
    const newFog = createInitialFog();
    currentGameState.currentMap = data.mapUrl;
    currentGameState.fogGrid = newFog;
    
    io.in(data.roomId).emit('mapChanged', { 
      mapUrl: data.mapUrl,
      fogGrid: newFog
    });
  });

  // Persistência Manual (Botão Salvar)
  socket.on('saveGame', (data) => {
    console.log(`📥 PERSISTINDO DADOS NO DISCO...`);
    currentGameState = {
        ...currentGameState,
        entities: data.entities,
        fogGrid: data.fogGrid,
        currentMap: data.currentMap,
        initiativeList: data.initiativeList,
        activeTurnId: data.activeTurnId,
    };

    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(currentGameState, null, 2));
      io.in(data.roomId).emit('notification', { message: 'Mundo salvo com sucesso!' });
    } catch (err) {
      console.error("❌ ERRO AO GRAVAR ARQUIVO:", err);
    }
  });

  // --- ATUALIZAÇÕES EM TEMPO REAL ---

  socket.on('updateEntityPosition', (data) => {
    const ent = currentGameState.entities.find((e: any) => e.id === data.entityId);
    if (ent) {
      ent.x = data.x;
      ent.y = data.y;
    }
    socket.to(data.roomId).emit('entityPositionUpdated', data);
  });

  socket.on('updateEntityStatus', (data) => {
    const index = currentGameState.entities.findIndex((e: any) => e.id === data.entityId);
    if (index !== -1) {
      currentGameState.entities[index] = { ...currentGameState.entities[index], ...data.updates };
    }
    socket.to(data.roomId).emit('entityStatusUpdated', data);
  });

  socket.on('createEntity', (data) => {
    currentGameState.entities.push(data.entity);
    socket.to(data.roomId).emit('entityCreated', data);
  });

  socket.on('deleteEntity', (data) => {
    currentGameState.entities = currentGameState.entities.filter((e: any) => e.id !== data.entityId);
    socket.to(data.roomId).emit('entityDeleted', data);
  });

  // Neblina
  socket.on('updateFog', (data) => {
    if (currentGameState.fogGrid[data.y]) {
      currentGameState.fogGrid[data.y][data.x] = data.shouldReveal;
    }
    socket.to(data.roomId).emit('fogUpdated', data);
  });

  socket.on('syncFogGrid', (data) => {
    currentGameState.fogGrid = data.grid;
    socket.to(data.roomId).emit('fogGridSynced', data);
  });

  socket.on('updateInitiative', (data) => {
    currentGameState.initiativeList = data.list;
    currentGameState.activeTurnId = data.activeTurnId;
    socket.to(data.roomId).emit('initiativeUpdated', data);
  });

  // Chat e Dados
  socket.on('sendMessage', (data) => {
    io.in(data.roomId).emit('chatMessage', data);
  });

  socket.on('rollDice', (data) => { 
    io.in(data.roomId).emit('newDiceResult', data); 
  });

  socket.on('triggerAudio', (data) => { 
    io.to(data.roomId).emit('triggerAudio', data); 
  });

  // --- NOVA FUNCIONALIDADE: SINCRONIA DO MAPA ---
  socket.on('syncMapState', (data) => {
    // data = { roomId, offset, scale }
    // Envia para todos na sala (exceto quem enviou)
    socket.to(data.roomId).emit('mapStateUpdated', {
      offset: data.offset,
      scale: data.scale
    });
  });
});

fastify.listen({ port: 4000, host: '0.0.0.0' }, (err) => {
  if (err) { console.error(err); process.exit(1); }
  console.log('⚔️  VTT BACKEND ONLINE - PORTA 4000');
});