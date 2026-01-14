import React from 'react';
import socket from '../services/socket';

const Soundboard = () => {
  const roomId = "mesa-do-victor";

const toggleSuspense = () => {
  // O trackId DEVE ser 'suspense' para bater com a lógica do App.tsx
  socket.emit('triggerAudio', { roomId, trackId: 'suspense' });
};

  return (
    <div className="mt-6 px-4">
      <h3 className="text-rpgText font-mono text-[10px] uppercase mb-4 opacity-50 border-b border-rpgAccent/10 pb-1 tracking-widest text-center">
        Atmosfera Ambiental
      </h3>
      
      <div className="flex flex-col gap-3">
        <button
          onClick={toggleSuspense}
          className="group relative bg-rpgBg border border-rpgAccent/20 hover:border-rpgAccent/60 text-rpgText p-4 rounded transition-all uppercase font-bold active:scale-95 shadow-lg flex items-center justify-center gap-3 overflow-hidden"
        >
          {/* Efeito de brilho ao passar o rato */}
          <div className="absolute inset-0 bg-rpgAccent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <span className="text-lg">🎭</span>
          <span className="text-[11px] tracking-tight">Atmosfera Tensa</span>
        </button>

        <p className="text-[9px] text-rpgText/30 text-center italic leading-relaxed">
          Clique para alternar a música de suspense <br/> sincronizada com os jogadores
        </p>
      </div>
    </div>
  );
};

export default Soundboard;