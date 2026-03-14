import { io } from 'socket.io-client';

// Se estiveres no teu PC rodando local, ele usa localhost.
// Se estiveres na Vercel (internet), ele usa o teu link do Render.
const SOCKET_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:4000'
  : 'https://nexus-rpg-dl3i.onrender.com';

const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5
});

export default socket;