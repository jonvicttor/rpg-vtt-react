import { io } from 'socket.io-client';

// Conecta ao servidor que configuramos na porta 4000
const socket = io('http://localhost:4000');

export default socket;