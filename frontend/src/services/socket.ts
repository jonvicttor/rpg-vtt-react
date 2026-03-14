import { io } from 'socket.io-client';

// Se estiver no PC dele (localhost), usa a porta 4000.
// Se estiver na internet, usa a URL que o Render.com te der.
const SOCKET_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:4000'
  : 'https://seu-vtt-backend.onrender.com'; // Você vai trocar isso depois

const socket = io(SOCKET_URL, {
  transports: ['websocket'],
});

export default socket;