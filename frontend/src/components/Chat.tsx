import React, { useEffect, useRef, useState } from 'react';

// --- CORREÇÃO: A palavra 'export' é OBRIGATÓRIA aqui ---
export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  type: 'info' | 'roll' | 'damage' | 'chat'; 
  timestamp: string;
}

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  role: 'DM' | 'PLAYER';
}

const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, role }) => {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-48 bg-black/40 border-t border-rpgAccent/20 font-mono text-xs">
      <div className="flex-grow overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className="leading-tight break-words">
            <span className="text-white/30 text-[9px] mr-2">[{msg.timestamp}]</span>
            {msg.type === 'chat' && (
              <span className="font-bold text-blue-400 mr-1 uppercase">
                {msg.sender}:
              </span>
            )}
            <span className={`
              ${msg.type === 'damage' ? 'text-red-500 font-bold' : ''}
              ${msg.type === 'roll' ? 'text-yellow-400 font-bold italic' : ''}
              ${msg.type === 'info' ? 'text-gray-500 italic' : ''}
              ${msg.type === 'chat' ? 'text-gray-200' : ''}
            `}>
              {msg.text}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-2 border-t border-white/5 bg-black/20 flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Falar como ${role === 'DM' ? 'Mestre' : 'Jogador'}...`}
          className="flex-grow bg-transparent text-white outline-none placeholder:text-white/20 text-[11px]"
        />
        <button 
          type="submit" 
          className="text-[10px] bg-blue-900/30 hover:bg-blue-700/50 text-blue-200 px-2 py-1 rounded border border-blue-500/20 transition-all"
        >
          ENVIAR
        </button>
      </form>
    </div>
  );
};

export default Chat;