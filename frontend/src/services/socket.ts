import { io } from 'socket.io-client';

// Ajuste para a porta 4000 (que é onde seu backend Docker está rodando)
const socket = io('http://localhost:4000'); 

export default socket;