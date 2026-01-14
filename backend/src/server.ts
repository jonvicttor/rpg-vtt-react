import Fastify from 'fastify';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';

const fastify = Fastify();

const io = new Server(fastify.server, {
  cors: { origin: "*" }
});

// --- 1. CONFIGURAÇÃO DO MAPA (Movi para o topo!) ---
// Agora o servidor sabe o tamanho antes de criar o jogo
const MAP_LIMIT = 4000;
const COLS = Math.ceil(MAP_LIMIT / 70);
const ROWS = Math.ceil(MAP_LIMIT / 70);

// Função para criar a neblina limpa
const createInitialFog = () => Array(ROWS).fill(null).map(() => Array(COLS).fill(false));

// --- 2. ESTADO INICIAL ---
const DATA_FILE = path.resolve(__dirname, 'savegame_v2.json'); // Mudei o nome para garantir um save novo

let currentGameState = {
  entities: [],
  // AGORA SIM: Se não tiver save, ele já cria a neblina certa na hora!
  fogGrid: createInitialFog(), 
  currentMap: '/maps/floresta.jpg',
  initiativeList: [] as any[],
  activeTurnId: null as number | null
};

// --- 3. CARREGAR SAVE (Se existir) ---
if (fs.existsSync(DATA_FILE)) {
  try {
    const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
    const loadedData = JSON.parse(rawData);
    
    // Merge seguro
    currentGameState = { ...currentGameState, ...loadedData };

    // SEGURANÇA EXTRA: Se o save antigo tiver uma neblina pequena errada, recria
    if (currentGameState.fogGrid.length < ROWS) {
        console.log("⚠️ Grade antiga detectada! Recriando neblina expandida...");
        currentGameState.fogGrid = createInitialFog();
    }

    console.log('✅ SAVE CARREGADO. Mapa atual:', currentGameState.currentMap);
  } catch (e) {
    console.error('❌ ERRO AO LER SAVE:', e);
  }
}

io.on('connection', (socket) => {
  console.log('🔌 Nova conexão:', socket.id);

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    socket.emit('gameStateSync', currentGameState);
  });

  socket.on('changeMap', (data) => {
    console.log(`🗺️ Trocando mapa para: ${data.mapUrl}`);
    currentGameState.currentMap = data.mapUrl;
    const newFog = createInitialFog(); // Usa a função corrigida
    currentGameState.fogGrid = newFog;
    io.in(data.roomId).emit('mapChanged', { 
      mapUrl: data.mapUrl,
      fogGrid: newFog
    });
  });

  socket.on('saveGame', (data) => {
    console.log(`📥 SALVANDO JOGO...`);
    currentGameState.entities = data.entities;
    currentGameState.fogGrid = data.fogGrid;
    currentGameState.currentMap = data.currentMap;
    currentGameState.initiativeList = data.initiativeList;
    currentGameState.activeTurnId = data.activeTurnId;

    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(currentGameState, null, 2));
      console.log('✅ ARQUIVO GRAVADO COM SUCESSO!');
      io.in(data.roomId).emit('notification', { message: 'Jogo Salvo com Sucesso!' });
    } catch (err) {
      console.error("❌ ERRO AO SALVAR:", err);
      io.in(data.roomId).emit('notification', { message: 'Erro ao salvar!' });
    }
  });

  // --- EVENTOS PADRÃO ---
  socket.on('updateInitiative', (data) => {
    currentGameState.initiativeList = data.list;
    currentGameState.activeTurnId = data.activeTurnId;
    io.in(data.roomId).emit('initiativeUpdated', data);
  });

  socket.on('updateEntityPosition', (data) => {
    const entIndex = currentGameState.entities.findIndex((e: any) => e.id === data.entityId);
    if (entIndex !== -1) {
      // @ts-ignore
      currentGameState.entities[entIndex].x = data.x;
      // @ts-ignore
      currentGameState.entities[entIndex].y = data.y;
    }
    socket.to(data.roomId).emit('entityPositionUpdated', data);
  });

  socket.on('createEntity', (data) => {
    // @ts-ignore
    currentGameState.entities.push(data.entity);
    socket.to(data.roomId).emit('entityCreated', data);
  });

  socket.on('deleteEntity', (data) => {
    // @ts-ignore
    currentGameState.entities = currentGameState.entities.filter((e: any) => e.id !== data.entityId);
    currentGameState.initiativeList = currentGameState.initiativeList.filter((i: any) => i.id !== data.entityId);
    socket.to(data.roomId).emit('entityDeleted', data);
    io.in(data.roomId).emit('initiativeUpdated', { list: currentGameState.initiativeList, activeTurnId: currentGameState.activeTurnId });
  });

  socket.on('updateFog', (data) => {
    // Proteção para não quebrar se o índice não existir
    if (currentGameState.fogGrid && currentGameState.fogGrid[data.y]) {
      currentGameState.fogGrid[data.y][data.x] = data.shouldReveal;
    }
    socket.to(data.roomId).emit('fogUpdated', data);
  });

  socket.on('syncFogGrid', (data) => {
    currentGameState.fogGrid = data.grid;
    socket.to(data.roomId).emit('fogGridSynced', data);
  });

  socket.on('updateEntityStatus', (data) => {
    const entIndex = currentGameState.entities.findIndex((e: any) => e.id === data.entityId);
    if (entIndex !== -1) {
      // @ts-ignore
      currentGameState.entities[entIndex] = { ...currentGameState.entities[entIndex], ...data.updates };
    }
    socket.to(data.roomId).emit('entityStatusUpdated', data);
  });

  socket.on('rollDice', (data) => { io.in(data.roomId).emit('newDiceResult', data); });
  socket.on('sendMessage', (data) => { io.in(data.roomId).emit('chatMessage', data); });
  socket.on('triggerAudio', (data) => { io.to(data.roomId).emit('triggerAudio', data); });
});

fastify.listen({ port: 4000, host: '0.0.0.0' }, (err) => {
  if (err) { console.error(err); process.exit(1); }
  console.log('🚀 SERVIDOR RODANDO NA PORTA 4000');
});