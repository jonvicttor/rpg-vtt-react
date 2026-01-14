import React, { useState, useEffect, useRef } from 'react';
import socket from '../services/socket';

interface Message {
  id: string;
  user: string;
  text: string;
  type: 'chat' | 'roll' | 'system';
  color?: string;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const roomId = 'mesa-do-victor'; // ID fixo da sua mesa

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // 1. Entra na sala ao montar o componente para receber atualizações
    socket.emit('joinRoom', { roomId, userId: 'Necromante' });

    // Escuta mensagens de texto enviadas manualmente
    socket.on('chatMessage', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    // 2. Escuta o log automático de dados para exibir o valor no chat
    socket.on('newDiceResult', (data: { user: string, sides: number, result: number }) => {
      const rollMsg: Message = {
        id: Math.random().toString(),
        user: 'SISTEMA',
        text: `${data.user} rolou d${data.sides} e tirou ${data.result}`,
        type: 'roll',
        color: '#e94560' // Vermelho destaque Ordem Paranormal
      };
      setMessages(prev => [...prev, rollMsg]);
    });

    return () => { 
      socket.off('chatMessage');
      socket.off('newDiceResult'); 
    };
  }, []); 

  useEffect(scrollToBottom, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Math.random().toString(),
      user: 'Necromante',
      text: input,
      type: 'chat'
    };

    // Envia a mensagem para a sala específica no servidor
    socket.emit('sendMessage', { roomId: 'mesa-do-victor', ...newMessage });
    
    // Opcional: Remova a linha abaixo se o seu server.ts já estiver usando io.in 
    // para evitar mensagens duplicadas no seu próprio chat.
    setMessages(prev => [...prev, newMessage]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-[400px] bg-black/40 border-t border-rpgAccent/20 font-mono">
      <div className="flex-grow overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-rpgAccent">
        {messages.map((msg) => (
          <div key={msg.id} className={`text-[11px] ${msg.type === 'roll' ? 'italic' : ''}`}>
            <span style={{ color: msg.color || '#4a148c' }} className="font-bold uppercase mr-2">
              [{msg.user}]:
            </span>
            <span className="text-rpgText">{msg.text}</span>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-2 border-t border-rpgAccent/10 bg-black/20">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua ação..."
          className="w-full bg-transparent text-[11px] text-rpgText focus:outline-none placeholder:opacity-30"
        />
      </form>
    </div>
  );
};

export default Chat;